import { unzipSync, strFromU8 } from "fflate";
import type { FileType, Segment } from "./chunking";

function decodeXml(s: string) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

export function extractDocx(bytes: Uint8Array): Segment[] {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, { filter: (f) => f.name === "word/document.xml" });
  } catch {
    throw new Error("File is not a valid DOCX archive.");
  }
  const xml = files["word/document.xml"];
  if (!xml) throw new Error("DOCX is missing word/document.xml.");
  const body = strFromU8(xml);
  const paragraphs = body.split(/<\/w:p>/);
  const out: Segment[] = [];
  let n = 0;
  for (const p of paragraphs) {
    const withBreaks = p.replace(/<w:(tab|br)\b[^>]*\/>/g, " ");
    const texts = [...withBreaks.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((m) => decodeXml(m[1] ?? ""));
    const text = texts.join("").trim();
    if (text) out.push({ text, page: null, paragraph: ++n });
  }
  return out;
}

export function extractTxt(bytes: Uint8Array): Segment[] {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  return text
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t, i) => ({ text: t, page: null, paragraph: i + 1 }));
}

export async function extractPdf(bytes: Uint8Array): Promise<Segment[]> {
  const { getDocumentProxy, extractText } = await import("unpdf");
  let pages: string[];
  try {
    const pdf = await getDocumentProxy(bytes);
    const res = await extractText(pdf, { mergePages: false });
    pages = res.text as string[];
  } catch {
    throw new Error("Could not parse PDF (file may be corrupted or encrypted).");
  }
  return pages
    .map((t, i) => ({ text: t.trim(), page: i + 1, paragraph: i + 1 }))
    .filter((s) => s.text.length > 0);
}

export async function extractSegments(type: FileType, bytes: Uint8Array): Promise<Segment[]> {
  const segs = type === "pdf" ? await extractPdf(bytes) : type === "docx" ? extractDocx(bytes) : extractTxt(bytes);
  const chars = segs.reduce((n, s) => n + s.text.length, 0);
  if (chars < 20) {
    throw new Error(
      type === "pdf"
        ? "No extractable text found. Scanned/image-only PDFs are not supported (no OCR)."
        : "Document contains no readable text.",
    );
  }
  return segs;
}
