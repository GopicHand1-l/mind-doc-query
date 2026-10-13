import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, SendHorizonal, Quote, MessagesSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/page-shell";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "AI Chat — DocuMind AI" },
      { name: "description", content: "Ask questions about your documents and inspect every cited source." },
      { property: "og:title", content: "AI Chat — DocuMind AI" },
      { property: "og:description", content: "Ask questions about your documents and inspect every cited source." },
    ],
  }),
  component: Chat,
});

function Chat() {
  const [q, setQ] = useState("");
  const send = () => {
    if (!q.trim()) return;
    toast.info("Answering is not connected yet", {
      description: "Grounded answers need indexed documents and retrieval (phases 5–7). No answer was generated.",
    });
  };

  return (
    <div className="grid h-[calc(100vh-8.5rem)] gap-4 lg:grid-cols-[220px_1fr_300px]">
      <aside className="hidden flex-col rounded-lg border bg-card lg:flex">
        <div className="border-b p-3">
          <Button variant="outline" size="sm" className="w-full" disabled>
            <Plus className="size-4" /> New conversation
          </Button>
        </div>
        <p className="p-4 text-xs text-muted-foreground">Saved conversations appear here after sign-in.</p>
      </aside>

      <section className="flex min-h-0 flex-col rounded-lg border bg-card">
        <div className="flex items-center gap-2 border-b p-3">
          <Select disabled>
            <SelectTrigger className="h-8 w-52 text-xs"><SelectValue placeholder="All documents" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All documents</SelectItem></SelectContent>
          </Select>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" disabled><Trash2 className="size-4" /> Clear</Button>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-auto p-6">
          <EmptyState icon={MessagesSquare} title="Ask about your documents" body="Answers are generated only from retrieved passages, with verified citations. If your documents don't contain the answer, DocuMind will say so." />
        </div>
        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <Textarea
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask a question about your documents…"
              className="max-h-40 min-h-11 resize-none"
              rows={1}
            />
            <Button size="icon" onClick={send} aria-label="Send question" disabled={!q.trim()}>
              <SendHorizonal className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      <aside className="hidden flex-col rounded-lg border bg-card lg:flex">
        <div className="flex items-center gap-2 border-b p-3 text-sm font-medium">
          <Quote className="size-4 text-primary" /> Citation inspector
        </div>
        <p className="p-4 text-xs text-muted-foreground">
          Select a citation in an answer to see its source file, page or section, excerpt and retrieval score.
        </p>
      </aside>
    </div>
  );
}
