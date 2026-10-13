import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { UploadCloud, FileText, Trash2, RotateCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createDocument, processDocument, deleteDocument } from "@/lib/documents.functions";
import { validateUpload } from "@/lib/ingest/chunking";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, EmptyState } from "@/components/page-shell";
import { PIPELINE_CONFIG } from "@/lib/pipeline-config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Documents — DocuMind AI" },
      { name: "description", content: "Upload PDF, TXT and DOCX files and track their indexing status." },
      { property: "og:title", content: "Documents — DocuMind AI" },
      { property: "og:description", content: "Upload PDF, TXT and DOCX files and track their indexing status." },
    ],
  }),
  component: Documents,
});

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const fmtSize = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function Documents() {
  const qc = useQueryClient();
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState<Record<string, string>>({});
  const create = useServerFn(createDocument);
  const process = useServerFn(processDocument);
  const remove = useServerFn(deleteDocument);

  const docs = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, filename, file_type, file_size, processing_status, processing_error, total_chunks, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: (q) => (q.state.data?.some((d) => d.processing_status === "processing") ? 3000 : false),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["documents"] });

  const runIngest = async (id: string, name: string) => {
    setBusy((b) => ({ ...b, [id]: "Indexing…" }));
    try {
      const r = await process({ data: { id } });
      if (r.status === "indexed") toast.success(`${name} indexed (${r.chunks} chunks)`);
      else toast.error(`${name}: ${r.error}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Indexing failed");
    } finally {
      setBusy(({ [id]: _, ...rest }) => rest);
      refresh();
    }
  };

  const upload = async (file: File) => {
    const v = validateUpload(file.name, file.size);
    if (!v.ok) { toast.error(`${file.name}: ${v.error}`); return; }
    let id: string | null = null;
    try {
      const doc = await create({ data: { filename: file.name, size: file.size } });
      id = doc.id;
      setBusy((b) => ({ ...b, [doc.id]: "Uploading…" }));
      refresh();
      const { error } = await supabase.storage.from("documents").upload(doc.storagePath, file, { contentType: MIME[v.type] ?? "application/octet-stream", upsert: false });
      if (error) throw new Error(`Upload failed: ${error.message}`);
      await runIngest(doc.id, file.name);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
      if (id) await remove({ data: { id } }).catch(() => {});
      if (id) setBusy(({ [id!]: _, ...rest }) => rest);
      refresh();
    }
  };

  const onFiles = (files: FileList | null) => files && Array.from(files).forEach(upload);

  return (
    <>
      <PageHeader title="Documents" description="Upload files to your private knowledge base. Each file is extracted, chunked and embedded on the server." />
      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-card px-6 py-12 text-center transition-colors",
          drag ? "border-primary bg-accent" : "hover:border-primary/50",
        )}
      >
        <input type="file" className="sr-only" multiple accept={PIPELINE_CONFIG.supportedFormats.join(",")} onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
        <UploadCloud className="mb-3 size-8 text-primary" />
        <p className="text-sm font-medium text-foreground">Drop files here or click to browse</p>
        <p className="mt-1 text-xs text-muted-foreground">Max {PIPELINE_CONFIG.maxFileSizeMb} MB per file · text-based PDFs only (no OCR)</p>
        <div className="mt-3 flex gap-1.5">
          {PIPELINE_CONFIG.supportedFormats.map((f) => <Badge key={f} variant="secondary" className="font-mono">{f}</Badge>)}
        </div>
      </label>

      <Card className="mt-6">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead><TableHead>Size</TableHead><TableHead>Uploaded</TableHead>
                <TableHead>Status</TableHead><TableHead>Chunks</TableHead><TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.isError && (
                <TableRow><TableCell colSpan={6} className="text-sm text-destructive">Could not load documents: {(docs.error as Error).message}</TableCell></TableRow>
              )}
              {docs.data?.length === 0 && (
                <TableRow><TableCell colSpan={6} className="p-4"><EmptyState icon={FileText} title="No documents yet" body="Uploaded files appear here with processing status, errors and retry options." /></TableCell></TableRow>
              )}
              {docs.data?.map((d) => {
                const local = busy[d.id];
                const status = local ?? d.processing_status;
                return (
                  <TableRow key={d.id}>
                    <TableCell className="max-w-64">
                      <div className="truncate font-medium">{d.filename}</div>
                      {d.processing_status === "failed" && !local && <div className="mt-0.5 text-xs text-destructive">{d.processing_error}</div>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{fmtSize(d.file_size)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={d.processing_status === "failed" && !local ? "destructive" : d.processing_status === "indexed" ? "default" : "secondary"} className="gap-1">
                        {(local || d.processing_status === "processing") && <Loader2 className="size-3 animate-spin" />}
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{d.processing_status === "indexed" ? d.total_chunks : "—"}</TableCell>
                    <TableCell className="text-right">
                      {d.processing_status === "failed" && !local && (
                        <Button size="icon" variant="ghost" aria-label="Retry" onClick={() => runIngest(d.id, d.filename)}><RotateCw className="size-4" /></Button>
                      )}
                      <Button
                        size="icon" variant="ghost" aria-label="Delete" disabled={!!local}
                        onClick={async () => {
                          if (!confirm(`Delete ${d.filename} and all its indexed chunks?`)) return;
                          try { await remove({ data: { id: d.id } }); toast.success("Deleted"); } catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
                          refresh();
                        }}
                      ><Trash2 className="size-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
