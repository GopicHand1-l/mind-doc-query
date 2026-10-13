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
  { n: 2, title: "Lovable Cloud & authentication", status: "next" },
  { n: 3, title: "Schema, migrations & RLS", status: "planned" },
  { n: 4, title: "Upload & private storage", status: "planned" },
  { n: 5, title: "Extraction, chunking & embeddings", status: "planned" },
  { n: 6, title: "pgvector similarity search", status: "planned" },
  { n: 7, title: "Grounded generation & citations", status: "planned" },
  { n: 8, title: "Chat history & document management", status: "planned" },
  { n: 9, title: "Testing & evaluation", status: "planned" },
  { n: 10, title: "Deployment & documentation", status: "planned" },
];
