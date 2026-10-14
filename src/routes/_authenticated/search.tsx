import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ScanSearch, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/page-shell";
import { PIPELINE_CONFIG } from "@/lib/pipeline-config";
import { searchChunks, type RetrievedChunk } from "@/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [
      { title: "Search Explorer — DocuMind AI" },
      { name: "description", content: "Inspect raw vector retrieval results, sources and similarity scores." },
      { property: "og:title", content: "Search Explorer — DocuMind AI" },
      { property: "og:description", content: "Inspect raw vector retrieval results, sources and similarity scores." },
    ],
  }),
  component: SearchExplorer,
});

function SearchExplorer() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RetrievedChunk[] | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    try {
      const { results: r } = await searchChunks({ data: { query: q.trim() } });
      setResults(r);
    } catch (err) {
      toast.error("Search failed", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="Search Explorer" description={`Run a query against the vector index and inspect the top ${PIPELINE_CONFIG.topK} chunks, their sources and cosine similarity — without LLM generation.`} />
      <form className="flex gap-2" onSubmit={run}>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. What is the refund policy?" />
        <Button type="submit" disabled={!q.trim() || loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Search
        </Button>
      </form>
      <div className="mt-6 space-y-3">
        {results === null ? (
          <EmptyState icon={ScanSearch} title="No results yet" body="Retrieved chunks will be listed with filename, page, chunk index and similarity score." />
        ) : results.length === 0 ? (
          <EmptyState icon={ScanSearch} title="No matching passages" body={`Nothing scored above the ${PIPELINE_CONFIG.relevanceThreshold} similarity threshold. Index more documents or rephrase the query.`} />
        ) : (
          results.map((r) => (
            <article key={r.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{r.filename}</span>
                {r.pageNumber != null && <Badge variant="secondary">page {r.pageNumber}</Badge>}
                <Badge variant="outline">chunk {r.chunkIndex}</Badge>
                <span className="ml-auto font-mono text-xs text-muted-foreground">similarity {r.similarity.toFixed(3)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{r.content}</p>
            </article>
          ))
        )}
      </div>
    </>
  );
}
