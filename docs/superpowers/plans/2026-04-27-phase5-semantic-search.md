# Phase 5 — Semantic Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace keyword-only search (MiniSearch/Fuse.js) with real in-browser semantic vector search using `paraphrase-multilingual-mpnet-base-v2` via Transformers.js + ONNX Web Worker; corpus embeddings are stored in Supabase.

**Architecture:** The browser loads the model (~120 MB quantized ONNX, cached in Cache API after first download) in a dedicated Web Worker exposed via `EmbedderContext`. `SearchIndexContext` fetches embeddings from Supabase alongside the corpus and passes them into `buildIndex()`. When the user submits a query in Monitor de Brechas, the hook embeds it in the Worker, then does in-memory cosine similarity against all stored vectors. No backend inference — everything runs client-side.

**Tech Stack:** `@huggingface/transformers` (browser + Node), Vite Web Worker import syntax (`?worker`), Supabase `pgvector` extension, `tsx` (already a devDep), `dotenv` (new devDep for the embed script).

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `db/migration-v0.6-embeddings.sql` | Add `vector(768)` columns + ivfflat indexes |
| Create | `scripts/embed-corpus.ts` | Offline Node script to embed corpus rows in Supabase |
| Create | `src/workers/embedder.worker.ts` | Web Worker: loads model, handles embed messages |
| Create | `src/context/EmbedderContext.tsx` | React context: manages Worker, exposes `embed()` |
| Create | `src/services/semanticSearch.ts` | Pure functions: `cosineSimilarity`, `semanticSearch` |
| Create | `src/test/semanticSearch.test.ts` | Unit tests for `cosineSimilarity` + `semanticSearch` |
| Modify | `src/types/index.ts` | Add `embedding: number[] \| null` to Dataset + Normativa |
| Modify | `src/services/searchService.ts` | Add `datasetEmbeddings` + `normativaEmbeddings` to `SearchIndex`; update `buildIndex()` |
| Modify | `src/test/searchService.test.ts` | Update `buildIndex` tests for new embedding maps field |
| Modify | `src/services/dataService.ts` | `getDatasets`/`getNormativas` already use `select('*')` — no change needed; `submitNormativa`/`submitFormulario` need post-insert embedding path for directo mode; add `updateEmbedding()` helper |
| Modify | `src/context/SearchIndexContext.tsx` | Pass embedding maps into `buildIndex()` |
| Modify | `src/hooks/useMotorBrechas.ts` | Use `embed()` + `semanticSearch()` instead of `search()` |
| Modify | `src/pages/MonitorBrechas.tsx` | Show embedder loading card until ready |
| Modify | `src/pages/IngresoForm.tsx` | After directo submit, call `embed()` + `updateEmbedding()` |
| Modify | `src/App.tsx` | Wrap tree with `<EmbedderProvider>` |
| Modify | `package.json` | Add `@huggingface/transformers`, `dotenv`; add `embed` script |
| Modify | `vite.config.ts` | No changes needed — Vite handles `?worker` natively |

---

## Task 1: Install dependencies + DB migration file

**Files:**
- Modify: `package.json`
- Create: `db/migration-v0.6-embeddings.sql`

- [ ] **Step 1: Install npm packages**

```bash
npm install @huggingface/transformers
npm install --save-dev dotenv
```

Expected output: updated `node_modules`, `package.json` and `package-lock.json` updated.

- [ ] **Step 2: Verify install**

```bash
node -e "import('@huggingface/transformers').then(() => console.log('ok'))"
```

Expected: prints `ok` (or ESM note — just check no error).

- [ ] **Step 3: Create migration file**

Create `db/migration-v0.6-embeddings.sql` with content:

```sql
-- Phase 5: add pgvector embeddings to datasets + normativas
-- Run once in Supabase SQL Editor (requires pgvector extension)

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE datasets   ADD COLUMN IF NOT EXISTS embedding vector(768);
ALTER TABLE normativas ADD COLUMN IF NOT EXISTS embedding vector(768);

CREATE INDEX IF NOT EXISTS datasets_embedding_idx
  ON datasets USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

CREATE INDEX IF NOT EXISTS normativas_embedding_idx
  ON normativas USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
```

- [ ] **Step 4: Run migration in Supabase**

Open Supabase → SQL Editor → paste the file contents → Run.
Verify: no errors; `datasets` table now has `embedding` column of type `vector`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json db/migration-v0.6-embeddings.sql
git commit -m "feat: install @huggingface/transformers + add pgvector migration"
```

---

## Task 2: Update types — add `embedding` field

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/test/types.test.ts` (no-op — just confirm it still passes)

- [ ] **Step 1: Write a failing test**

Open `src/test/types.test.ts`. Add this test to the end of the file (or create the file if it has no relevant test):

