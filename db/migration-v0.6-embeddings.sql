-- Phase 5: add pgvector embeddings to datasets + normativas
-- Run once in Supabase SQL Editor (requires pgvector extension)

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE datasets   ADD COLUMN IF NOT EXISTS embedding vector(768);
ALTER TABLE normativas ADD COLUMN IF NOT EXISTS embedding vector(768);

CREATE INDEX IF NOT EXISTS datasets_embedding_idx
  ON datasets USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

CREATE INDEX IF NOT EXISTS normativas_embedding_idx
  ON normativas USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
