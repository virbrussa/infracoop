# Supabase Data Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three interconnected Supabase data-flow issues: live queue updates in /revisar, auto-embedding on approval, and the dead `formularios_publicados` write path.

**Architecture:** (1) Add Supabase Realtime channel subscription in `useRevisionQueue`; (2) return the new row ID from approve functions so `Revisar.tsx` can trigger the client-side Web Worker embedder; (3) fix the `submitFormulario` "directo" path to write directly to `datasets` instead of the unused `formularios_publicados` table.

**Tech Stack:** Supabase JS v2 (`supabase.channel()` / postgres_changes), React hooks, existing `EmbedderContext` (`embed` + `updateEmbedding`).

---

## File Map

| File | Change |
|---|---|
| `src/hooks/useRevisionQueue.ts` | Add channel subscription; `fetchQueue` becomes stable callback |
| `src/services/dataService.ts` | `aprobarFormulario` → returns `string`; `aprobarNormativa` → returns `string`; `submitFormulario` mode='directo' writes to `datasets` |
| `src/pages/Revisar.tsx` | After approval call `embed` + `updateEmbedding`; accept `embed` from `useEmbedder` |
| `src/test/useRevisionQueue.test.ts` | Add realtime subscription tests; update aprobar return type |
| `src/test/dataService.test.ts` | Update aprobarFormulario / aprobarNormativa return type tests; add directo path test |

---

## Task 1: Realtime queue subscription in `useRevisionQueue`

**Files:**
- Modify: `src/hooks/useRevisionQueue.ts`
- Modify: `src/test/useRevisionQueue.test.ts`

### Background

`useRevisionQueue` currently fetches once on mount. Curadoras submitting from `/ingresar` at the same time as an admin is reviewing `/revisar` will never see new items unless they refresh manually. Supabase Realtime postgres_changes events fix this.

The channel listens for `INSERT` on both `formularios_en_revision` and `normativas_en_revision`. On any insert, it calls `fetchQueue()` to reload the full list (simpler than incremental patching, safe for concurrent approvals).

- [ ] **Step 1.1: Write the failing tests**

Add to `src/test/useRevisionQueue.test.ts` (after existing tests):

```typescript
// ── Realtime subscription ─────────────────────────────────────────────────────

// We need a mock for supabase.channel()
const mockUnsubscribe = vi.fn()
const mockSubscribe   = vi.fn().mockReturnValue({ unsubscribe: mockUnsubscribe })
const mockOn          = vi.fn().mockReturnThis()
const mockChannel     = { on: mockOn, subscribe: mockSubscribe }

beforeEach(() => {
  vi.clearAllMocks()
  ;(supabase.from as ReturnType<typeof vi.fn>)
    .mockReturnValueOnce(makeChain(mockFormularios))
    .mockReturnValueOnce(makeChain(mockNormativas))
  ;(supabase as unknown as { channel: ReturnType<typeof vi.fn> }).channel =
    vi.fn().mockReturnValue(mockChannel)
  ;(supabase as unknown as { removeChannel: ReturnType<typeof vi.fn> }).removeChannel =
    vi.fn()
})

describe('useRevisionQueue realtime', () => {
  it('subscribes to a channel on mount', async () => {
    const { result } = renderHook(() => useRevisionQueue())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect((supabase as unknown as { channel: ReturnType<typeof vi.fn> }).channel)
      .toHaveBeenCalledWith('revision-queue')
    expect(mockOn).toHaveBeenCalledTimes(2)
    expect(mockSubscribe).toHaveBeenCalled()
  })

  it('calls removeChannel on unmount', async () => {
    const { result, unmount } = renderHook(() => useRevisionQueue())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    unmount()

    expect((supabase as unknown as { removeChannel: ReturnType<typeof vi.fn> }).removeChannel)
      .toHaveBeenCalled()
  })
})
```

- [ ] **Step 1.2: Run tests to verify they fail**

```bash
cd /home/davas/Documents/InfraCoopDashboard
npm test -- --reporter=verbose src/test/useRevisionQueue.test.ts 2>&1 | tail -30
```

