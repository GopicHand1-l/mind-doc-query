CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TYPE public.processing_status AS ENUM ('uploaded','processing','indexed','failed');

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  filename text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('pdf','txt','docx')),
  file_size bigint NOT NULL CHECK (file_size > 0 AND file_size <= 20971520),
  storage_path text NOT NULL UNIQUE,
  content_hash text,
  processing_status public.processing_status NOT NULL DEFAULT 'uploaded',
  processing_error text,
  total_chunks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_hash)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own documents select" ON public.documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own documents insert" ON public.documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own documents update" ON public.documents FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own documents delete" ON public.documents FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX documents_user_created_idx ON public.documents (user_id, created_at DESC);
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding extensions.vector(3072) NOT NULL,
  page_number integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);
GRANT SELECT ON public.document_chunks TO authenticated;
GRANT ALL ON public.document_chunks TO service_role;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chunks select" ON public.document_chunks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX document_chunks_doc_idx ON public.document_chunks (document_id);
CREATE INDEX document_chunks_user_idx ON public.document_chunks (user_id);
CREATE INDEX document_chunks_embedding_hnsw ON public.document_chunks
  USING hnsw ((embedding::extensions.halfvec(3072)) extensions.halfvec_cosine_ops);

CREATE OR REPLACE FUNCTION public.check_chunk_owner() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.documents d WHERE d.id = NEW.document_id AND d.user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'chunk owner does not match document owner';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER document_chunks_owner BEFORE INSERT OR UPDATE ON public.document_chunks FOR EACH ROW EXECUTE FUNCTION public.check_chunk_owner();

CREATE OR REPLACE FUNCTION public.match_chunks(
  query_embedding extensions.vector(3072),
  match_count integer DEFAULT 6,
  min_similarity double precision DEFAULT 0,
  document_ids uuid[] DEFAULT NULL
) RETURNS TABLE (id uuid, document_id uuid, chunk_index integer, content text, page_number integer, metadata jsonb, filename text, similarity double precision)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, extensions AS $$
  SELECT c.id, c.document_id, c.chunk_index, c.content, c.page_number, c.metadata, d.filename,
         1 - ((c.embedding::halfvec(3072)) <=> (query_embedding::halfvec(3072))) AS similarity
  FROM public.document_chunks c
  JOIN public.documents d ON d.id = c.document_id
  WHERE c.user_id = auth.uid()
    AND d.processing_status = 'indexed'
    AND (document_ids IS NULL OR c.document_id = ANY(document_ids))
    AND 1 - ((c.embedding::halfvec(3072)) <=> (query_embedding::halfvec(3072))) >= min_similarity
  ORDER BY (c.embedding::halfvec(3072)) <=> (query_embedding::halfvec(3072))
  LIMIT LEAST(GREATEST(match_count, 1), 50);
$$;
REVOKE EXECUTE ON FUNCTION public.match_chunks FROM anon, public;
GRANT EXECUTE ON FUNCTION public.match_chunks TO authenticated, service_role;

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL DEFAULT 'New conversation',
  document_ids uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own conversations all" ON public.conversations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX conversations_user_idx ON public.conversations (user_id, updated_at DESC);
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messages select" ON public.messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own messages insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));
CREATE POLICY "own messages delete" ON public.messages FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX messages_conv_idx ON public.messages (conversation_id, created_at);

CREATE TABLE public.evaluation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  test_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.evaluation_runs TO authenticated;
GRANT ALL ON public.evaluation_runs TO service_role;
ALTER TABLE public.evaluation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own eval select" ON public.evaluation_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own eval delete" ON public.evaluation_runs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX evaluation_runs_user_idx ON public.evaluation_runs (user_id, created_at DESC);

CREATE POLICY "own files read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own files insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own files delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);