import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validateUpload, chunkSegments, type FileType } from "@/lib/ingest/chunking";
import { PIPELINE_CONFIG } from "@/lib/pipeline-config";

/** Validates metadata and creates a pending document row owned by the caller. */
export const createDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ filename: z.string().min(1).max(255), size: z.number().int() }).parse(d))
  .handler(async ({ data, context }) => {
    const v = validateUpload(data.filename, data.size);
    if (!v.ok) throw new Error(v.error);
    const id = crypto.randomUUID();
    const storagePath = `${context.userId}/${id}.${v.type}`;
    const { error } = await context.supabase.from("documents").insert({
      id,
      user_id: context.userId,
      filename: data.filename,
      file_type: v.type,
      file_size: data.size,
      storage_path: storagePath,
    });
    if (error) throw new Error(`Could not create document: ${error.message}`);
    return { id, storagePath };
  });

async function sha256Hex(bytes: Uint8Array) {
  const h = await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Extracts, chunks, embeds and stores a document. Safe to call again for retries. */
export const processDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Atomic claim: only uploaded/failed docs owned by caller (RLS) can move to processing.
    const { data: doc, error: claimErr } = await supabase
      .from("documents")
      .update({ processing_status: "processing", processing_error: null })
      .eq("id", data.id)
      .in("processing_status", ["uploaded", "failed"])
      .select("id, file_type, storage_path, user_id")
      .maybeSingle();
    if (claimErr) throw new Error(claimErr.message);
    if (!doc) throw new Error("Document not found, or it is already processing/indexed.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const fail = async (message: string) => {
      await supabaseAdmin.from("document_chunks").delete().eq("document_id", doc.id);
      await supabaseAdmin
        .from("documents")
        .update({ processing_status: "failed", processing_error: message.slice(0, 500), total_chunks: 0 })
        .eq("id", doc.id)
        .eq("user_id", userId);
      return { status: "failed" as const, error: message };
    };

    try {
      const { data: blob, error: dlErr } = await supabase.storage.from("documents").download(doc.storage_path);
      if (dlErr || !blob) return await fail("Uploaded file could not be read from storage.");
      const bytes = new Uint8Array(await blob.arrayBuffer());

      const hash = await sha256Hex(bytes);
      const { data: dup } = await supabase
        .from("documents")
        .select("filename")
        .eq("content_hash", hash)
        .neq("id", doc.id)
        .maybeSingle();
      if (dup) return await fail(`Duplicate of an existing document (“${dup.filename}”).`);

      const { extractSegments } = await import("@/lib/ingest/extract.server");
      const segments = await extractSegments(doc.file_type as FileType, bytes);
      const chunks = chunkSegments(segments, PIPELINE_CONFIG.chunkSizeTokens, PIPELINE_CONFIG.chunkOverlapTokens);
      if (chunks.length === 0) return await fail("No text chunks could be produced.");

      const { embedTexts, toPgVector } = await import("@/lib/ingest/embeddings.server");
      const vectors = await embedTexts(chunks.map((c) => c.content));

      await supabaseAdmin.from("document_chunks").delete().eq("document_id", doc.id);
      for (let i = 0; i < chunks.length; i += 20) {
        const rows = chunks.slice(i, i + 20).map((c, j) => ({
          document_id: doc.id,
          user_id: userId,
          chunk_index: c.index,
          content: c.content,
          page_number: c.page,
          metadata: c.metadata,
          embedding: toPgVector(vectors[i + j]!),
        }));
        const { error } = await supabaseAdmin.from("document_chunks").insert(rows);
        if (error) return await fail(`Failed to store chunks: ${error.message}`);
      }

      const { error: doneErr } = await supabaseAdmin
        .from("documents")
        .update({ processing_status: "indexed", total_chunks: chunks.length, content_hash: hash })
        .eq("id", doc.id)
        .eq("user_id", userId);
      if (doneErr) return await fail(`Failed to finalize: ${doneErr.message}`);
      return { status: "indexed" as const, chunks: chunks.length };
    } catch (e) {
      console.error("ingest failed", doc.id, e instanceof Error ? e.message : e);
      return await fail(e instanceof Error ? e.message : "Unexpected ingestion error.");
    }
  });

/** Deletes a caller-owned document, its file and (via cascade) its chunks. */
export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: doc } = await supabase.from("documents").select("id, storage_path").eq("id", data.id).maybeSingle();
    if (!doc) throw new Error("Document not found.");
    await supabase.storage.from("documents").remove([doc.storage_path]);
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