Expected: FAIL — `supabase.channel is not a function`

- [ ] **Step 1.3: Implement realtime subscription in `useRevisionQueue.ts`**

Replace the `useEffect` (lines 69–70) and add the channel subscription:

```typescript
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../services/supabase'
import { aprobarFormulario, rechazarFormulario, aprobarNormativa, rechazarNormativa } from '../services/dataService'

export interface ItemRevision {
  id: string
  tipo: 'dataset' | 'normativa'
  titulo: string
  fuente: string | null
  pais: string | null
  status: string
  created_at: string
}

interface RevisionQueue {
  items: ItemRevision[]
  rawItems: Record<string, Record<string, unknown>>
  isLoading: boolean
  error: string | null
  aprobar: (item: ItemRevision) => Promise<string>
  rechazar: (item: ItemRevision) => Promise<void>
}

export function useRevisionQueue(): RevisionQueue {
  const [items, setItems]       = useState<ItemRevision[]>([])
  const [rawItems, setRawItems] = useState<Record<string, Record<string, unknown>>>({})
  const [isLoading, setLoading] = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const isMounted = useRef(true)

  const fetchQueue = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: ds }, { data: nm }] = await Promise.all([
        supabase.from('formularios_en_revision')
          .select('*')
          .neq('status', 'rechazado').order('created_at'),
        supabase.from('normativas_en_revision')
          .select('*')
          .neq('status', 'rechazado').order('created_at'),
      ])
      if (!isMounted.current) return
      const raw: Record<string, Record<string, unknown>> = {}
      const mapped: ItemRevision[] = [
        ...(ds ?? []).map(r => {
          raw[r.id] = r as Record<string, unknown>
          return {
            id: r.id, tipo: 'dataset' as const,
            titulo: r.titulo, fuente: r.fuente_organismo,
            pais: r.pais_iso3, status: r.status, created_at: r.created_at,
          }
        }),
        ...(nm ?? []).map(r => {
          raw[r.id] = r as Record<string, unknown>
          return {
            id: r.id, tipo: 'normativa' as const,
            titulo: r.nombre, fuente: r.organismo_emisor,
            pais: r.pais_alcance, status: r.status, created_at: r.created_at,
          }
        }),
      ]
      setRawItems(raw)
      setItems(mapped.sort((a, b) => a.created_at.localeCompare(b.created_at)))
    } catch (err) {
      if (isMounted.current) setError(err instanceof Error ? err.message : 'Error cargando cola')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    isMounted.current = true
    fetchQueue()

    const channel = supabase
      .channel('revision-queue')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'formularios_en_revision' },
        () => fetchQueue()
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'normativas_en_revision' },
        () => fetchQueue()
      )
      .subscribe()

    return () => {
      isMounted.current = false
      supabase.removeChannel(channel)
    }
  }, [fetchQueue])

  const aprobar = useCallback(async (item: ItemRevision): Promise<string> => {
    const newId = item.tipo === 'dataset'
      ? await aprobarFormulario(item.id)
      : await aprobarNormativa(item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
    setRawItems(prev => { const n = { ...prev }; delete n[item.id]; return n })
    return newId
  }, [])

  const rechazar = useCallback(async (item: ItemRevision): Promise<void> => {
    if (item.tipo === 'dataset') await rechazarFormulario(item.id)
    else await rechazarNormativa(item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
    setRawItems(prev => { const n = { ...prev }; delete n[item.id]; return n })
  }, [])

  return { items, rawItems, isLoading, error, aprobar, rechazar }
}
```

- [ ] **Step 1.4: Update existing test mock to match new `aprobar` return type**

In `src/test/useRevisionQueue.test.ts`, the existing `aprobarFormulario` mock needs to return a string:

