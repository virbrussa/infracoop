# Phase 3 — Real Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all hardcoded/simulated data in MonitorColectivo and DatosQueremos with live computations derived from the Supabase `preguntas` table and the already-loaded in-memory MiniSearch index.

**Architecture:** Two new hooks (`useMonitorStats`, `useEvolucionStats`) consume `useSearchIndex()` (loaded at startup — free) and `getPreguntas()` (Supabase). MonitorColectivo answers "¿Qué tenemos?" (supply lens: datasets/normativas coverage). DatosQueremos answers "¿Qué queremos?" (demand lens: pregunta volume and gap trends over time). Gap score is the primary metric everywhere — volume is always secondary context. Old static data files are deleted after new implementations are in place.

**Tech Stack:** React + TypeScript, Vitest + @testing-library/react, existing `searchService.search()` + `scoreService.calcularScore()`, Supabase via `dataService.getPreguntas()`.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/types/index.ts` | Modify | Add `AgendaStat`, `TopicStat`, `MonitorStats`, `SemanaStats`, `EvolucionStats` |
| `src/hooks/useMonitorStats.ts` | Create | Aggregate agenda + topic stats from index + preguntas |
| `src/hooks/useEvolucionStats.ts` | Create | Group preguntas by ISO week, compute baseline, top temas |
| `src/test/useMonitorStats.test.ts` | Create | TDD tests for useMonitorStats |
| `src/test/useEvolucionStats.test.ts` | Create | TDD tests for useEvolucionStats |
| `src/pages/MonitorColectivo.tsx` | Replace | Supply-side UI: agenda cards + topic coverage cards |
| `src/pages/DatosQueremos.tsx` | Replace | Demand-side UI: week tabs + chart + top temas + agenda cards |
| `src/styles/app.css` | Modify | Add CSS for quality bars, top-temas list, stack chart |
| `src/data/monitorData.ts` | Delete | Replaced by live computation |
| `src/data/evolucionData.ts` | Delete | Replaced by live computation |
| `src/hooks/useMonitorData.ts` | Delete | Replaced by useMonitorStats |
| `src/test/monitorData.test.ts` | Delete | Was testing static data |
| `src/test/useMonitorData.test.ts` | Delete | Replaced by useMonitorStats tests |

---

### Task 1: Add types to types/index.ts

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Append new interfaces to src/types/index.ts**

Open `src/types/index.ts` and append at the end:

```typescript
// ── Monitor stats (¿Qué tenemos?) ───────────────────────────────────────────

export interface AgendaStat {
  id: 'tecnologica' | 'datos' | 'genero'
  label: string
  color: string
  colorBg: string
  barColor: string
  // demand side (from preguntas)
  total: number
  criticas: number
  parciales: number
  cubiertas: number
  top_subtemas: { subtema: string; count: number }[]
  // supply side (from index)
  datasets_en_agenda: number
  calidad_dist: { Completa: number; Parcial: number; Nula: number }
}

export interface TopicStat {
  id: string
  label: string
  gap_score: number
  categoria: 'critica' | 'parcial' | 'cubierta'
  datasets_cubriendo: number
  normativas_cubriendo: number
  preguntas_relacionadas: number
}

export interface MonitorStats {
  agendas: AgendaStat[]
  topics: TopicStat[]
  totalPreguntas: number
  totalDatasets: number
  totalNormativas: number
  isReady: boolean
  error: string | null
}

// ── Evolucion stats (¿Qué queremos?) ────────────────────────────────────────

export interface SemanaStats {
  isoWeek: string
  label: string
  nuevas: number
  acumuladas: number
  score_promedio: number
  criticas: number
  parciales: number
  cubiertas: number
  por_agenda: {
    tecnologica: { nuevas: number; score_avg: number }
    datos: { nuevas: number; score_avg: number }
    genero: { nuevas: number; score_avg: number }
  }
}

export interface EvolucionStats {
  semanas: SemanaStats[]
  topTemas: { subtema: string; count: number }[]
  baseline: { score: number; criticas: number; parciales: number; cubiertas: number }
  isReady: boolean
  error: string | null
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add MonitorStats, EvolucionStats types"
```

---

### Task 2: useMonitorStats hook (TDD)

**Files:**
- Create: `src/test/useMonitorStats.test.ts`
- Create: `src/hooks/useMonitorStats.ts`

- [ ] **Step 1: Write the failing test**

Create `src/test/useMonitorStats.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useMonitorStats } from '../hooks/useMonitorStats'

const makeDataset = (id: string, agendas: string[], subtema: string, calidad = 'Completa') => ({
  id, titulo: `Dataset ${id}`, fuente_organismo: null, pais_iso3: null,
  anio_publicacion: null, subtema, agendas, calidad, frecuencia: null,
  desagregacion_geo: null, accesibilidad_formato: null, url_descarga: null,
  url_valida: true, descripcion_notas: null, es_sintetico: false, created_at: '2026-01-01',
})

const mockIndex = {
  datasetsMap: new Map([
    ['DS-001', makeDataset('DS-001', ['género'], 'Salud reproductiva')],
    ['DS-002', makeDataset('DS-002', ['tecnología'], 'Brecha digital')],
    ['DS-003', makeDataset('DS-003', ['datos'], 'Calidad estadística')],
  ]),
  normativasMap: new Map([
    ['NM-001', {
      id: 'NM-001', nombre: 'Test', organismo_emisor: null, tipo: null,
      pais_alcance: null, anio_adopcion: null, articulo_numeral: null,
      obligacion_datos: null, agendas: ['género'], url_texto_oficial: null,
      descripcion_notas: null, es_sintetico: false, created_at: '2026-01-01',
    }],
  ]),
  miniDatasets: {} as any, miniNormativas: {} as any,
  fuseDatasets: {} as any, fuseNormativas: {} as any,
}