```typescript
import { describe, it, expectTypeOf } from 'vitest'
import type { Dataset, Normativa } from '../types'

describe('embedding field', () => {
  it('Dataset has embedding field', () => {
    expectTypeOf<Dataset['embedding']>().toEqualTypeOf<number[] | null>()
  })
  it('Normativa has embedding field', () => {
    expectTypeOf<Normativa['embedding']>().toEqualTypeOf<number[] | null>()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails (type error)**

```bash
npm test -- --run src/test/types.test.ts
```

Expected: TypeScript error — property `embedding` does not exist.

- [ ] **Step 3: Add `embedding` to both interfaces in `src/types/index.ts`**

In `Dataset` interface (after `es_sintetico: boolean`):
```typescript
  embedding: number[] | null
```

In `Normativa` interface (after `es_sintetico: boolean`):
```typescript
  embedding: number[] | null
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --run
```

Expected: all 61 existing tests pass + the 2 new type tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/test/types.test.ts
git commit -m "feat: add embedding field to Dataset and Normativa types"
```

---

## Task 3: Update `searchService.ts` — add embedding maps to `SearchIndex`

**Files:**
- Modify: `src/services/searchService.ts`
- Modify: `src/test/searchService.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `src/test/searchService.test.ts`, after the existing tests:

```typescript
describe('buildIndex with embeddings', () => {
  it('populates datasetEmbeddings map for items that have an embedding', () => {
    const vec = Array.from({ length: 768 }, (_, i) => i / 768)
    const dsWithEmbed: Dataset[] = [
      { ...mockDatasets[0], embedding: vec },
      { ...mockDatasets[1], embedding: null },
    ]
    const normWithEmbed: Normativa[] = [{ ...mockNormativas[0], embedding: null }]
    const index = buildIndex(dsWithEmbed, normWithEmbed)
    expect(index.datasetEmbeddings.size).toBe(1)
    expect(index.datasetEmbeddings.get('DS-001')).toBeInstanceOf(Float32Array)
    expect(index.datasetEmbeddings.get('DS-002')).toBeUndefined()
  })

  it('populates normativaEmbeddings map for items that have an embedding', () => {
    const vec = Array.from({ length: 768 }, (_, i) => i / 768)
    const normWithEmbed: Normativa[] = [{ ...mockNormativas[0], embedding: vec }]
    const dsWithEmbed: Dataset[] = mockDatasets.map(d => ({ ...d, embedding: null }))
    const index = buildIndex(dsWithEmbed, normWithEmbed)
    expect(index.normativaEmbeddings.size).toBe(1)
    expect(index.normativaEmbeddings.get('NM-001')).toBeInstanceOf(Float32Array)
  })

  it('returns empty maps when no embeddings provided', () => {
    const dsNoEmbed = mockDatasets.map(d => ({ ...d, embedding: null }))
    const nmNoEmbed = mockNormativas.map(n => ({ ...n, embedding: null }))
    const index = buildIndex(dsNoEmbed, nmNoEmbed)
    expect(index.datasetEmbeddings.size).toBe(0)
    expect(index.normativaEmbeddings.size).toBe(0)
  })
})
```

Also update existing mock data at the top of the test file — add `embedding: null` to each mock object:

```typescript
// In mockDatasets array, each entry gets:
embedding: null,

// In mockNormativas array, each entry gets:
embedding: null,
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --run src/test/searchService.test.ts
```

Expected: TypeScript errors — `embedding` not on Dataset/Normativa (Task 2 already fixed this), `datasetEmbeddings` not on `SearchIndex`.

- [ ] **Step 3: Update `SearchIndex` interface and `buildIndex()` in `src/services/searchService.ts`**

Add two fields to the `SearchIndex` interface:

```typescript
export interface SearchIndex {
  miniDatasets: MiniSearch
  miniNormativas: MiniSearch
  fuseDatasets: Fuse<Dataset>
  fuseNormativas: Fuse<Normativa>
  datasetsMap: Map<string, Dataset>
  normativasMap: Map<string, Normativa>
  datasetEmbeddings: Map<string, Float32Array>
  normativaEmbeddings: Map<string, Float32Array>
}
```

Update the `return` statement inside `buildIndex()` to add:

```typescript
  const datasetEmbeddings = new Map<string, Float32Array>()
  for (const d of datasets) {
    if (d.embedding) datasetEmbeddings.set(d.id, new Float32Array(d.embedding))
  }

  const normativaEmbeddings = new Map<string, Float32Array>()
  for (const n of normativas) {
    if (n.embedding) normativaEmbeddings.set(n.id, new Float32Array(n.embedding))
  }

  return {
    miniDatasets, miniNormativas, fuseDatasets, fuseNormativas,
    datasetsMap: new Map(datasets.map(d => [d.id, d])),
    normativasMap: new Map(normativas.map(n => [n.id, n])),
    datasetEmbeddings,
    normativaEmbeddings,
  }
