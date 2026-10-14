import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PIPELINE_CONFIG } from "@/lib/pipeline-config";
import type { Database } from "@/integrations/supabase/types";

export interface RetrievedChunk {
  id: string;
  documentId: string;
  filename: string;
  chunkIndex: number;
  pageNumber: number | null;
  content: string;
  similarity: number;
}

async function retrieveChunks(
  supabase: SupabaseClient<Database>,
  query: string,
  documentId?: string,
): Promise<RetrievedChunk[]> {
  const { embedTexts, toPgVector } = await import("@/lib/ingest/embeddings.server");
  const [vec] = await embedTexts([query]);
  if (!vec) return [];
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: toPgVector(vec),
    match_count: PIPELINE_CONFIG.topK,
    min_similarity: PIPELINE_CONFIG.relevanceThreshold,
    ...(documentId ? { document_ids: [documentId] } : {}),
  });
  if (error) throw new Error(`Search failed: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id,
    documentId: r.document_id,
    filename: r.filename,
    chunkIndex: r.chunk_index,
    pageNumber: r.page_number,
    content: r.content,
    similarity: r.similarity,
  }));
}

/** Semantic search over the caller's indexed chunks (Search Explorer + chat retrieval). */
export const searchChunks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ query: z.string().min(1).max(2000), documentId: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const results = await retrieveChunks(context.supabase, data.query, data.documentId);
    return { results };
  });

export interface Citation {
  n: number;
  chunkId: string;
  filename: string;
  pageNumber: number | null;
  excerpt: string;
  similarity: number;
}

export interface AnswerResult {
  status: "answered" | "no_sources" | "not_in_documents";
  answer: string;
  citations: Citation[];
}

const SYSTEM_PROMPT = `You are DocuMind, a document assistant. Answer ONLY from the provided sources.
Rules:
- Cite every claim with [n] markers matching the source numbers.
- If the sources do not contain the answer, reply with exactly: NOT_IN_DOCUMENTS
- Never use outside knowledge. Be concise and factual.`;

/** Calls the gateway chat model with streaming and returns the assembled text. */
async function generateAnswer(question: string, chunks: RetrievedChunk[]): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI credentials are not configured on the server.");
  const sources = chunks
    .map((c, i) => `[${i + 1}] ${c.filename}${c.pageNumber != null ? ` (page ${c.pageNumber})` : ""}:\n${c.content}`)
    .join("\n\n");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: PIPELINE_CONFIG.llmModel,
      stream: true,
      reasoning_effort: "low",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Sources:\n${sources}\n\nQuestion: ${question}` },
      ],
    }),
  });
  if (!res.ok || !res.body) {
    let msg = `Answer generation failed (${res.status}).`;
    try {
      const body = (await res.json()) as { error?: { message?: string }; message?: string };
      msg = body.error?.message ?? body.message ?? msg;
    } catch { /* ignore */ }
    if (res.status === 402) msg = "AI credits exhausted — add credits to continue.";
    throw new Error(msg);
  }

  // Consume the SSE stream and assemble the final text.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) text += delta;
      } catch { /* partial chunk */ }
    }
  }
  return text.trim();
}

/** Grounded Q&A: retrieve relevant chunks, generate a cited answer, verify citations. */
export const askQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ question: z.string().min(1).max(4000), documentId: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<AnswerResult> => {
    const chunks = await retrieveChunks(context.supabase, data.question, data.documentId);
    if (chunks.length === 0) {
      return {
        status: "no_sources",
        answer:
          "No relevant passages were found in your indexed documents. Upload and index a document that covers this topic, then ask again.",
        citations: [],
      };
    }

    const raw = await generateAnswer(data.question, chunks);
    if (!raw || raw.includes("NOT_IN_DOCUMENTS")) {
      return {
        status: "not_in_documents",
        answer: "Your documents don't appear to contain the answer to that question.",
        citations: [],
      };
    }

    // Verify citations: keep only [n] markers that reference a real retrieved chunk.
    const used = new Set<number>();
    for (const m of raw.matchAll(/\[(\d+)\]/g)) {
      const n = Number(m[1]);
      if (n >= 1 && n <= chunks.length) used.add(n);
    }
    const citations: Citation[] = [...used].sort((a, b) => a - b).map((n) => {
      const c = chunks[n - 1]!;
      return {
        n,
        chunkId: c.id,
        filename: c.filename,
        pageNumber: c.pageNumber,
        excerpt: c.content.slice(0, 600),
        similarity: c.similarity,
      };
    });
    return { status: "answered", answer: raw, citations };
  });
