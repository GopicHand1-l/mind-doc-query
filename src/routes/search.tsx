import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ScanSearch, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/page-shell";
import { PIPELINE_CONFIG } from "@/lib/pipeline-config";

export const Route = createFileRoute("/search")({
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
  return (
    <>
      <PageHeader title="Search Explorer" description={`Run a query against the vector index and inspect the top ${PIPELINE_CONFIG.topK} chunks, their sources and cosine similarity — without LLM generation.`} />
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          toast.info("Vector search is not connected yet", { description: "Arrives in phase 6. No results were fabricated." });
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. What is the refund policy?" />
        <Button type="submit" disabled={!q.trim()}><Search className="size-4" /> Search</Button>
      </form>
      <div className="mt-6">
        <EmptyState icon={ScanSearch} title="No results" body="Retrieved chunks will be listed with filename, page or section, chunk index and similarity score." />
      </div>
    </>
  );
}