```typescript
vi.mock('../services/dataService', () => ({
  aprobarFormulario:  vi.fn().mockResolvedValue('new-dataset-id'),
  rechazarFormulario: vi.fn().mockResolvedValue(undefined),
  aprobarNormativa:   vi.fn().mockResolvedValue('new-normativa-id'),
  rechazarNormativa:  vi.fn().mockResolvedValue(undefined),
}))
```

Also update the existing `aprobar dataset` test to check the returned ID:

```typescript
it('aprobar dataset calls aprobarFormulario and removes item', async () => {
  const { result } = renderHook(() => useRevisionQueue())
  await waitFor(() => expect(result.current.isLoading).toBe(false))

  let returnedId: string = ''
  await act(async () => {
    returnedId = await result.current.aprobar(result.current.items[0])
  })

  expect(aprobarFormulario).toHaveBeenCalledWith('f1')
  expect(result.current.items.find(i => i.id === 'f1')).toBeUndefined()
  expect(returnedId).toBe('new-dataset-id')
})
```

- [ ] **Step 1.5: Run tests — all should pass**

```bash
npm test -- --reporter=verbose src/test/useRevisionQueue.test.ts 2>&1 | tail -30
```

Expected: all tests PASS

- [ ] **Step 1.6: Commit**

```bash
git add src/hooks/useRevisionQueue.ts src/test/useRevisionQueue.test.ts
git commit -m "feat: add Supabase Realtime subscription to useRevisionQueue"
```

---

## Task 2: Auto-embed on approval

**Files:**
- Modify: `src/services/dataService.ts`
- Modify: `src/pages/Revisar.tsx`
- Modify: `src/test/dataService.test.ts`

### Background

When a dataset/normativa is approved, it gets inserted into `datasets`/`normativas` without an embedding vector, so it never appears in semantic search results. The fix: `aprobarFormulario`/`aprobarNormativa` return the new row's `id`, then `Revisar.tsx` calls the client-side Web Worker embedder and persists the vector via `updateEmbedding`. This mirrors what `IngresoForm` already does for direct ingestion.

The text to embed for a dataset: `${titulo} ${descripcion_notas ?? ''}` (same as `npm run embed` script uses).  
The text to embed for a normativa: `${nombre} ${descripcion_notas ?? ''}`.

- [ ] **Step 2.1: Write failing tests for dataService**

Add to `src/test/dataService.test.ts` (check if this file has existing tests first; the pattern below should match):

```typescript
describe('aprobarFormulario', () => {
  it('returns the id of the newly inserted dataset', async () => {
    const mockRecord = {
      id: 'f1', titulo: 'Dataset X', status: 'pendiente',
      fecha_revision: null, ingresado_por: 'user@x.com',
      descripcion_notas: 'notas',
    }
    const mockInsertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'new-ds-1' }, error: null }),
    }
    const mockSelectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }),
    }
    const mockDeleteChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }

    ;(supabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(mockSelectChain)     // read from formularios_en_revision
      .mockReturnValueOnce(mockInsertChain)     // insert into datasets
      .mockReturnValueOnce(mockDeleteChain)     // delete from formularios_en_revision

    const { aprobarFormulario } = await import('../services/dataService')
    const id = await aprobarFormulario('f1')
    expect(id).toBe('new-ds-1')
  })
})

describe('aprobarNormativa', () => {
  it('returns the id of the newly inserted normativa', async () => {
    const mockRecord = { id: 'n1', nombre: 'Ley Y', status: 'pendiente' }
    const mockInsertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'new-nm-1' }, error: null }),
    }
    const mockSelectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }),
    }
    const mockDeleteChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }

    ;(supabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(mockSelectChain)
      .mockReturnValueOnce(mockInsertChain)
      .mockReturnValueOnce(mockDeleteChain)

    const { aprobarNormativa } = await import('../services/dataService')
    const id = await aprobarNormativa('n1')
    expect(id).toBe('new-nm-1')
  })
})
```

- [ ] **Step 2.2: Run failing tests**

```bash
npm test -- --reporter=verbose src/test/dataService.test.ts 2>&1 | tail -20
```

Expected: FAIL — `aprobarFormulario` returns `undefined`, not `'new-ds-1'`