```

(Remove the old `return` block that omitted these fields.)

- [ ] **Step 4: Run all tests**

```bash
npm test -- --run
```

Expected: all tests pass (61 existing + new embedding map tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/searchService.ts src/test/searchService.test.ts
git commit -m "feat: add embedding maps to SearchIndex and buildIndex"
```

---

## Task 4: Create `semanticSearch.ts` + unit tests

**Files:**
- Create: `src/services/semanticSearch.ts`
- Create: `src/test/semanticSearch.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/test/semanticSearch.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { cosineSimilarity, semanticSearch } from '../services/semanticSearch'
import { buildIndex } from '../services/searchService'
import type { Dataset, Normativa } from '../types'

function makeVec(dims: number, fill: number): Float32Array {
  return new Float32Array(dims).fill(fill)
}

describe('cosineSimilarity', () => {
  it('identical vectors → 1.0', () => {
    const a = makeVec(4, 1)
    expect(cosineSimilarity(a, a)).toBeCloseTo(1.0, 5)
  })

  it('orthogonal vectors → 0', () => {
    const a = new Float32Array([1, 0, 0, 0])
    const b = new Float32Array([0, 1, 0, 0])
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5)
  })

  it('opposite vectors → -1', () => {
    const a = new Float32Array([1, 0])
    const b = new Float32Array([-1, 0])
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5)
  })
})

const mockDatasets: Dataset[] = [
  {
    id: 'DS-001', titulo: 'Feminicidio', fuente_organismo: null, pais_iso3: 'MEX',
    anio_publicacion: 2024, subtema: 'violencia-genero', agendas: ['Ag. de Género'],
    calidad: 'Completa', frecuencia: null, desagregacion_geo: null,
    accesibilidad_formato: null, url_descarga: null, url_valida: true,
    descripcion_notas: null, es_sintetico: false, created_at: '2024-01-01T00:00:00Z',
    embedding: Array.from(makeVec(768, 1.0)),
  },
  {
    id: 'DS-002', titulo: 'Salud reproductiva', fuente_organismo: null, pais_iso3: 'MEX',
    anio_publicacion: 2023, subtema: 'salud-reproductiva', agendas: ['Ag. de Datos'],
    calidad: 'Parcial', frecuencia: null, desagregacion_geo: null,
    accesibilidad_formato: null, url_descarga: null, url_valida: false,
    descripcion_notas: null, es_sintetico: false, created_at: '2024-01-01T00:00:00Z',
    embedding: Array.from(makeVec(768, 0.0)),
  },
]

const mockNormativas: Normativa[] = [
  {
    id: 'NM-001', nombre: 'NOM-046', organismo_emisor: null, tipo: null,
    pais_alcance: 'MEX', anio_adopcion: 2005, articulo_numeral: null,
    obligacion_datos: null, agendas: ['Ag. de Género'], url_texto_oficial: null,
    descripcion_notas: null, es_sintetico: false, created_at: '2024-01-01T00:00:00Z',
    embedding: Array.from(makeVec(768, 1.0)),
  },
]

describe('semanticSearch', () => {
  it('returns top-k datasets sorted by cosine similarity descending', () => {
    const index = buildIndex(mockDatasets, mockNormativas)
    const queryVec = makeVec(768, 1.0)
    const { datasets } = semanticSearch(queryVec, index, 5)
    expect(datasets.length).toBeGreaterThan(0)
    expect(datasets[0].id).toBe('DS-001')
    expect(datasets[0].similitud).toBeGreaterThan(datasets[1]?.similitud ?? -1)
  })

  it('returns top-k normativas sorted by cosine similarity descending', () => {
    const index = buildIndex(mockDatasets, mockNormativas)
    const queryVec = makeVec(768, 1.0)
    const { normativas } = semanticSearch(queryVec, index, 5)
    expect(normativas.length).toBe(1)
    expect(normativas[0].id).toBe('NM-001')
    expect(normativas[0].tipo).toBe('normativa')
  })

  it('returns empty arrays when no embeddings in index', () => {
    const noEmbedDs = mockDatasets.map(d => ({ ...d, embedding: null }))
    const noEmbedNm = mockNormativas.map(n => ({ ...n, embedding: null }))
    const index = buildIndex(noEmbedDs, noEmbedNm)
    const { datasets, normativas } = semanticSearch(makeVec(768, 1.0), index)
    expect(datasets).toHaveLength(0)
    expect(normativas).toHaveLength(0)
  })

  it('respects limit parameter', () => {
    const index = buildIndex(mockDatasets, mockNormativas)
    const { datasets } = semanticSearch(makeVec(768, 1.0), index, 1)
    expect(datasets.length).toBeLessThanOrEqual(1)
  })

  it('similitud is between 0 and 1 (clamped)', () => {
    const index = buildIndex(mockDatasets, mockNormativas)
    const { datasets } = semanticSearch(makeVec(768, 1.0), index)
    for (const hit of datasets) {
      expect(hit.similitud).toBeGreaterThanOrEqual(0)
      expect(hit.similitud).toBeLessThanOrEqual(1)
    }
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --run src/test/semanticSearch.test.ts
```

