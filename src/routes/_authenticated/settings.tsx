import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, Unavailable } from "@/components/page-shell";
import { PIPELINE_CONFIG } from "@/lib/pipeline-config";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — DocuMind AI" },
      { name: "description", content: "Model, chunking, retrieval and security configuration for DocuMind AI." },
      { property: "og:title", content: "Settings — DocuMind AI" },
      { property: "og:description", content: "Model, chunking, retrieval and security configuration for DocuMind AI." },
    ],
  }),
  component: SettingsPage,
});

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono text-xs text-foreground">{v}</span>
    </div>
  );
}

function SettingsPage() {
  const c = PIPELINE_CONFIG;
  return (
    <>
      <PageHeader title="Settings" description="Planned pipeline configuration. Values become editable once the backend is connected." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Models</CardTitle></CardHeader>
          <CardContent>
            <Row k="Embedding model" v={c.embeddingModel} />
            <Row k="LLM" v={c.llmModel} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Chunking & retrieval</CardTitle></CardHeader>
          <CardContent>
            <Row k="Chunk size" v={`~${c.chunkSizeTokens} tokens`} />
            <Row k="Overlap" v={`~${c.chunkOverlapTokens} tokens`} />
            <Row k="Top-k" v={c.topK} />
            <Row k="Relevance threshold" v={c.relevanceThreshold} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Secure configuration</CardTitle></CardHeader>
          <CardContent>
            <Row k="AI credentials (server-side)" v={<Unavailable label="not configured" />} />
            <Row k="Database & pgvector" v={<Unavailable label="not connected" />} />
            <Row k="Private storage bucket" v={<Unavailable label="not connected" />} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Preferences</CardTitle></CardHeader>
          <CardContent>
            <Row k="Theme" v="Use the toggle in the top bar" />
            <Row k="Max upload size" v={`${c.maxFileSizeMb} MB`} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