- [ ] **Step 2.3: Update `dataService.ts` — `aprobarFormulario` and `aprobarNormativa` return new ID**

Replace both functions in `src/services/dataService.ts`:

```typescript
export async function aprobarFormulario(id: string): Promise<string> {
  const { data, error: readErr } = await supabase
    .from('formularios_en_revision').select('*').eq('id', id).single()
  if (readErr || !data) throw new Error(readErr?.message ?? 'No encontrado')

  const { status: _s, fecha_revision: _fr, ingresado_por: _ip, ...rest } = data as Record<string, unknown>
  const payload = { ...rest, es_sintetico: false }

  const { data: inserted, error: insErr } = await supabase
    .from('datasets').insert(payload).select('id').single()
  if (insErr || !inserted) throw new Error(insErr?.message ?? 'Error insertando')

  await supabase.from('formularios_en_revision').delete().eq('id', id)
  return (inserted as { id: string }).id
}

export async function aprobarNormativa(id: string): Promise<string> {
  const { data, error: readErr } = await supabase
    .from('normativas_en_revision').select('*').eq('id', id).single()
  if (readErr || !data) throw new Error(readErr?.message ?? 'No encontrado')

  const { status: _s, ...payload } = data as Record<string, unknown>

  const { data: inserted, error: insErr } = await supabase
    .from('normativas').insert(payload).select('id').single()
  if (insErr || !inserted) throw new Error(insErr?.message ?? 'Error insertando')

  await supabase.from('normativas_en_revision').delete().eq('id', id)
  return (inserted as { id: string }).id
}
```

- [ ] **Step 2.4: Run tests — should pass**