vi.mock('../context/SearchIndexContext', () => ({
  useSearchIndex: () => ({ index: mockIndex, isReady: true, error: null }),
}))

vi.mock('../services/dataService', () => ({
  getPreguntas: vi.fn().mockResolvedValue([
    { id: 'p1', texto: 'q1', fecha: '2026-04-01T10:00:00Z',
      agenda_clasificada: 'genero', resultado_score: 0.8,
      datasets_encontrados: ['DS-001'], es_sintetico: false },
    { id: 'p2', texto: 'q2', fecha: '2026-04-01T11:00:00Z',
      agenda_clasificada: 'datos', resultado_score: 0.4,
      datasets_encontrados: ['DS-003'], es_sintetico: false },
    { id: 'p3', texto: 'q3', fecha: '2026-04-08T10:00:00Z',
      agenda_clasificada: 'tecnologica', resultado_score: 0.2,
      datasets_encontrados: ['DS-002'], es_sintetico: false },
  ]),
}))

vi.mock('../services/searchService', () => ({
  search: vi.fn().mockReturnValue({
    datasets: [{
      id: 'DS-001', titulo: 'Test', fuente: null, pais: null, anio: null,
      calidad: 'Completa', similitud: 0.8, tipo: 'dataset', agendas: ['género'],
    }],
    normativas: [],
  }),
}))

