import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { UploadCloud, FileText } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

function Documents() {
  const [drag, setDrag] = useState(false);
  const onFiles = () =>
    toast.info("Uploads are not connected yet", {
      description: "Private storage and ingestion arrive in phases 2–5. No file was sent.",
    });

  return (
    <>
      <PageHeader title="Documents" description="Upload files to your private knowledge base. Each file is extracted, chunked and embedded server-side." />
      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(); }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-card px-6 py-12 text-center transition-colors",
          drag ? "border-primary bg-accent" : "hover:border-primary/50",
        )}
      >
        <input type="file" className="sr-only" multiple accept={PIPELINE_CONFIG.supportedFormats.join(",")} onChange={onFiles} />
        <UploadCloud className="mb-3 size-8 text-primary" />
        <p className="text-sm font-medium text-foreground">Drop files here or click to browse</p>
        <p className="mt-1 text-xs text-muted-foreground">Max {PIPELINE_CONFIG.maxFileSizeMb} MB per file · text-based PDFs only (no OCR)</p>
        <div className="mt-3 flex gap-1.5">
          {PIPELINE_CONFIG.supportedFormats.map((f) => (
            <Badge key={f} variant="secondary" className="font-mono">{f}</Badge>
          ))}
        </div>
      </label>

      <Card className="mt-6">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Chunks</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="p-4">
                  <EmptyState icon={FileText} title="No documents yet" body="Uploaded files will appear here with processing status, errors and retry options." />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