Expected: `Cannot find module '../services/semanticSearch'`.

- [ ] **Step 3: Create `src/services/semanticSearch.ts`**

```typescript
import type { SearchIndex } from './searchService'
import type { SearchHit } from '../types'

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

export function semanticSearch(
  queryVector: Float32Array,
  index: SearchIndex,
  limit = 5
): { datasets: SearchHit[]; normativas: SearchHit[] } {
  const datasets: SearchHit[] = []
  for (const [id, vec] of index.datasetEmbeddings) {
    const doc = index.datasetsMap.get(id)
    if (!doc) continue
    const sim = cosineSimilarity(queryVector, vec)
    datasets.push({
      id: doc.id, titulo: doc.titulo, fuente: doc.fuente_organismo,
      pais: doc.pais_iso3, anio: doc.anio_publicacion, calidad: doc.calidad,
      similitud: Math.max(0, Math.round(sim * 100) / 100),
      tipo: 'dataset', agendas: doc.agendas ?? [],
    })
  }
  datasets.sort((a, b) => b.similitud - a.similitud)

  const normativas: SearchHit[] = []
  for (const [id, vec] of index.normativaEmbeddings) {
    const doc = index.normativasMap.get(id)
    if (!doc) continue
    const sim = cosineSimilarity(queryVector, vec)
    normativas.push({
      id: doc.id, titulo: doc.nombre, fuente: doc.organismo_emisor,
      pais: doc.pais_alcance, anio: doc.anio_adopcion, calidad: null,
      similitud: Math.max(0, Math.round(sim * 100) / 100),
      tipo: 'normativa', agendas: doc.agendas ?? [],
    })
  }
  normativas.sort((a, b) => b.similitud - a.similitud)

  return {
    datasets: datasets.slice(0, limit),
    normativas: normativas.slice(0, limit),
  }
}
```

- [ ] **Step 4: Run all tests**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/semanticSearch.ts src/test/semanticSearch.test.ts
git commit -m "feat: add semanticSearch service with cosineSimilarity"
```

---

## Task 5: Web Worker — `embedder.worker.ts`

**Files:**
- Create: `src/workers/embedder.worker.ts`

No unit tests for the Worker (runs in browser Worker env, not Vitest). Tested manually in Task 9.

- [ ] **Step 1: Create the worker file**

Create `src/workers/embedder.worker.ts`:

```typescript
import { pipeline, env } from '@huggingface/transformers'

env.useBrowserCache = true
env.allowLocalModels = false

type InboundMessage =
  | { type: 'embed'; id: string; text: string }

type OutboundMessage =
  | { type: 'progress'; message: string; percent: number }
  | { type: 'ready' }
  | { type: 'result'; id: string; vector: number[] }
  | { type: 'error'; message: string }

let embedder: Awaited<ReturnType<typeof pipeline>> | null = null

async function loadModel() {
  embedder = await pipeline(
    'feature-extraction',
    'Xenova/paraphrase-multilingual-mpnet-base-v2',
    {
      progress_callback: (info: { status: string; progress?: number; file?: string }) => {
        if (info.status === 'progress') {
          const percent = Math.round(info.progress ?? 0)
          const msg = info.file
            ? `Descargando modelo… ${percent}%`
            : `Cargando modelo… ${percent}%`
          postMessage({ type: 'progress', message: msg, percent } satisfies OutboundMessage)
        }
      },
    }
  )
  postMessage({ type: 'ready' } satisfies OutboundMessage)
}

loadModel().catch(err => {
  postMessage({ type: 'error', message: String(err) } satisfies OutboundMessage)
})

self.onmessage = async (e: MessageEvent<InboundMessage>) => {
  const { type, id, text } = e.data
  if (type !== 'embed') return
  if (!embedder) {
    postMessage({ type: 'error', message: 'Modelo no listo' } satisfies OutboundMessage)
    return
  }
  try {
    const output = await embedder(text, { pooling: 'mean', normalize: true })
    // output.data is a Float32Array; convert to plain array for structured clone
    postMessage({ type: 'result', id, vector: Array.from(output.data as Float32Array) } satisfies OutboundMessage)
  } catch (err) {
    postMessage({ type: 'error', message: String(err) } satisfies OutboundMessage)
  }
}
```

- [ ] **Step 2: Run existing tests (nothing should break)**

```bash
npm test -- --run
```

Expected: all tests still pass.

- [ ] **Step 3: Commit**

```bash
git add src/workers/embedder.worker.ts
git commit -m "feat: add Transformers.js embedder Web Worker"
```

---

## Task 6: `EmbedderContext.tsx`

**Files:**
- Create: `src/context/EmbedderContext.tsx`

- [ ] **Step 1: Create the context file**

Create `src/context/EmbedderContext.tsx`:

```typescript
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'