describe('useMonitorStats', () => {
  it('retorna exactamente 3 agendas y 5 tópicos', async () => {
    const { result } = renderHook(() => useMonitorStats())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.agendas).toHaveLength(3)
    expect(result.current.topics).toHaveLength(5)
  })

  it('cada tópico tiene gap_score en [0,1] y categoría válida', async () => {
    const { result } = renderHook(() => useMonitorStats())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    for (const t of result.current.topics) {
      expect(t.gap_score).toBeGreaterThanOrEqual(0)
      expect(t.gap_score).toBeLessThanOrEqual(1)
      expect(['critica', 'parcial', 'cubierta']).toContain(t.categoria)
    }
  })

  it('totalPreguntas refleja todas las preguntas cargadas', async () => {
    const { result } = renderHook(() => useMonitorStats())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.totalPreguntas).toBe(3)
  })

  it('totalDatasets y totalNormativas reflejan el índice', async () => {
    const { result } = renderHook(() => useMonitorStats())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.totalDatasets).toBe(3)
    expect(result.current.totalNormativas).toBe(1)
  })

  it('error es null cuando todo está bien', async () => {
    const { result } = renderHook(() => useMonitorStats())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.error).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/test/useMonitorStats.test.ts
```

Expected: FAIL — `Cannot find module '../hooks/useMonitorStats'`

- [ ] **Step 3: Implement useMonitorStats.ts**

Create `src/hooks/useMonitorStats.ts`:

```typescript
import { useState, useEffect } from 'react'
import { useSearchIndex } from '../context/SearchIndexContext'
import { getPreguntas } from '../services/dataService'
import { search } from '../services/searchService'
import { calcularScore } from '../services/scoreService'
import type { MonitorStats, AgendaStat, TopicStat, Dataset } from '../types'

const AGENDA_CONFIG = [
  { id: 'tecnologica' as const, label: 'Agenda Tecnológica', color: '#0C447C', colorBg: '#E6F1FB', barColor: '#378ADD', pattern: /tecnol/i },
  { id: 'datos'       as const, label: 'Agenda de Datos',    color: '#3C3489', colorBg: '#EEEDFE', barColor: '#7F77DD', pattern: /dato/i },
  { id: 'genero'      as const, label: 'Agenda de Género',   color: '#72243E', colorBg: '#FBEAF0', barColor: '#D4537E', pattern: /g[eé]nero/i },
]

const TOPIC_QUERIES = [
  { id: 'salud-reproductiva', label: 'Salud reproductiva',  query: 'salud reproductiva maternidad mortalidad' },
  { id: 'violencia-genero',   label: 'Violencia de género',  query: 'violencia género femicidio agresión' },
  { id: 'justicia-litigios',  label: 'Justicia y litigios',  query: 'justicia litigios denuncias tribunales' },
  { id: 'interseccionalidad', label: 'Interseccionalidad',   query: 'interseccionalidad etnia raza indígena' },
  { id: 'tecnologias-datos',  label: 'Tecnologías y datos',  query: 'tecnología datos digitales acceso internet' },
]

function deriveAgenda(
  datasetsEncontrados: string[],
  datasetsMap: Map<string, Dataset>
): 'tecnologica' | 'datos' | 'genero' | null {
  const counts = { tecnologica: 0, datos: 0, genero: 0 }
  for (const id of datasetsEncontrados) {
    const ds = datasetsMap.get(id)
    if (!ds) continue
    for (const ag of ds.agendas) {
      if (/tecnol/i.test(ag)) counts.tecnologica++
      else if (/dato/i.test(ag)) counts.datos++
      else if (/g[eé]nero/i.test(ag)) counts.genero++
    }
  }
  const max = Math.max(counts.tecnologica, counts.datos, counts.genero)
  if (max === 0) return null
  if (counts.genero === max) return 'genero'
  if (counts.datos === max) return 'datos'
  return 'tecnologica'
}

export function useMonitorStats(): MonitorStats {
  const { index, isReady: indexReady } = useSearchIndex()
  const [state, setState] = useState<MonitorStats>({
    agendas: [], topics: [],
    totalPreguntas: 0, totalDatasets: 0, totalNormativas: 0,
    isReady: false, error: null,
  })

  useEffect(() => {
    if (!indexReady || !index) return
    let cancelled = false

    async function compute() {
      try {
        const preguntas = await getPreguntas()
        if (cancelled) return

        const agendas: AgendaStat[] = AGENDA_CONFIG.map(cfg => {
          const inAgenda = preguntas.filter(p => {
            if (p.agenda_clasificada) return cfg.pattern.test(p.agenda_clasificada)
            return deriveAgenda(p.datasets_encontrados, index.datasetsMap) === cfg.id
          })

          const criticas  = inAgenda.filter(p => (p.resultado_score ?? 0) >= 0.65).length
          const parciales = inAgenda.filter(p => { const s = p.resultado_score ?? 0; return s >= 0.35 && s < 0.65 }).length
          const cubiertas = inAgenda.filter(p => (p.resultado_score ?? 1) < 0.35).length

          const subtemaCounts = new Map<string, number>()
          for (const p of inAgenda) {
            for (const id of p.datasets_encontrados) {
              const ds = index.datasetsMap.get(id)
              if (ds?.subtema) subtemaCounts.set(ds.subtema, (subtemaCounts.get(ds.subtema) ?? 0) + 1)
            }
          }
          const top_subtemas = [...subtemaCounts.entries()]
            .sort((a, b) => b[1] - a[1]).slice(0, 3)
            .map(([subtema, count]) => ({ subtema, count }))

          let datasets_en_agenda = 0
          const calidad_dist = { Completa: 0, Parcial: 0, Nula: 0 }
          for (const ds of index.datasetsMap.values()) {
            if (ds.agendas.some(a => cfg.pattern.test(a))) {
              datasets_en_agenda++
              if (ds.calidad === 'Completa') calidad_dist.Completa++
              else if (ds.calidad === 'Parcial') calidad_dist.Parcial++
              else if (ds.calidad === 'Nula') calidad_dist.Nula++
            }
          }

          return { ...cfg, total: inAgenda.length, criticas, parciales, cubiertas, top_subtemas, datasets_en_agenda, calidad_dist }
        })

        const topics: TopicStat[] = TOPIC_QUERIES.map(tq => {
          const hits = search(tq.query, index, 10)
          const { score, categoria } = calcularScore(hits.datasets, hits.normativas)
          const topicDatasetIds = new Set(hits.datasets.map(h => h.id))
          const preguntas_relacionadas = preguntas.filter(p =>
            p.datasets_encontrados.some(id => topicDatasetIds.has(id))
          ).length
          return {
            id: tq.id, label: tq.label, gap_score: score, categoria,
            datasets_cubriendo: hits.datasets.length,
            normativas_cubriendo: hits.normativas.length,
            preguntas_relacionadas,
          }
        })

        setState({
          agendas, topics,
          totalPreguntas: preguntas.length,
          totalDatasets: index.datasetsMap.size,
          totalNormativas: index.normativasMap.size,
          isReady: true, error: null,
        })
      } catch (err) {
        if (!cancelled) setState(s => ({
          ...s, isReady: true,
          error: err instanceof Error ? err.message : 'Error al computar métricas',
        }))
      }
    }

    compute()
    return () => { cancelled = true }
  }, [index, indexReady])

  return state
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx vitest run src/test/useMonitorStats.test.ts
```

Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMonitorStats.ts src/test/useMonitorStats.test.ts
git commit -m "feat: add useMonitorStats with real agenda and topic metrics"
```

---

### Task 3: useEvolucionStats hook (TDD)

**Files:**
- Create: `src/test/useEvolucionStats.test.ts`
- Create: `src/hooks/useEvolucionStats.ts`

- [ ] **Step 1: Write the failing test**

Create `src/test/useEvolucionStats.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useEvolucionStats } from '../hooks/useEvolucionStats'

const makeDataset = (id: string, subtema: string) => ({
  id, titulo: `Dataset ${id}`, fuente_organismo: null, pais_iso3: null,
  anio_publicacion: null, subtema, agendas: ['género'], calidad: 'Completa',
  frecuencia: null, desagregacion_geo: null, accesibilidad_formato: null,
  url_descarga: null, url_valida: true, descripcion_notas: null,
  es_sintetico: false, created_at: '2026-01-01',
})

vi.mock('../context/SearchIndexContext', () => ({
  useSearchIndex: () => ({
    index: {
      datasetsMap: new Map([
        ['DS-001', makeDataset('DS-001', 'Salud reproductiva')],
        ['DS-002', makeDataset('DS-002', 'Salud reproductiva')],
        ['DS-003', makeDataset('DS-003', 'Violencia de género')],
      ]),
      normativasMap: new Map(),
      miniDatasets: {} as any, miniNormativas: {} as any,
      fuseDatasets: {} as any, fuseNormativas: {} as any,
    },
    isReady: true, error: null,
  }),
}))

vi.mock('../services/dataService', () => ({
  getPreguntas: vi.fn().mockResolvedValue([
    // Week 1: Apr 7 2026
    { id: 'p1', texto: 'q1', fecha: '2026-04-07T10:00:00Z',
      agenda_clasificada: 'genero', resultado_score: 0.8,
      datasets_encontrados: ['DS-001'], es_sintetico: false },
    { id: 'p2', texto: 'q2', fecha: '2026-04-07T11:00:00Z',
      agenda_clasificada: 'genero', resultado_score: 0.3,
      datasets_encontrados: ['DS-002'], es_sintetico: false },
    // Week 2: Apr 14 2026
    { id: 'p3', texto: 'q3', fecha: '2026-04-14T10:00:00Z',
      agenda_clasificada: 'genero', resultado_score: 0.9,
      datasets_encontrados: ['DS-003'], es_sintetico: false },
  ]),
}))

vi.mock('../services/searchService', () => ({
  search: vi.fn().mockReturnValue({ datasets: [], normativas: [] }),
}))

describe('useEvolucionStats', () => {
  it('agrupa preguntas en 2 semanas distintas', async () => {
    const { result } = renderHook(() => useEvolucionStats())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.semanas).toHaveLength(2)
    expect(result.current.semanas[0].nuevas).toBe(2)
    expect(result.current.semanas[1].nuevas).toBe(1)
  })

  it('cuenta acumuladas correctamente', async () => {
    const { result } = renderHook(() => useEvolucionStats())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.semanas[0].acumuladas).toBe(2)
    expect(result.current.semanas[1].acumuladas).toBe(3)
  })

  it('clasifica críticas y cubiertas correctamente en semana 1', async () => {
    const { result } = renderHook(() => useEvolucionStats())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    const s1 = result.current.semanas[0]
    expect(s1.criticas).toBe(1)  // score 0.8 >= 0.65
    expect(s1.cubiertas).toBe(1) // score 0.3 < 0.35
  })

  it('top temas ordenados por frecuencia en datasets_encontrados', async () => {
    const { result } = renderHook(() => useEvolucionStats())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.topTemas[0].subtema).toBe('Salud reproductiva')
    expect(result.current.topTemas[0].count).toBe(2)
  })

  it('error es null cuando todo está bien', async () => {
    const { result } = renderHook(() => useEvolucionStats())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.error).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/test/useEvolucionStats.test.ts
```

Expected: FAIL — `Cannot find module '../hooks/useEvolucionStats'`

- [ ] **Step 3: Implement useEvolucionStats.ts**

Create `src/hooks/useEvolucionStats.ts`:

```typescript
import { useState, useEffect } from 'react'
import { useSearchIndex } from '../context/SearchIndexContext'
import { getPreguntas } from '../services/dataService'
import { search } from '../services/searchService'
import { calcularScore } from '../services/scoreService'
import type { EvolucionStats, SemanaStats } from '../types'

const AGENDA_PATTERNS = {
  tecnologica: /tecnol/i,
  datos: /dato/i,
  genero: /g[eé]nero/i,
} as const

const BASELINE_QUERIES = [
  'salud reproductiva maternidad mortalidad',
  'violencia género femicidio agresión',
  'justicia litigios denuncias tribunales',
  'interseccionalidad etnia raza indígena',
  'tecnología datos digitales acceso internet',
]

function toIsoWeek(dateStr: string): string {
  const d = new Date(dateStr)
  const thu = new Date(d)
  thu.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(thu.getFullYear(), 0, 4)
  const weekNum = Math.ceil(((thu.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${thu.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function weekLabel(isoWeek: string): string {
  const [year, wPart] = isoWeek.split('-W')
  return `Sem. ${wPart} · ${year}`
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length * 100) / 100
}

export function useEvolucionStats(): EvolucionStats {
  const { index, isReady: indexReady } = useSearchIndex()
  const [state, setState] = useState<EvolucionStats>({
    semanas: [], topTemas: [],
    baseline: { score: 0, criticas: 0, parciales: 0, cubiertas: 0 },
    isReady: false, error: null,
  })

  useEffect(() => {
    if (!indexReady || !index) return
    let cancelled = false

    async function compute() {
      try {
        const preguntas = await getPreguntas()
        if (cancelled) return

        // Baseline: corpus coverage before any preguntas
        const baselineScores = BASELINE_QUERIES.map(q => {
          const hits = search(q, index, 10)
          return calcularScore(hits.datasets, hits.normativas).score
        })
        const baseline = {
          score: avg(baselineScores),
          criticas:  baselineScores.filter(s => s >= 0.65).length,
          parciales: baselineScores.filter(s => s >= 0.35 && s < 0.65).length,
          cubiertas: baselineScores.filter(s => s < 0.35).length,
        }

        // Group by ISO week
        const byWeek = new Map<string, typeof preguntas>()
        for (const p of preguntas) {
          const week = toIsoWeek(p.fecha)
          if (!byWeek.has(week)) byWeek.set(week, [])
          byWeek.get(week)!.push(p)
        }

        let cumulative = 0
        const semanas: SemanaStats[] = [...byWeek.keys()].sort().map(isoWeek => {
          const wPqs = byWeek.get(isoWeek)!
          cumulative += wPqs.length

          const agendaStats = (key: keyof typeof AGENDA_PATTERNS) => {
            const ag = wPqs.filter(p =>
              p.agenda_clasificada ? AGENDA_PATTERNS[key].test(p.agenda_clasificada) : false
            )
            return { nuevas: ag.length, score_avg: avg(ag.map(p => p.resultado_score ?? 0)) }
          }

          return {
            isoWeek, label: weekLabel(isoWeek),
            nuevas: wPqs.length, acumuladas: cumulative,
            score_promedio: avg(wPqs.map(p => p.resultado_score ?? 0)),
            criticas:  wPqs.filter(p => (p.resultado_score ?? 0) >= 0.65).length,
            parciales: wPqs.filter(p => { const s = p.resultado_score ?? 0; return s >= 0.35 && s < 0.65 }).length,
            cubiertas: wPqs.filter(p => (p.resultado_score ?? 1) < 0.35).length,
            por_agenda: {
              tecnologica: agendaStats('tecnologica'),
              datos: agendaStats('datos'),
              genero: agendaStats('genero'),
            },
          }
        })

        // Top temas from datasets_encontrados across all preguntas
        const subtemaCounts = new Map<string, number>()
        for (const p of preguntas) {
          for (const id of p.datasets_encontrados) {
            const ds = index.datasetsMap.get(id)
            if (ds?.subtema) subtemaCounts.set(ds.subtema, (subtemaCounts.get(ds.subtema) ?? 0) + 1)
          }
        }
        const topTemas = [...subtemaCounts.entries()]
          .sort((a, b) => b[1] - a[1]).slice(0, 5)
          .map(([subtema, count]) => ({ subtema, count }))

        setState({ semanas, topTemas, baseline, isReady: true, error: null })
      } catch (err) {
        if (!cancelled) setState(s => ({
          ...s, isReady: true,
          error: err instanceof Error ? err.message : 'Error al computar evolución',
        }))
      }
    }

    compute()
    return () => { cancelled = true }
  }, [index, indexReady])

  return state
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx vitest run src/test/useEvolucionStats.test.ts
```

Expected: PASS — 5 tests.

- [ ] **Step 5: Run all tests to verify no regressions**

```bash
npx vitest run
```

Expected: all tests pass (55 previous + 10 new = 65).

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useEvolucionStats.ts src/test/useEvolucionStats.test.ts
git commit -m "feat: add useEvolucionStats with ISO week grouping, baseline, and top temas"
```

---

### Task 4: CSS additions for new UI elements

**Files:**
- Modify: `src/styles/app.css`

- [ ] **Step 1: Append new CSS classes to the end of src/styles/app.css**

```css
/* ═══ Quality distribution bar ═══ */

.calidad-bar {
  display: flex;
  height: 4px;
  border-radius: 2px;
  overflow: hidden;
  gap: 1px;
  margin: 8px 0 10px;
}

.calidad-segment { height: 100%; transition: width 0.5s ease; }

.calidad-legend {
  display: flex;
  gap: 10px;
  font-size: 10px;
  font-family: var(--mono);
  color: var(--ink-light);
  flex-wrap: wrap;
}

.calidad-dot {
  display: inline-block;
  width: 7px; height: 7px;
  border-radius: 50%;
  margin-right: 3px;
  vertical-align: middle;
}

/* ═══ Top temas list ═══ */

.top-temas-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 1.5rem;
}

.top-tema-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.top-tema-rank {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--ink-light);
  min-width: 18px;
  text-align: right;
}

