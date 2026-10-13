import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, CheckCircle2, Layers, Activity, MessagesSquare, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState, Unavailable } from "@/components/page-shell";
import { PHASES } from "@/lib/pipeline-config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard — DocuMind AI" },
      { name: "description", content: "Overview of your indexed documents, activity and RAG system status." },
      { property: "og:title", content: "Dashboard — DocuMind AI" },
      { property: "og:description", content: "Overview of your indexed documents, activity and RAG system status." },
    ],
  }),
  component: Dashboard,
});

const STATS = [
  { label: "Uploaded documents", icon: FileText },
  { label: "Indexed documents", icon: CheckCircle2 },
  { label: "Indexed chunks", icon: Layers },
];

const SERVICES = ["Authentication", "Private storage", "Vector database (pgvector)", "Embedding model", "LLM generation"];

function Dashboard() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your document knowledge base at a glance. Numbers appear once real documents are indexed — nothing here is simulated."
        actions={
          <Button asChild>
            <Link to="/chat">
              <MessagesSquare className="size-4" /> Open chat
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {STATS.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-start justify-between p-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className="mt-2 font-display text-3xl font-semibold text-muted-foreground/50">—</p>
              </div>
              <s.icon className="size-5 text-primary" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4 text-primary" /> Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState icon={Upload} title="No activity yet" body="Uploads, indexing jobs and questions will be listed here.">
              <Button variant="outline" size="sm" asChild>
                <Link to="/documents">Go to documents</Link>
              </Button>
            </EmptyState>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">System status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {SERVICES.map((s) => (
              <div key={s} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{s}</span>
                <Unavailable label="not connected" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Build progress</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-2 sm:grid-cols-2">
            {PHASES.map((p) => (
              <li key={p.n} className="flex items-center gap-3 text-sm">
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded font-mono text-[11px]",
                    p.status === "done" && "bg-primary text-primary-foreground",
                    p.status === "next" && "border border-primary text-primary",
                    p.status === "planned" && "bg-muted text-muted-foreground",
                  )}
                >
                  {p.n}
                </span>
                <span className={p.status === "planned" ? "text-muted-foreground" : "text-foreground"}>{p.title}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </>
  );
}
