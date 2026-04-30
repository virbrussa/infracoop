# Semantic Search — Phase 5 Design

**Date:** 2026-04-27
**Goal:** Replace keyword-only search (MiniSearch/Fuse.js) with real semantic vector search using `paraphrase-multilingual-mpnet-base-v2` running in the browser via Transformers.js + ONNX. Embeddings for the corpus are stored in Supabase; user queries are embedded at runtime in a Web Worker.

---

## Context

Current search is 100% client-side keyword matching (BM25 via MiniSearch + fuzzy via Fuse.js). It fails when the user's question uses different vocabulary than the corpus (e.g. "mortalidad materna rural" doesn't match a dataset about "salud reproductiva indígena"). No backend exists and none will be added — all inference runs in the browser.

---

## Architecture

```
App startup
├── SearchIndexContext  — fetches datasets + normativas + embeddings from Supabase
└── EmbedderContext     — loads model in Web Worker, reports download progress

User opens Monitor de Brechas
└── Blocked until both contexts are ready → textarea + button enabled

User submits query
├── EmbedderContext.embed(query) → Float32Array(768) via Worker message
├── semanticSearch(queryVector, index) → top-5 datasets + top-5 normativas (cosine similarity)
├── calcularScore() + calcularAgendas() (unchanged)
└── insertPregunta() + render (unchanged)

IngresoForm — directo mode submit
└── if embedder ready → embed item text → UPDATE embedding in Supabase
```

---

## DB Migration (`db/migration-v0.6-embeddings.sql`)

Run once in Supabase SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE datasets   ADD COLUMN embedding vector(768);
ALTER TABLE normativas ADD COLUMN embedding vector(768);

CREATE INDEX datasets_embedding_idx
  ON datasets USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
CREATE INDEX normativas_embedding_idx
  ON normativas USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
```

Rows with `embedding IS NULL` are excluded from semantic search results.

---

## Offline Embedding Script (`scripts/embed-corpus.ts`)

Run with: `npx tsx scripts/embed-corpus.ts`
Re-runnable: only processes rows WHERE `embedding IS NULL`. Use `--force` to re-embed all.

```
1. Load env vars from .env.local (VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY — service role needed to bypass RLS for bulk UPDATEs)
2. Fetch all datasets/normativas with embedding IS NULL (or all with --force)
3. Load paraphrase-multilingual-mpnet-base-v2 via @huggingface/transformers (Node)
4. For each item, build embed text:
   - Dataset:   titulo + " " + (subtema ?? "") + " " + (descripcion_notas ?? "")
   - Normativa: nombre + " " + (obligacion_datos ?? "") + " " + (descripcion_notas ?? "")
5. Embed in batches of 10
6. UPDATE Supabase row: embedding = vector
7. Print progress: "Dataset 12/192 — Encuesta Nacional de Salud…"
```

Dependencies: `@huggingface/transformers`, `@supabase/supabase-js`, `dotenv`, `tsx` (already in devDeps).

---

## New Files

### `src/workers/embedder.worker.ts`

Runs in a dedicated Web Worker. Message protocol:

```typescript
// Inbound
{ type: 'embed'; id: string; text: string }

// Outbound
{ type: 'progress'; message: string; percent: number }   // during model load
{ type: 'ready' }                                         // model loaded
{ type: 'result'; id: string; vector: number[] }         // embed complete
{ type: 'error'; message: string }
```

Uses `@huggingface/transformers` with `env.useBrowserCache = true` so the model (~120MB quantized ONNX) is cached in the browser Cache API after first download.

### `src/context/EmbedderContext.tsx`

```typescript
interface EmbedderContextType {
  status: 'loading' | 'ready' | 'error'
  progress: string          // "Descargando modelo… 67%"
  embed: (text: string) => Promise<Float32Array>
  error: string | null
}
```

Creates the Worker, listens for messages, exposes `embed()` as a Promise (keyed by a UUID so concurrent calls don't collide).

### `src/services/semanticSearch.ts`

```typescript
export function cosineSimilarity(a: Float32Array, b: Float32Array): number

export function semanticSearch(
  queryVector: Float32Array,
  index: SearchIndex,
  limit?: number                    // default 5
): { datasets: SearchHit[]; normativas: SearchHit[] }
```

Pure in-memory: iterates `index.datasetEmbeddings` and `index.normativaEmbeddings`, computes cosine similarity, returns top-k sorted by similarity descending. No network, no Worker call — the query vector is already computed before this is called.

---

## Modified Files

### `src/services/searchService.ts`

`SearchIndex` interface gains two new fields:

```typescript
datasetEmbeddings:   Map<string, Float32Array>   // id → vector(768)
normativaEmbeddings: Map<string, Float32Array>   // id → vector(768)
```

`buildIndex()` accepts the pre-fetched embedding maps and populates them. Items without an embedding are excluded from the maps (they still appear in MiniSearch/Fuse for the fallback in useMonitorStats).

### `src/services/dataService.ts`

`getDatasets()` and `getNormativas()` SELECT now include `embedding`. The returned `Dataset` and `Normativa` types gain `embedding: number[] | null`.

### `src/context/SearchIndexContext.tsx`

Passes embedding data from fetched datasets/normativas into `buildIndex()`.

### `src/types/index.ts`

`Dataset` and `Normativa` gain `embedding: number[] | null`.

### `src/hooks/useMotorBrechas.ts`

Imports `EmbedderContext`. `buscar()` now:
1. Calls `embed(query)` → `Float32Array`
2. Calls `semanticSearch(vector, index)` instead of `search(query, index)`
3. Everything else (calcularScore, insertPregunta) unchanged.

### `src/App.tsx`

Wraps the tree with `<EmbedderProvider>` alongside `<SearchIndexProvider>`.

### `src/pages/MonitorBrechas.tsx`

When `embedderStatus !== 'ready'`: shows a loading card with progress text instead of the search form. No partial/fallback — the form is hidden until ready (per design decision).

### `src/pages/IngresoForm.tsx`

After a successful `directo` submission: if embedder is ready, build the embed text, call `embed()`, and do `supabase.from(tabla).update({ embedding: [...vector] }).eq('id', insertedId)`. If embedder not ready, skip silently (the offline script will backfill).

---

## Data Flow: embeddings in Supabase

Embeddings arrive in Supabase from two paths:

| Path | When | Who |
|------|------|-----|
| Offline script | Initial corpus + synthetic data | Developer runs `npx tsx scripts/embed-corpus.ts` |
| IngresoForm (directo) | New item added via UI | Browser, if embedder is ready at submit time |

Items submitted to `*_en_revision` tables are NOT embedded by the browser — those are reviewed before going live. The offline script handles them after they're promoted.

---

## Testing

| Test file | What to cover |
|-----------|---------------|
| `src/test/semanticSearch.test.ts` | `cosineSimilarity` correctness; `semanticSearch` returns top-k sorted; empty index returns empty |
| `src/test/searchService.test.ts` | `buildIndex` populates embedding maps correctly |
| Worker and EmbedderContext | Not unit-tested (browser Worker env); covered by manual smoke test |

Existing 61 tests must continue to pass. The `useMonitorStats` hook keeps using Fuse.js for topic scoring (no change needed there).

---

## Out of Scope

- Server-side pgvector search (the ivfflat index is created but not used yet)
- Cache invalidation / IndexedDB caching of embeddings (deferred, corpus is small)
- Embedding items in `*_en_revision` tables from the browser
- Re-ranking or hybrid keyword+semantic fusion
