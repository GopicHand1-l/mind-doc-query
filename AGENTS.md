<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Never show simulated metrics, answers or retrieval results; render explicit "not available" states until real backend data exists. Why: the app is an honest RAG portfolio demo.
- Shared app shell (sidebar + header) lives in src/routes/__root.tsx; pipeline constants in src/lib/pipeline-config.ts. Why: single source for layout and config.
- Ingestion runs in createServerFn (src/lib/documents.functions.ts); chunk rows are written only with the admin client after an RLS-scoped ownership claim. Why: users must never write vectors directly.
- Token counts are approximated as words*1.3 and PDF chunks never cross pages. Why: no tokenizer in the worker; page citations stay exact.
- Embeddings are 3072-d vectors indexed via HNSW on a halfvec cast. Why: pgvector HNSW caps plain vector at 2000 dims.
