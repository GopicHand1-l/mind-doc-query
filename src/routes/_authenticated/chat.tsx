import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Plus, SendHorizonal, Quote, MessagesSquare, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/page-shell";
import { askQuestion, type AnswerResult, type Citation } from "@/lib/chat.functions";

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

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  result?: AnswerResult;
}

/** Renders answer text with [n] citation markers as clickable buttons. */
function AnswerText({ text, onCite }: { text: string; onCite: (n: number) => void }) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {parts.map((p, i) => {
        const m = /^\[(\d+)\]$/.exec(p);
        if (!m) return <span key={i}>{p}</span>;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onCite(Number(m[1]))}
            className="mx-0.5 inline-flex rounded bg-primary/15 px-1 font-mono text-xs font-medium text-primary hover:bg-primary/25"
          >
            {p}
          </button>
        );
      })}
    </p>
  );
}

function Chat() {
  const [q, setQ] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Citation | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    const question = q.trim();
    if (!question || loading) return;
    setQ("");
    setLoading(true);
    setMessages((m) => [...m, { role: "user", text: question }]);
    try {
      const result = await askQuestion({ data: { question } });
      setMessages((m) => [...m, { role: "assistant", text: result.answer, result }]);
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }));
    } catch (err) {
      toast.error("Could not generate an answer", { description: err instanceof Error ? err.message : undefined });
      setMessages((m) => m.slice(0, -1));
      setQ(question);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid h-[calc(100vh-8.5rem)] gap-4 lg:grid-cols-[220px_1fr_300px]">
      <aside className="hidden flex-col rounded-lg border bg-card lg:flex">
        <div className="border-b p-3">
          <Button variant="outline" size="sm" className="w-full" disabled>
            <Plus className="size-4" /> New conversation
          </Button>
        </div>
        <p className="p-4 text-xs text-muted-foreground">Saved conversations arrive with chat history (phase 8).</p>
      </aside>

      <section className="flex min-h-0 flex-col rounded-lg border bg-card">
        <div className="flex items-center gap-2 border-b p-3">
          <Select disabled>
            <SelectTrigger className="h-8 w-52 text-xs"><SelectValue placeholder="All documents" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All documents</SelectItem></SelectContent>
          </Select>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" disabled={messages.length === 0} onClick={() => { setMessages([]); setSelected(null); }}>
            <Trash2 className="size-4" /> Clear
          </Button>
        </div>
        <div ref={listRef} className="flex-1 space-y-4 overflow-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState icon={MessagesSquare} title="Ask about your documents" body="Answers are generated only from retrieved passages, with verified citations. If your documents don't contain the answer, DocuMind will say so." />
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={m.role === "user" ? "max-w-[80%] rounded-lg bg-primary px-3 py-2 text-primary-foreground" : "max-w-[85%] rounded-lg border bg-muted/40 px-3 py-2"}>
                  {m.role === "user" ? (
                    <p className="whitespace-pre-wrap text-sm">{m.text}</p>
                  ) : (
                    <>
                      <AnswerText text={m.text} onCite={(n) => setSelected(m.result?.citations.find((c) => c.n === n) ?? null)} />
                      {m.result && m.result.citations.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1 border-t pt-2">
                          {m.result.citations.map((c) => (
                            <button key={c.n} type="button" onClick={() => setSelected(c)}>
                              <Badge variant="secondary" className="cursor-pointer">[{c.n}] {c.filename}{c.pageNumber != null ? ` · p.${c.pageNumber}` : ""}</Badge>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Searching your documents and writing an answer…
            </div>
          )}
        </div>
        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <Textarea
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
              placeholder="Ask a question about your documents…"
              className="max-h-40 min-h-11 resize-none"
              rows={1}
            />
            <Button size="icon" onClick={() => void send()} aria-label="Send question" disabled={!q.trim() || loading}>
              <SendHorizonal className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      <aside className="hidden flex-col rounded-lg border bg-card lg:flex">
        <div className="flex items-center gap-2 border-b p-3 text-sm font-medium">
          <Quote className="size-4 text-primary" /> Citation inspector
        </div>
        {selected ? (
          <div className="space-y-3 overflow-auto p-4 text-sm">
            <div>
              <p className="font-medium">[{selected.n}] {selected.filename}</p>
              <div className="mt-1 flex gap-2">
                {selected.pageNumber != null && <Badge variant="secondary">page {selected.pageNumber}</Badge>}
                <Badge variant="outline">similarity {selected.similarity.toFixed(3)}</Badge>
              </div>
            </div>
            <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">{selected.excerpt}</p>
          </div>
        ) : (
          <p className="p-4 text-xs text-muted-foreground">
            Select a citation in an answer to see its source file, page, excerpt and retrieval score.
          </p>
        )}
      </aside>
    </div>
  );
}