```bash
npm test -- --reporter=verbose src/test/dataService.test.ts 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 2.5: Update `Revisar.tsx` to auto-embed after approval**

Add `useEmbedder` import and update `handleAprobar`. The `rawItems[item.id]` record holds the full row so we can build the embed text without an extra fetch.

```typescript
import { useState } from 'react'
import { Layout } from '../components/Layout'
import { Tooltip } from '../components/Tooltip'
import { useRevisionQueue } from '../hooks/useRevisionQueue'
import { updateEmbedding } from '../services/dataService'
import { useEmbedder } from '../context/EmbedderContext'
import type { ItemRevision } from '../hooks/useRevisionQueue'
```

Then update the `Revisar` component:

```typescript
export function Revisar() {
  const { items, isLoading, error, aprobar, rechazar, rawItems } = useRevisionQueue()
  const { status: embedderStatus, embed } = useEmbedder()
  const [actionItem, setActionItem] = useState<string | null>(null)

  async function handleAprobar(item: ItemRevision) {
    setActionItem(item.id)
    try {
      const raw = rawItems[item.id] ?? {}
      const newId = await aprobar(item)

      // Auto-embed if embedder is ready
      if (embedderStatus === 'ready' && embed) {
        const text = item.tipo === 'dataset'
          ? `${item.titulo} ${(raw.descripcion_notas as string | null) ?? ''}`
          : `${item.titulo} ${(raw.descripcion_notas as string | null) ?? ''}`
        const tabla = item.tipo === 'dataset' ? 'datasets' : 'normativas'
        const vector = await embed(text.trim())
        await updateEmbedding(tabla, newId, vector)
      }
    } catch {
      // error already shown via hook
    } finally {
      setActionItem(null)
    }
  }

  async function handleRechazar(item: ItemRevision) {
    setActionItem(item.id)
    await rechazar(item).catch(() => {})
    setActionItem(null)
  }
  // ... rest of JSX unchanged
```

- [ ] **Step 2.6: Run full test suite**

```bash
npm test 2>&1 | tail -15
```

Expected: all tests pass (count ≥ 107)

- [ ] **Step 2.7: Commit**

```bash
git add src/services/dataService.ts src/pages/Revisar.tsx src/test/dataService.test.ts
git commit -m "feat: auto-embed dataset/normativa on approval in Revisar"
```

---

## Task 3: Fix dead `formularios_publicados` write path

**Files:**
- Modify: `src/services/dataService.ts`
- Modify: `src/test/dataService.test.ts`

### Background

`submitFormulario` with `modo='directo'` (used by admin users in IngresoForm) currently inserts into `formularios_publicados`, which is a dead table that `aprobarFormulario` no longer reads from. The data silently disappears. Fix: mode='directo' should insert directly into `datasets` the same way `aprobarFormulario` does, stripping `ingresado_por` and adding `es_sintetico: false`. The `formularios_publicados` table can be left in Supabase as a historical artifact — we just stop writing to it.

`submitNormativa` with `modo='directo'` already writes to `normativas` (the correct table), so no change needed there.

- [ ] **Step 3.1: Write failing test**

Add to `src/test/dataService.test.ts`:

```typescript
describe('submitFormulario directo', () => {
  it('inserts into datasets (not formularios_publicados) and returns new id', async () => {
    const mockInsertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'ds-new' }, error: null }),
    }
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValueOnce(mockInsertChain)

    const { submitFormulario } = await import('../services/dataService')
    const formulario = {
      titulo: 'Test', fuente_organismo: 'INE', pais_iso3: 'MEX',
      anio_publicacion: 2024, subtema: '', agendas: [], frecuencia: '',
      desagregacion_geo: '', accesibilidad_formato: '', url_descarga: '',
      descripcion_notas: '', ingresado_por: 'admin@x.com',
    }
    const id = await submitFormulario(formulario, 'directo')
    expect(id).toBe('ds-new')
    expect((supabase.from as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('datasets')
    expect((supabase.from as ReturnType<typeof vi.fn>)).not.toHaveBeenCalledWith('formularios_publicados')
  })
})
```

- [ ] **Step 3.2: Run failing test**

```bash
npm test -- --reporter=verbose src/test/dataService.test.ts 2>&1 | tail -20
```

Expected: FAIL — currently calls `'formularios_publicados'`

- [ ] **Step 3.3: Fix `submitFormulario` in `dataService.ts`**

Replace the `submitFormulario` function:

```typescript
export async function submitFormulario(
  formulario: FormularioData,
  modo: 'directo' | 'revision'
): Promise<string | null> {
  if (modo === 'revision') {
    const { error } = await supabase
      .from('formularios_en_revision')
      .insert({ ...formulario, status: 'pendiente' })
    if (error) throw new Error(error.message)
    return null
  }

  // directo: strip form-only fields, write straight to datasets
  const { ingresado_por: _ip, ...rest } = formulario
  const payload = { ...rest, es_sintetico: false }
  const { data, error } = await supabase
    .from('datasets').insert(payload).select('id').single()
  if (error) throw new Error(error.message)
  return (data as { id: string }).id
}
```

- [ ] **Step 3.4: Run tests — all pass**

```bash
npm test 2>&1 | tail -15
```

Expected: all tests PASS (count ≥ 107)

- [ ] **Step 3.5: Commit**

```bash
git add src/services/dataService.ts src/test/dataService.test.ts
git commit -m "fix: submitFormulario directo writes to datasets, not formularios_publicados"
```

---

## Self-Review

**Spec coverage:**
- ✅ Task 1: Supabase Realtime en /revisar (useRevisionQueue channel subscription)
- ✅ Task 2: Auto-embed al aprobar (aprobar* returns ID, Revisar embeds)
- ✅ Task 3: formularios_publicados dead path fixed (submitFormulario directo → datasets)

**Placeholder scan:** None found.

**Type consistency:**
- `aprobar()` return type changes from `Promise<void>` to `Promise<string>` — updated in both `useRevisionQueue.ts` (interface + impl) and `useRevisionQueue.test.ts` (mock + assertion). ✅
- `RevisionQueue.aprobar` interface updated to match. ✅
- `embed` from `useEmbedder` is `((text: string) => Promise<number[]>) | null` — guarded with `if (embedderStatus === 'ready' && embed)`. ✅
