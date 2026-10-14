// Static description of the planned RAG pipeline. These are configuration
// values, not measured results — never present them as metrics.
export const PIPELINE_CONFIG = {
  embeddingModel: "google/gemini-embedding-2",
  llmModel: "openai/gpt-6-astra",
  chunkSizeTokens: 800,
  chunkOverlapTokens: 120,
  topK: 6,
  relevanceThreshold: 0.35,
  maxFileSizeMb: 20,
  supportedFormats: [".pdf", ".txt", ".docx"] as const,
};

export type PhaseStatus = "done" | "next" | "planned";

export const PHASES: { n: number; title: string; status: PhaseStatus }[] = [
  { n: 1, title: "Frontend structure & design", status: "done" },
  { n: 2, title: "Lovable Cloud & authentication", status: "done" },
  { n: 3, title: "Schema, migrations & RLS", status: "done" },
  { n: 4, title: "Upload & private storage", status: "done" },
  { n: 5, title: "Extraction, chunking & embeddings", status: "done" },
  { n: 6, title: "pgvector similarity search", status: "done" },
  { n: 7, title: "Grounded generation & citations", status: "done" },
  { n: 8, title: "Chat history & document management", status: "next" },
  { n: 9, title: "Testing & evaluation", status: "planned" },
  { n: 10, title: "Deployment & documentation", status: "planned" },
];
