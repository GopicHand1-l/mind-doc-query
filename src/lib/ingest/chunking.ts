// Pure, dependency-free text chunking. Token counts are approximated as
// words * 1.3 (no tokenizer runs in the worker); documented in AGENTS.md.

export const TOKENS_PER_WORD = 1.3;

export type Segment = { text: string; page: number | null; paragraph: number };

export type Chunk = {
  index: number;
  content: string;
  page: number | null;
  metadata: { paragraph_start: number; paragraph_end: number; approx_tokens: number };
};

export function cleanText(s: string): string {
  return s
    .replace(/\u0000/g, "")
    .replace(/[\t\f\v\r]+/g, " ")
    .replace(/[ \u00a0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Splits segments into overlapping word windows. Chunks never cross page
 * boundaries so every PDF chunk has exactly one true page number.
 */
export function chunkSegments(
  segments: Segment[],
  chunkTokens: number,
  overlapTokens: number,
): Chunk[] {
  const size = Math.max(20, Math.round(chunkTokens / TOKENS_PER_WORD));
  const overlap = Math.min(size - 1, Math.max(0, Math.round(overlapTokens / TOKENS_PER_WORD)));
  const step = size - overlap;

  // Group words by page, remembering the paragraph each word came from.
  const groups = new Map<string, { page: number | null; words: { w: string; p: number }[] }>();
  for (const seg of segments) {
    const key = String(seg.page);
    if (!groups.has(key)) groups.set(key, { page: seg.page, words: [] });
    const g = groups.get(key)!;
    for (const w of cleanText(seg.text).split(/\s+/)) if (w) g.words.push({ w, p: seg.paragraph });
  }

  const chunks: Chunk[] = [];
  for (const { page, words } of groups.values()) {
    for (let start = 0; start < words.length; start += step) {
      const slice = words.slice(start, start + size);
      if (slice.length === 0) break;
      chunks.push({
        index: chunks.length,
        content: slice.map((x) => x.w).join(" "),
        page,
        metadata: {
          paragraph_start: slice[0].p,
          paragraph_end: slice[slice.length - 1].p,
          approx_tokens: Math.round(slice.length * TOKENS_PER_WORD),
        },
      });
      if (start + size >= words.length) break;
    }
  }
  return chunks;
}

export const ALLOWED_TYPES = ["pdf", "txt", "docx"] as const;
export type FileType = (typeof ALLOWED_TYPES)[number];
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export function validateUpload(filename: string, size: number): { ok: true; type: FileType } | { ok: false; error: string } {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (!(ALLOWED_TYPES as readonly string[]).includes(ext) || !filename.includes("."))
    return { ok: false, error: "Unsupported file type. Use PDF, TXT or DOCX." };
  if (size <= 0) return { ok: false, error: "File is empty." };
  if (size > MAX_FILE_BYTES) return { ok: false, error: "File exceeds the 20 MB limit." };
  if (filename.length > 255) return { ok: false, error: "Filename is too long." };
  return { ok: true, type: ext as FileType };
}