export interface EmbedderContextType {
  status: 'loading' | 'ready' | 'error'
  progress: string
  embed: (text: string) => Promise<Float32Array>
  error: string | null
}

const EmbedderContext = createContext<EmbedderContextType>({
  status: 'loading',
  progress: 'Iniciando modelo…',
  embed: () => Promise.reject(new Error('EmbedderContext not mounted')),
  error: null,
})

export function useEmbedder() {
  return useContext(EmbedderContext)
}

type PendingResolve = (vec: Float32Array) => void
type PendingReject = (err: Error) => void

export function EmbedderProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [progress, setProgress] = useState('Iniciando modelo…')
  const [error, setError] = useState<string | null>(null)

  const workerRef = useRef<Worker | null>(null)
  const pendingRef = useRef<Map<string, [PendingResolve, PendingReject]>>(new Map())

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/embedder.worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker

    worker.onmessage = (e) => {
      const msg = e.data
      if (msg.type === 'progress') {
        setProgress(msg.message)
      } else if (msg.type === 'ready') {
        setStatus('ready')
        setProgress('Modelo listo')
      } else if (msg.type === 'result') {
        const pending = pendingRef.current.get(msg.id)
        if (pending) {
          pendingRef.current.delete(msg.id)
          pending[0](new Float32Array(msg.vector))
        }
      } else if (msg.type === 'error') {
        setStatus('error')
        setError(msg.message)
        // reject all pending
        for (const [, [, reject]] of pendingRef.current) {
          reject(new Error(msg.message))
        }
        pendingRef.current.clear()
      }
    }

    worker.onerror = (e) => {
      setStatus('error')
      setError(e.message)
    }

    return () => { worker.terminate() }
  }, [])

  const embed = useCallback((text: string): Promise<Float32Array> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) { reject(new Error('Worker not initialized')); return }
      const id = crypto.randomUUID()
      pendingRef.current.set(id, [resolve, reject])
      workerRef.current.postMessage({ type: 'embed', id, text })
    })
  }, [])

  return (
    <EmbedderContext.Provider value={{ status, progress, embed, error }}>
      {children}
    </EmbedderContext.Provider>
  )
}
```

- [ ] **Step 2: Run existing tests**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/context/EmbedderContext.tsx
git commit -m "feat: add EmbedderContext with Web Worker lifecycle management"
```

---

## Task 7: Wire `EmbedderProvider` into `App.tsx` + update `MonitorBrechas.tsx`

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/MonitorBrechas.tsx`

### 7a — App.tsx

- [ ] **Step 1: Update `src/App.tsx`**

Replace the file content with:

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Header } from './components/Header'
import { Landing } from './pages/Landing'
import { MonitorBrechas } from './pages/MonitorBrechas'
import { MonitorColectivo } from './pages/MonitorColectivo'
import { DatosQueremos } from './pages/DatosQueremos'
import { IngresoForm } from './pages/IngresoForm'
import { SearchIndexProvider } from './context/SearchIndexContext'
import { EmbedderProvider } from './context/EmbedderContext'

export default function App() {
  return (
    <SearchIndexProvider>
      <EmbedderProvider>
        <BrowserRouter>
          <Header />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/brechas" element={<MonitorBrechas />} />
            <Route path="/colectivo" element={<MonitorColectivo />} />
            <Route path="/datos" element={<DatosQueremos />} />
            <Route path="/ingresar" element={<IngresoForm />} />
          </Routes>
          <footer style={{
            textAlign: 'center',
            padding: '2rem 0 1.5rem',
            fontFamily: 'var(--mono)',
            fontSize: '10px',
            color: 'var(--ink-light)',
            letterSpacing: '0.08em',
          }}>
            Desarrollado por Diversa
          </footer>
        </BrowserRouter>
      </EmbedderProvider>
    </SearchIndexProvider>
  )
}
```

### 7b — MonitorBrechas.tsx loading card

- [ ] **Step 2: Add embedder loading state to `src/pages/MonitorBrechas.tsx`**

Add this import at the top:
```typescript
import { useEmbedder } from '../context/EmbedderContext'
```

Inside the `MonitorBrechas` component function, after the existing hooks, add:
```typescript
  const { status: embedderStatus, progress: embedderProgress, error: embedderError } = useEmbedder()
```

Replace the `return (` block's `<main className="motor-page">` contents to add the loading card. Replace the entire `return` statement with:

