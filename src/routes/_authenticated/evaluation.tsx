import { createFileRoute } from "@tanstack/react-router";
import { FlaskConical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState, Unavailable } from "@/components/page-shell";

export const Route = createFileRoute("/_authenticated/evaluation")({
  head: () => ({
    meta: [
      { title: "Evaluation — DocuMind AI" },
      { name: "description", content: "Measured retrieval and answer-quality metrics from real evaluation runs." },
      { property: "og:title", content: "Evaluation — DocuMind AI" },
      { property: "og:description", content: "Measured retrieval and answer-quality metrics from real evaluation runs." },
    ],
  }),
  component: Evaluation,
});

const METRICS = [
  { name: "Test cases", kind: "count" },
  { name: "Recall@k", kind: "automatic" },
  { name: "Mean Reciprocal Rank", kind: "automatic" },
  { name: "Citation correctness", kind: "automatic" },
  { name: "Answer faithfulness", kind: "model-judged" },
  { name: "p50 / p95 latency", kind: "automatic" },
];

function Evaluation() {
  return (
    <>
      <PageHeader
        title="Evaluation"
        description="Metrics come only from stored evaluation runs against indexed test documents. Automatic metrics and model-based judgments are labeled separately."
        actions={<Button disabled>Run evaluation</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {METRICS.map((m) => (
          <Card key={m.name}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{m.name}</p>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{m.kind}</span>
              </div>
              <div className="mt-3"><Unavailable label="no run yet" /></div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6">
        <EmptyState icon={FlaskConical} title="No evaluation runs" body="Runs, their configuration and per-question results will be listed here (phase 9)." />
      </div>
    </>
  );
}
