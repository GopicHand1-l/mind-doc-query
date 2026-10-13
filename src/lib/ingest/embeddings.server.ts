import { PIPELINE_CONFIG } from "@/lib/pipeline-config";

export const EMBEDDING_DIMS = 3072;
const BATCH = 16;

export class EmbeddingError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function embedBatch(inputs: string[], apiKey: string): Promise<number[][]> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: PIPELINE_CONFIG.embeddingModel, input: inputs }),
    });
    if (res.ok) {
      const json = (await res.json()) as { data: { index: number; embedding: number[] }[] };
      const out: number[][] = new Array(inputs.length);
      for (const d of json.data) out[d.index] = d.embedding;
      if (out.some((v) => !v || v.length !== EMBEDDING_DIMS))
        throw new EmbeddingError("Embedding response was incomplete or had unexpected dimensions.", 502);
      return out;
    }
    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < 2) {
      const after = Number(res.headers.get("retry-after")) || 2 ** attempt * 1.5;
      await new Promise((r) => setTimeout(r, after * 1000 + Math.random() * 300));
      continue;
    }
    let msg = `Embedding request failed (${res.status}).`;
    try {
      const body = (await res.json()) as { error?: { message?: string }; message?: string };
      msg = body.error?.message ?? body.message ?? msg;
    } catch { /* ignore */ }
    if (res.status === 402) msg = "AI credits exhausted — add credits to continue indexing.";
    throw new EmbeddingError(msg, res.status);
  }
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new EmbeddingError("AI credentials are not configured on the server.", 401);
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) out.push(...(await embedBatch(texts.slice(i, i + BATCH), apiKey)));
  return out;
}

export const toPgVector = (v: number[]) => `[${v.join(",")}]`;