.top-tema-name {
  flex: 1;
  color: var(--ink-mid);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top-tema-bar-wrap {
  width: 80px;
  height: 4px;
  background: var(--ink-faint);
  border-radius: 2px;
  overflow: hidden;
  flex-shrink: 0;
}

.top-tema-bar-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--accent);
  transition: width 0.6s ease;
}

.top-tema-count {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-light);
  min-width: 24px;
  text-align: right;
}

/* ═══ Stacked week chart ═══ */

.stack-bar-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  flex: 1;
  height: 100%;
  justify-content: flex-end;
}

.stack-bar {
  width: 100%;
  display: flex;
  flex-direction: column-reverse;
  border-radius: 3px 3px 0 0;
  overflow: hidden;
  transition: opacity 0.3s;
}

.stack-segment {
  width: 100%;
  transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 0;
}

/* ═══ Topic coverage card ═══ */

.topic-card {
  background: var(--surface);
  border: 1px solid var(--ink-faint);
  border-radius: var(--r);
  padding: 1rem;
  transition: border-color .15s, transform .15s;
}

.topic-card:hover { border-color: var(--ink); transform: translateY(-2px); }

.topic-card-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-mid);
  margin-bottom: 8px;
}

.topic-score-big {
  font-family: var(--serif);
  font-size: 42px;
  line-height: 1;
  letter-spacing: -0.03em;
  margin-bottom: 2px;
}