```typescript
  if (embedderStatus === 'loading' || embedderStatus === 'error') {
    return (
      <main className="motor-page">
        <div className="container">
          <div className="hero">
            <p className="hero-eyebrow">Monitor de Brechas</p>
            <h1>¿Qué datos <em>faltan</em>?</h1>
          </div>
          <div className="search-box" style={{ textAlign: 'center', padding: '2rem' }}>
            {embedderStatus === 'error' ? (
              <p className="search-error">{embedderError ?? 'Error cargando el modelo semántico'}</p>
            ) : (
              <>
                <p className="label-mono" style={{ marginBottom: 8 }}>{embedderProgress}</p>
                <div style={{
                  height: 4, background: 'var(--ink-faint)',
                  borderRadius: 2, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', width: '60%',
                    background: 'var(--accent)',
                    borderRadius: 2,
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }} />
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="motor-page">
      <div className="container">
        <div className="hero">
          <p className="hero-eyebrow">Monitor de Brechas</p>
          <h1>¿Qué datos <em>faltan</em>?</h1>
          <p className="hero-sub">Escribe una pregunta sobre datos de género en América Latina.</p>
        </div>

        <div className="motor-search">
          <SearchBox
            value={query}
            onChange={setQuery}
            onSearch={handleBuscar}
            onClear={handleLimpiar}
            isLoading={isLoading}
            isDisabled={!isReady || isLoading || query.trim().length < 5}
            indexError={indexError}
            isIndexReady={isReady}
          />
          {searchError && (
            <p className="search-error" style={{ marginTop: 8, borderRadius: 'var(--r)' }}>
              {searchError}
            </p>
          )}
        </div>
      </div>

      {resultado && (
        <div className="motor-results">
          <div className="motor-results-inner">
            <ScorePanel resultado={resultado} />
            <ResultsColumns resultado={resultado} />
          </div>
        </div>
      )}
    </main>
  )
```

- [ ] **Step 3: Run all tests**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/pages/MonitorBrechas.tsx
git commit -m "feat: wire EmbedderProvider into App, add loading card to MonitorBrechas"
```

---

## Task 8: Update `useMotorBrechas.ts` — use semantic search

**Files:**
- Modify: `src/hooks/useMotorBrechas.ts`

- [ ] **Step 1: Update `src/hooks/useMotorBrechas.ts`**

Replace the entire file with:

```typescript
import { useState, useCallback } from 'react'
import { useSearchIndex } from '../context/SearchIndexContext'
import { useEmbedder } from '../context/EmbedderContext'
import { semanticSearch } from '../services/semanticSearch'
import { calcularScore, calcularAgendas, generarTitulo } from '../services/scoreService'
import { insertPregunta } from '../services/dataService'
import type { GapResult } from '../types'

interface MotorState {
  resultado: GapResult | null
  isLoading: boolean
  error: string | null
}

export function useMotorBrechas() {
  const { index } = useSearchIndex()
  const { embed } = useEmbedder()
  const [state, setState] = useState<MotorState>({
    resultado: null,
    isLoading: false,
    error: null,
  })

  const buscar = useCallback(async (query: string) => {
    if (!index) return
    setState(s => ({ ...s, isLoading: true, error: null }))

    try {
      const queryVector = await embed(query)
      const hits = semanticSearch(queryVector, index)
      const { score, categoria } = calcularScore(hits.datasets, hits.normativas)
      const agendas = calcularAgendas(hits.datasets, hits.normativas, score)
      const titulo = generarTitulo(categoria, hits.datasets, hits.normativas)

      const resultado: GapResult = {
        score, categoria, titulo, agendas,
        datasets: hits.datasets,
        normativas: hits.normativas,
      }

      setState({ resultado, isLoading: false, error: null })

      insertPregunta(query, score, hits.datasets.map(h => h.id)).catch(() => {})
    } catch (err) {
      setState({
        resultado: null,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Error al buscar',
      })
    }
  }, [index, embed])

  const limpiar = useCallback(() => {
    setState({ resultado: null, isLoading: false, error: null })
  }, [])

  return { ...state, buscar, limpiar }
}
```

- [ ] **Step 2: Update `src/test/useMotorBrechas.test.tsx`**

The hook now depends on `useEmbedder`. The existing test likely mocks `useSearchIndex` and `search`. Update it to also mock `EmbedderContext` and `semanticSearch`.

Open `src/test/useMotorBrechas.test.tsx` and check the existing mock structure. Add these mocks near the top of the file (after existing imports):

```typescript
import { vi } from 'vitest'

vi.mock('../context/EmbedderContext', () => ({
  useEmbedder: () => ({
    status: 'ready',
    embed: vi.fn().mockResolvedValue(new Float32Array(768).fill(0.5)),
    progress: '',
    error: null,
  }),
}))

vi.mock('../services/semanticSearch', () => ({
  semanticSearch: vi.fn().mockReturnValue({ datasets: [], normativas: [] }),
}))
```

Also remove any mock for `../services/searchService` that mocked `search`, since we no longer use it in the hook.

- [ ] **Step 3: Run all tests**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useMotorBrechas.ts src/test/useMotorBrechas.test.tsx
git commit -m "feat: useMotorBrechas now uses embed() + semanticSearch()"
```

