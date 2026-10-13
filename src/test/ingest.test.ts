import { describe, expect, it } from "vitest";
import { chunkSegments, validateUpload } from "@/lib/ingest/chunking";

describe("upload validation", () => {
  it("rejects unsupported extensions", () => expect(validateUpload("a.exe", 10).ok).toBe(false));
  it("rejects empty files", () => expect(validateUpload("a.pdf", 0).ok).toBe(false));
  it("rejects files over 20 MB", () => expect(validateUpload("a.pdf", 20 * 1024 * 1024 + 1).ok).toBe(false));
  it("accepts docx", () => expect(validateUpload("Report.DOCX", 100)).toEqual({ ok: true, type: "docx" }));
});

describe("chunking", () => {
  const words = Array.from({ length: 1000 }, (_, i) => `w${i}`).join(" ");
  it("overlaps consecutive chunks", () => {
    const c = chunkSegments([{ text: words, page: null, paragraph: 1 }], 130, 26); // 100 words, 20 overlap
    expect(c[0]!.content.split(" ").slice(-20)).toEqual(c[1]!.content.split(" ").slice(0, 20));
  });
  it("never crosses PDF pages", () => {
    const c = chunkSegments([{ text: "a b c", page: 1, paragraph: 1 }, { text: "d e f", page: 2, paragraph: 2 }], 800, 120);
    expect(c.map((x) => x.page)).toEqual([1, 2]);
  });
});