.topic-score-sublabel {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--ink-light);
  text-transform: uppercase;
  letter-spacing: .06em;
  margin-bottom: 10px;
}

.topic-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  font-family: var(--mono);
  color: var(--ink-light);
  flex-wrap: wrap;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/styles/app.css
git commit -m "feat: add CSS for quality bars, top-temas list, stacked chart, topic cards"
```

---

### Task 5: Rewrite MonitorColectivo.tsx — "¿Qué tenemos?"

**Files:**
- Modify: `src/pages/MonitorColectivo.tsx`

- [ ] **Step 1: Replace MonitorColectivo.tsx**

Overwrite `src/pages/MonitorColectivo.tsx` entirely:

```typescript
import { Layout } from '../components/Layout'
import { useMonitorStats } from '../hooks/useMonitorStats'
import type { AgendaStat, TopicStat } from '../types'

// ── AgendaCard ───────────────────────────────────────────────────────────────

function AgendaCard({ a }: { a: AgendaStat }) {
  const totalCalidad = a.calidad_dist.Completa + a.calidad_dist.Parcial + a.calidad_dist.Nula || 1
  const pct = (n: number) => `${Math.round((n / totalCalidad) * 100)}%`

  return (
    <div className="agenda-monitor-card" style={{ borderTopColor: a.barColor }}>
      <div className="agenda-monitor-eyebrow" style={{ color: a.color }}>{a.label}</div>

      <div className="agenda-monitor-total" style={{ color: a.color }}>{a.datasets_en_agenda}</div>
      <div className="agenda-monitor-label">datasets disponibles en esta agenda</div>

      <div className="calidad-bar">
        <div className="calidad-segment" style={{ width: pct(a.calidad_dist.Completa), background: 'var(--gap-cov)' }} />
        <div className="calidad-segment" style={{ width: pct(a.calidad_dist.Parcial),  background: 'var(--gap-part)' }} />
        <div className="calidad-segment" style={{ width: pct(a.calidad_dist.Nula),     background: 'var(--ink-faint)' }} />
      </div>
      <div className="calidad-legend">
        <span><span className="calidad-dot" style={{ background: 'var(--gap-cov)' }} />{a.calidad_dist.Completa} completos</span>
        <span><span className="calidad-dot" style={{ background: 'var(--gap-part)' }} />{a.calidad_dist.Parcial} parciales</span>
        <span><span className="calidad-dot" style={{ background: 'var(--ink-light)' }} />{a.calidad_dist.Nula} nulos</span>
      </div>

      {a.top_subtemas.length > 0 && (
        <div className="agenda-topic-list" style={{ marginTop: 12 }}>
          {a.top_subtemas.map(t => (
            <div key={t.subtema} className="agenda-topic-row">
              <span className="agenda-topic-name">{t.subtema}</span>
              <span className="agenda-topic-count">{t.count}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-light)' }}>
        {a.total} preguntas han explorado esta agenda
      </div>
    </div>
  )
}

// ── TopicCard ────────────────────────────────────────────────────────────────

function TopicCard({ t }: { t: TopicStat }) {
  const colors = { critica: 'var(--gap-crit)', parcial: 'var(--gap-part)', cubierta: 'var(--gap-cov)' }
  const labels = { critica: 'brecha crítica', parcial: 'brecha parcial', cubierta: 'bien cubierto' }
  const color = colors[t.categoria]

  return (
    <div className="topic-card">
      <div className="topic-card-label">{t.label}</div>
      <div className="topic-score-big" style={{ color }}>{Math.round(t.gap_score * 100)}%</div>
      <div className="topic-score-sublabel" style={{ color }}>{labels[t.categoria]}</div>
      <div className="topic-meta">
        <span>{t.datasets_cubriendo} datasets</span>
        <span>·</span>
        <span>{t.normativas_cubriendo} normativas</span>
        {t.preguntas_relacionadas > 0 && (
          <><span>·</span><span>{t.preguntas_relacionadas} preguntas</span></>
        )}
      </div>
    </div>
  )
}

// ── MonitorColectivo ──────────────────────────────────────────────────────────

export function MonitorColectivo() {
  const { agendas, topics, totalPreguntas, totalDatasets, totalNormativas, isReady, error } = useMonitorStats()

  return (
    <Layout>
      <main className="monitor-page">
        <div className="hero">
          <p className="hero-eyebrow">¿Qué tenemos?</p>
          <h1>El corpus de datos <em>disponible</em></h1>
          <p className="hero-sub">
            {isReady
              ? `${totalDatasets} datasets · ${totalNormativas} normativas · ${totalPreguntas} preguntas ingresadas`
              : 'Cargando corpus…'}
          </p>
        </div>

        {error && (
          <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--warn)', marginBottom: '1rem' }}>
            {error}
          </p>
        )}

        <div className="monitor-grid">
          {agendas.map(a => <AgendaCard key={a.id} a={a} />)}
        </div>

        <p className="mapa-section-title">Cobertura por tópico</p>
        <p style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-light)', marginBottom: '1rem' }}>
          Score de brecha calculado sobre el corpus real — mayor % = menos cubierto.
        </p>
        <div className="mapa-grid">
          {topics.map(t => <TopicCard key={t.id} t={t} />)}
        </div>
      </main>
    </Layout>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/MonitorColectivo.tsx
git commit -m "feat: rewrite MonitorColectivo with real supply-side metrics"
```

---

### Task 6: Rewrite DatosQueremos.tsx — "¿Qué queremos?"

**Files:**
- Modify: `src/pages/DatosQueremos.tsx`

- [ ] **Step 1: Replace DatosQueremos.tsx**

Overwrite `src/pages/DatosQueremos.tsx` entirely:

```typescript
import { useState } from 'react'
import { Layout } from '../components/Layout'
import { useEvolucionStats } from '../hooks/useEvolucionStats'
import type { SemanaStats } from '../types'

const AGENDA_CFG = {
  tecnologica: { color: '#0C447C', bar: '#378ADD', label: 'Agenda Tecnológica' },
  datos:       { color: '#3C3489', bar: '#7F77DD', label: 'Agenda de Datos' },
  genero:      { color: '#72243E', bar: '#D4537E', label: 'Agenda de Género' },
} as const

type AgendaKey = keyof typeof AGENDA_CFG

// ── MetricaCard ──────────────────────────────────────────────────────────────

function MetricaCard({ eyebrow, num, numColor, sub }: {
  eyebrow: string; num: number | string; numColor: string; sub: string
}) {
  return (
    <div className="evolucion-card">
      <div className="evolucion-card-eyebrow">{eyebrow}</div>
      <div className="evolucion-card-num" style={{ color: numColor }}>{num}</div>
      <div className="evolucion-card-delta delta-neu">{sub}</div>
    </div>
  )
}

// ── StackedWeekChart ─────────────────────────────────────────────────────────

function StackedWeekChart({ semanas, selectedIdx }: { semanas: SemanaStats[]; selectedIdx: number }) {
  const maxNuevas = Math.max(...semanas.map(s => s.nuevas), 1)

  return (
    <div className="chart-section">
      <div className="chart-title">Preguntas nuevas por semana — distribución por severidad de brecha</div>
      <div className="chart-bars">
        {semanas.map((s, i) => {
          const isSelected = i === selectedIdx
          const opacity = isSelected ? 1 : i < selectedIdx ? 0.45 : 0.15
          const totalH = 90
          const scale = s.nuevas / maxNuevas
          const critH = Math.round((s.criticas  / (s.nuevas || 1)) * totalH * scale)
          const parcH = Math.round((s.parciales / (s.nuevas || 1)) * totalH * scale)
          const cubH  = Math.round((s.cubiertas / (s.nuevas || 1)) * totalH * scale)

          return (
            <div key={s.isoWeek} className="stack-bar-group" style={{ opacity }}>
              <div className="stack-bar" style={{ height: totalH * scale }}>
                <div className="stack-segment" style={{ height: cubH,  background: 'var(--gap-cov)' }} />
                <div className="stack-segment" style={{ height: parcH, background: 'var(--gap-part)' }} />
                <div className="stack-segment" style={{ height: critH, background: 'var(--gap-crit)' }} />
              </div>
              <div className="chart-bar-label" style={{ fontWeight: isSelected ? 600 : 400 }}>
                {s.label.replace('Sem. ', 'S')}
              </div>
            </div>
          )
        })}
      </div>
      <div className="chart-legend">
        {[
          { label: 'Brecha crítica', color: 'var(--gap-crit)' },
          { label: 'Brecha parcial', color: 'var(--gap-part)' },
          { label: 'Bien cubierta',  color: 'var(--gap-cov)' },
        ].map(l => (
          <div key={l.label} className="chart-legend-item">
            <div className="chart-legend-dot" style={{ background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── AgendaDemandCard ──────────────────────────────────────────────────────────

function AgendaDemandCard({ agKey, sem, baseline }: {
  agKey: AgendaKey; sem: SemanaStats; baseline: { score: number }
}) {
  const cfg = AGENDA_CFG[agKey]
  const ag = sem.por_agenda[agKey]
  const baseScore = Math.round(baseline.score * 100)

  return (
    <div className="agenda-evol-card" style={{ borderLeftColor: cfg.bar }}>
      <div className="agenda-evol-header">
        <div>
          <div className="agenda-evol-title" style={{ color: cfg.color }}>{cfg.label}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-mid)', marginTop: 2 }}>
            Score promedio brecha: <strong>{Math.round(ag.score_avg * 100)}%</strong>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-light)' }}>
          {ag.nuevas} preguntas esta semana
        </div>
      </div>
      <div className="agenda-evol-bars">
        <div>
          <div className="evol-bar-label">Cobertura inicial del corpus</div>
          <div className="evol-bar-track">
            <div className="evol-bar-fill" style={{ width: `${baseScore}%`, background: 'var(--ink-mid)', opacity: 0.4 }} />
          </div>
          <div className="evol-bar-pct">{baseScore}% brecha base</div>
        </div>
        <div>
          <div className="evol-bar-label">Demanda observada ({sem.label})</div>
          <div className="evol-bar-track">
            <div className="evol-bar-fill" style={{ width: `${Math.round(ag.score_avg * 100)}%`, background: cfg.bar }} />
          </div>
          <div className="evol-bar-pct">{Math.round(ag.score_avg * 100)}% en preguntas</div>
        </div>
      </div>
    </div>
  )
}

// ── DatosQueremos ─────────────────────────────────────────────────────────────

export function DatosQueremos() {
  const { semanas, topTemas, baseline, isReady, error } = useEvolucionStats()
  const [selectedIdx, setSelectedIdx] = useState(0)

  const selected = semanas[selectedIdx]
  const totalAcumuladas = semanas.at(-1)?.acumuladas ?? 0
  const maxTopTema = topTemas[0]?.count ?? 1

  return (
    <Layout>
      <main className="datos-page">
        <div className="hero">
          <p className="hero-eyebrow">¿Qué queremos?</p>
          <h1>La demanda <em>revelada</em> por las preguntas</h1>
          <p className="hero-sub">
            {isReady
              ? `${totalAcumuladas} preguntas ingresadas · demanda semanal de datos faltantes`
              : 'Cargando demanda…'}
          </p>
        </div>

        {error && (
          <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--warn)', marginBottom: '1rem' }}>
            {error}
          </p>
        )}

        {semanas.length === 0 && isReady && (
          <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-light)' }}>
            — Aún no hay preguntas ingresadas —
          </p>
        )}

        {semanas.length > 0 && (
          <>
            <div className="semana-tabs">
              {semanas.map((s, i) => (
                <button
                  key={s.isoWeek}
                  className={`semana-tab${selectedIdx === i ? ' active' : ''}`}
                  onClick={() => setSelectedIdx(i)}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="metricas-compare">
              <div>
                <div className="metricas-col-label">Estado inicial del corpus</div>
                <MetricaCard eyebrow="Score brecha base" num={`${Math.round(baseline.score * 100)}%`} numColor="var(--ink)" sub="Antes de cualquier pregunta" />
                <MetricaCard eyebrow="Tópicos críticos" num={baseline.criticas} numColor="var(--gap-crit)" sub="Sin cobertura en el corpus" />
                <MetricaCard eyebrow="Tópicos parciales" num={baseline.parciales} numColor="var(--gap-part)" sub={`${baseline.cubiertas} bien cubiertos`} />
              </div>
              {selected && (
                <div>
                  <div className="metricas-col-label">{selected.label}</div>
                  <MetricaCard eyebrow="Preguntas acumuladas" num={selected.acumuladas} numColor="var(--ink)" sub={`+${selected.nuevas} esta semana`} />
                  <MetricaCard eyebrow="Brechas críticas reveladas" num={selected.criticas} numColor="var(--gap-crit)" sub={`${selected.parciales} parciales · ${selected.cubiertas} cubiertas`} />
                  <MetricaCard eyebrow="Score promedio de brecha" num={`${Math.round(selected.score_promedio * 100)}%`} numColor="var(--gap-part)" sub="En preguntas de esta semana" />
                </div>
              )}
            </div>

            <StackedWeekChart semanas={semanas} selectedIdx={selectedIdx} />

            {topTemas.length > 0 && (
              <>
                <p className="mapa-section-title">Temas más demandados</p>
                <p style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-light)', marginBottom: '1rem' }}>
                  Subtemas de los datasets encontrados al responder preguntas — lo más buscado revela lo más faltante.
                </p>
                <div className="top-temas-list">
                  {topTemas.map((t, i) => (
                    <div key={t.subtema} className="top-tema-row">
                      <span className="top-tema-rank">#{i + 1}</span>
                      <span className="top-tema-name">{t.subtema}</span>
                      <div className="top-tema-bar-wrap">
                        <div className="top-tema-bar-fill" style={{ width: `${Math.round((t.count / maxTopTema) * 100)}%` }} />
                      </div>
                      <span className="top-tema-count">{t.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {selected && (
              <div className="agenda-evol-list" style={{ marginTop: '2rem' }}>
                {(['tecnologica', 'datos', 'genero'] as AgendaKey[]).map(ag => (
                  <AgendaDemandCard key={ag} agKey={ag} sem={selected} baseline={baseline} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </Layout>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/DatosQueremos.tsx
git commit -m "feat: rewrite DatosQueremos with real demand-side metrics"
```

---

### Task 7: Delete old static data files and run full verification

**Files:**
- Delete: `src/data/monitorData.ts`
- Delete: `src/data/evolucionData.ts`
- Delete: `src/hooks/useMonitorData.ts`
- Delete: `src/test/monitorData.test.ts`
- Delete: `src/test/useMonitorData.test.ts`

- [ ] **Step 1: Delete the old files**

```bash
rm src/data/monitorData.ts
rm src/data/evolucionData.ts
rm src/hooks/useMonitorData.ts
rm src/test/monitorData.test.ts
rm src/test/useMonitorData.test.ts
```

- [ ] **Step 2: Verify TypeScript compiles with no leftover references**

```bash
npx tsc --noEmit
```

Expected: no errors. If you see `Cannot find module '../data/monitorData'` or similar, search for and remove any remaining import:

```bash
grep -r "monitorData\|evolucionData\|useMonitorData" src/ --include="*.ts" --include="*.tsx"
```

Expected: no output (no remaining references).

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass. Count should be previous total minus 7 deleted tests plus 10 new = net +3 from baseline of 55.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old static monitorData, evolucionData, useMonitorData"
```

- [ ] **Step 5: Start dev server and verify pages visually**

```bash
npm run dev
```

Open `http://localhost:5173/colectivo`:
- Hero shows real dataset + normativa counts (not "cargando…" for more than 2s)
- 3 AgendaCards: lead with dataset count, show quality bar (Completa/Parcial/Nula), list top subtemas, end with pregunta count as context
- 5 TopicCards: large colored percentage as primary metric, "brecha crítica/parcial/bien cubierto" label, dataset/normativa/pregunta counts underneath

Open `http://localhost:5173/datos`:
- Hero shows real total pregunta count
- Week tabs appear (one per ISO week present in the data)
- Left column: baseline corpus stats
- Right column: selected week demand stats
- Stacked bar chart: bars per week colored by severity
- Top temas ranked list with proportional bars
- 3 Agenda demand cards with dual progress bars (base vs. semana)

- [ ] **Step 6: Final commit if any visual fixes were needed**

```bash
git status
# if changes:
git add -p
git commit -m "fix: visual corrections after Phase 3 real-metrics verification"
```