---

## Task 9: Update `dataService.ts` + `IngresoForm.tsx` — post-submit embedding

**Files:**
- Modify: `src/services/dataService.ts`
- Modify: `src/pages/IngresoForm.tsx`

### 9a — Add `updateEmbedding()` to `dataService.ts`

- [ ] **Step 1: Add the function**

Append to `src/services/dataService.ts`:

```typescript
export async function updateEmbedding(
  tabla: 'datasets' | 'normativas',
  id: string,
  embedding: number[]
): Promise<void> {
  const { error } = await supabase
    .from(tabla)
    .update({ embedding })
    .eq('id', id)
  if (error) throw new Error(error.message)
}
```

### 9b — Change `submitFormulario` and `submitNormativa` to return the inserted id in directo mode

`submitFormulario` and `submitNormativa` currently `insert` without returning the id. We need the id to call `updateEmbedding`. Update them to return `string | null` (the id, if directo mode and insert succeeded).

Replace `submitFormulario`:

```typescript
export async function submitFormulario(
  formulario: FormularioData,
  modo: 'directo' | 'revision'
): Promise<string | null> {
  const tabla = modo === 'directo' ? 'formularios_publicados' : 'formularios_en_revision'
  const payload = modo === 'revision'
    ? { ...formulario, status: 'pendiente' }
    : formulario

  if (modo === 'directo') {
    const { data, error } = await supabase.from(tabla).insert(payload).select('id').single()
    if (error) throw new Error(error.message)
    return (data as { id: string }).id
  }

  const { error } = await supabase.from(tabla).insert(payload)
  if (error) throw new Error(error.message)
  return null
}
```

Replace `submitNormativa`:

```typescript
export async function submitNormativa(
  normativa: NormativaFormData,
  modo: 'directo' | 'revision'
): Promise<string | null> {
  const tabla = modo === 'directo' ? 'normativas' : 'normativas_en_revision'
  const payload = modo === 'revision'
    ? { ...normativa, status: 'pendiente' }
    : normativa

  if (modo === 'directo') {
    const { data, error } = await supabase.from(tabla).insert(payload).select('id').single()
    if (error) throw new Error(error.message)
    return (data as { id: string }).id
  }

  const { error } = await supabase.from(tabla).insert(payload)
  if (error) throw new Error(error.message)
  return null
}
```

- [ ] **Step 2: Update `src/test/dataService.test.ts`**

The existing tests mock supabase. Find the tests for `submitFormulario` and `submitNormativa` and update the mock to return `{ data: { id: 'mock-id' }, error: null }` for directo calls that use `.select('id').single()`. Check the current mock patterns and adjust accordingly — the key change is that directo mode now chains `.select('id').single()`.

- [ ] **Step 3: Update `IngresoForm.tsx` to call embed + updateEmbedding after directo submit**

Add these imports at the top of `IngresoForm.tsx`:

```typescript
import { useEmbedder } from '../context/EmbedderContext'
import { updateEmbedding } from '../services/dataService'
```

Inside `IngresoForm`, add:

```typescript
  const { status: embedderStatus, embed } = useEmbedder()
```

Replace the `handleSubmit` function with:

```typescript
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    try {
      let insertedId: string | null = null
      if (tipo === 'dataset') {
        insertedId = await submitFormulario(datasetData, modo)
      } else {
        insertedId = await submitNormativa(normativaData, modo)
      }
      setStatus('success')

      if (modo === 'directo' && insertedId && embedderStatus === 'ready') {
        const tabla = tipo === 'dataset' ? 'datasets' : 'normativas'
        const text = tipo === 'dataset'
          ? `${datasetData.titulo} ${datasetData.subtema} ${datasetData.descripcion_notas}`
          : `${normativaData.nombre} ${normativaData.obligacion_datos} ${normativaData.descripcion_notas}`
        embed(text)
          .then(vec => updateEmbedding(tabla, insertedId!, Array.from(vec)))
          .catch(() => {})
      }
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Error desconocido')
    }
  }
```

- [ ] **Step 4: Run all tests**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/dataService.ts src/pages/IngresoForm.tsx src/test/dataService.test.ts
git commit -m "feat: post-submit embedding in directo mode via IngresoForm"
```

---

## Task 10: Offline embedding script

**Files:**
- Create: `scripts/embed-corpus.ts`
- Modify: `package.json` (add `embed` script)

- [ ] **Step 1: Create `scripts/embed-corpus.ts`**

```typescript
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { pipeline } from '@huggingface/transformers'

const FORCE = process.argv.includes('--force')
const BATCH = 10

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function fetchRows(tabla: string) {
  const q = supabase.from(tabla).select('id, titulo, subtema, nombre, obligacion_datos, descripcion_notas')
  if (!FORCE) q.is('embedding', null)
  const { data, error } = await q
  if (error) throw new Error(`${tabla}: ${error.message}`)
  return data ?? []
}

async function updateRow(tabla: string, id: string, embedding: number[]) {
  const { error } = await supabase.from(tabla).update({ embedding }).eq('id', id)
  if (error) throw new Error(`UPDATE ${tabla} ${id}: ${error.message}`)
}

function embedText(row: Record<string, string | null>, tabla: string): string {
  if (tabla === 'datasets') {
    return [row.titulo, row.subtema, row.descripcion_notas].filter(Boolean).join(' ')
  }
  return [row.nombre, row.obligacion_datos, row.descripcion_notas].filter(Boolean).join(' ')
}

async function main() {
  console.log('Loading model…')
  const embedder = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-mpnet-base-v2')
  console.log('Model ready.')

  for (const tabla of ['datasets', 'normativas'] as const) {
    const rows = await fetchRows(tabla)
    console.log(`${tabla}: ${rows.length} rows to embed${FORCE ? ' (--force)' : ''}`)

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      for (const row of batch) {
        const text = embedText(row as Record<string, string | null>, tabla)
        const output = await embedder(text, { pooling: 'mean', normalize: true })
        const vec = Array.from(output.data as Float32Array)
        await updateRow(tabla, row.id as string, vec)
        console.log(`${tabla} ${i + batch.indexOf(row) + 1}/${rows.length} — ${(row.titulo ?? row.nombre) as string}`)
      }
    }
  }
  console.log('Done.')
}

main().catch(err => { console.error(err); process.exit(1) })
```

- [ ] **Step 2: Add the `embed` script to `package.json`**

In the `"scripts"` section, add:

```json
"embed": "tsx scripts/embed-corpus.ts"
```

- [ ] **Step 3: Run existing tests (script is not imported in tests)**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add scripts/embed-corpus.ts package.json
git commit -m "feat: add offline corpus embedding script (scripts/embed-corpus.ts)"
```

---

## Task 11: Smoke test in browser + run embed script

**Files:** none (manual verification)

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open `http://localhost:5173/brechas`.

Expected: the Monitor de Brechas page shows the loading card with progress text (e.g. "Descargando modelo… 12%"). After ~120s on first load, it should show "Modelo listo" and then the search form appears.

Note: on first load the model downloads ~120 MB; subsequent loads use the browser Cache API.

- [ ] **Step 2: Test a query**

Type: `mortalidad materna rural indígena`

Expected: results appear (may be empty if corpus has no embeddings yet — that's fine at this stage).

- [ ] **Step 3: Run the embedding script**

Make sure `.env.local` has both `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Then:

```bash
npm run embed
```

Expected output:
```
Loading model…
Model ready.
datasets: 192 rows to embed
datasets 1/192 — Encuesta Nacional de Salud…
…
normativas: 35 rows to embed
…
Done.
```

- [ ] **Step 4: Reload browser and test again**

Hard-refresh (Ctrl+Shift+R). Once model loads, test `mortalidad materna rural indígena` again. Expect semantically relevant results that keyword search would have missed.

- [ ] **Step 5: Verify all tests still pass**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: Phase 5 semantic search complete — embedder smoke test verified"
```

---

## Self-Review

### Spec coverage

| Spec requirement | Task |
|-----------------|------|
| DB migration `vector(768)` columns + ivfflat indexes | Task 1 |
| Offline embed script with `--force` flag | Task 10 |
| `embedder.worker.ts` with progress/ready/result/error messages | Task 5 |
| `EmbedderContext` with `status`, `progress`, `embed()`, `error` | Task 6 |
| `cosineSimilarity` + `semanticSearch` pure functions | Task 4 |
| `SearchIndex.datasetEmbeddings` + `normativaEmbeddings` maps | Task 3 |
| `Dataset.embedding` + `Normativa.embedding` types | Task 2 |
| `useMotorBrechas` uses `embed()` + `semanticSearch()` | Task 8 |
| `EmbedderProvider` in `App.tsx` | Task 7 |
| MonitorBrechas loading card (blocked until embedder ready) | Task 7 |
| IngresoForm directo mode → auto-embed | Task 9 |
| `env.useBrowserCache = true` (Cache API) | Task 5 |
| Items with `embedding IS NULL` excluded from semantic results | Task 3 (filtered in `buildIndex`) |
| Existing 61 tests must pass | verified each task |

All requirements covered. No gaps.

### Type consistency

- `SearchIndex.datasetEmbeddings: Map<string, Float32Array>` defined in Task 3, used in Task 4 (`semanticSearch`). ✓
- `EmbedderContextType.embed: (text: string) => Promise<Float32Array>` defined in Task 6, used in Task 8 and Task 9. ✓
- `updateEmbedding(tabla, id, embedding: number[])` defined in Task 9a, called in Task 9b. ✓
- `submitFormulario` and `submitNormativa` now return `Promise<string | null>` — IngresoForm updated accordingly. ✓
