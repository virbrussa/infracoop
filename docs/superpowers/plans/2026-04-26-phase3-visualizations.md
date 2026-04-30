# Phase 3 — Visualizations: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar las dos páginas de visualización: `MonitorColectivo` (mapa colectivo de brechas por agenda y tópico) y `DatosQueremos` (evolución semanal de brechas con gráfico de barras y comparativa estado-inicial vs. semana actual).

**Architecture:** Dos páginas independientes que consumen datos de Supabase vía hooks existentes (`usePreguntas`) y datos mock con forma idéntica a la producción futura. `MonitorColectivo` muestra tres AgendaCards + un grid de MapaCards (uno por tópico). `DatosQueremos` muestra un gráfico de barras de evolución semanal + tarjetas métricas comparativas + AgendaEvol cards. Toda la lógica de datos vive en hooks o archivos de datos; los componentes solo renderizan.

**Tech Stack:** React + TypeScript, CSS custom properties del design system existente, Vitest + @testing-library/react para tests.

---

## File Map

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `src/data/monitorData.ts` | Crear | Datos mock de AGENDA_MONITOR y MAPA; tipos `AgendaMonitor`, `MapaTopic` |
| `src/data/evolucionData.ts` | Crear | Datos mock de EVOLUCION_MOCK; tipos `SemanaSnapshot`, `AgendaEvolucion` |
| `src/hooks/useMonitorData.ts` | Crear | Agrega preguntas reales de Supabase sobre los datos mock de monitor |
| `src/pages/MonitorColectivo.tsx` | Reemplazar | AgendaCards + MapaGrid — layout de mapa colectivo |
| `src/pages/DatosQueremos.tsx` | Reemplazar | SemanaSelector + MetricasCompare + EvolucionChart + AgendaEvolCards |
| `src/styles/app.css` | Modificar | Clases CSS para ambas páginas |
| `src/test/monitorData.test.ts` | Crear | Tests de tipos y estructura de datos |
| `src/test/useMonitorData.test.ts` | Crear | Tests del hook de agregación |

---

### Task 1: Tipos y datos mock — monitorData.ts

**Files:**
- Create: `src/data/monitorData.ts`
- Create: `src/test/monitorData.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/test/monitorData.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { AGENDA_MONITOR, MAPA_TOPICS } from '../data/monitorData'

describe('AGENDA_MONITOR', () => {
  it('tiene exactamente 3 agendas', () => {
    expect(AGENDA_MONITOR).toHaveLength(3)
  })

  it('cada agenda tiene id, label, color, barColor, total, preguntas_semana y topicos', () => {
    for (const a of AGENDA_MONITOR) {
      expect(a).toHaveProperty('id')
      expect(a).toHaveProperty('label')
      expect(a).toHaveProperty('color')
      expect(a).toHaveProperty('barColor')
      expect(a).toHaveProperty('total')
      expect(a).toHaveProperty('preguntas_semana')
      expect(a.topicos).toHaveLength(3)
    }
  })
})

describe('MAPA_TOPICS', () => {
  it('tiene exactamente 5 tópicos', () => {
    expect(MAPA_TOPICS).toHaveLength(5)
  })

  it('cada tópico tiene topic, total, score, criticas, parciales, cubiertas', () => {
    for (const t of MAPA_TOPICS) {
      expect(t).toHaveProperty('topic')
      expect(t).toHaveProperty('total')
      expect(typeof t.score).toBe('number')
      expect(t.score).toBeGreaterThanOrEqual(0)
      expect(t.score).toBeLessThanOrEqual(1)
      expect(t.criticas + t.parciales + t.cubiertas).toBe(t.total)
    }
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
npx vitest run src/test/monitorData.test.ts
```

Expected: FAIL — `Cannot find module '../data/monitorData'`

- [ ] **Step 3: Implementar monitorData.ts**

Crear `src/data/monitorData.ts`:

```typescript
export interface AgendaTopico {
  nombre: string
  count: number
}

export interface AgendaMonitor {
  id: 'tecnologica' | 'datos' | 'genero'
  label: string
  color: string
  colorBg: string
  barColor: string
  total: number
  preguntas_semana: number
  topicos: [AgendaTopico, AgendaTopico, AgendaTopico]
}

export interface MapaTopic {
  topic: string
  total: number
  score: number
  criticas: number
  parciales: number
  cubiertas: number
}

export const AGENDA_MONITOR: AgendaMonitor[] = [
  {
    id: 'tecnologica', label: 'Agenda Tecnológica',
    color: '#0C447C', colorBg: '#E6F1FB', barColor: '#378ADD',
    total: 34, preguntas_semana: 8,
    topicos: [
      { nombre: 'Brecha digital', count: 14 },
      { nombre: 'IA y sesgos', count: 11 },
      { nombre: 'Acceso a internet', count: 9 },
    ],
  },
  {
    id: 'datos', label: 'Agenda de Datos',
    color: '#3C3489', colorBg: '#EEEDFE', barColor: '#7F77DD',
    total: 51, preguntas_semana: 13,
    topicos: [
      { nombre: 'Calidad estadística', count: 19 },
      { nombre: 'Datos abiertos', count: 18 },
      { nombre: 'Marcos normativos', count: 14 },
    ],
  },
  {
    id: 'genero', label: 'Agenda de Género',
    color: '#72243E', colorBg: '#FBEAF0', barColor: '#D4537E',
    total: 81, preguntas_semana: 21,
    topicos: [
      { nombre: 'Salud reproductiva', count: 31 },
      { nombre: 'Violencia de género', count: 27 },
      { nombre: 'Justicia y litigios', count: 23 },
    ],
  },
]

export const MAPA_TOPICS: MapaTopic[] = [
  { topic: 'Salud reproductiva',   total: 48, score: 0.79, criticas: 31, parciales: 12, cubiertas: 5 },
  { topic: 'Violencia de género',  total: 35, score: 0.65, criticas: 19, parciales: 14, cubiertas: 2 },
  { topic: 'Justicia y litigios',  total: 22, score: 0.71, criticas: 14, parciales:  7, cubiertas: 1 },
  { topic: 'Interseccionalidad',   total: 18, score: 0.83, criticas: 15, parciales:  3, cubiertas: 0 },
  { topic: 'Tecnologías y datos',  total: 11, score: 0.58, criticas:  5, parciales:  6, cubiertas: 0 },
]
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

```bash
npx vitest run src/test/monitorData.test.ts
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/data/monitorData.ts src/test/monitorData.test.ts
git commit -m "feat: add monitorData with AgendaMonitor and MapaTopic mock data"
```

---

### Task 2: Tipos y datos mock — evolucionData.ts

**Files:**
- Create: `src/data/evolucionData.ts`

- [ ] **Step 1: Crear evolucionData.ts**

Crear `src/data/evolucionData.ts`:

```typescript
export interface AgendaEvolucion {
  score: number
  criticas: number
  nuevas: number
}

export interface SemanaSnapshot {
  semana: number
  label: string
  total_preguntas: number
  brechas_criticas: number
  brechas_parciales: number
  brechas_cubiertas: number
  agendas: {
    tecnologica: AgendaEvolucion
    datos: AgendaEvolucion
    genero: AgendaEvolucion
  }
}

export const EVOLUCION_MOCK: SemanaSnapshot[] = [
  {
    semana: 0, label: 'Estado inicial', total_preguntas: 0,
    brechas_criticas: 42, brechas_parciales: 28, brechas_cubiertas: 8,
    agendas: {
      tecnologica: { score: 68, criticas: 12, nuevas:  0 },
      datos:       { score: 71, criticas: 17, nuevas:  0 },
      genero:      { score: 79, criticas: 13, nuevas:  0 },
    },
  },
  {
    semana: 1, label: 'Semana 1', total_preguntas: 18,
    brechas_criticas: 47, brechas_parciales: 31, brechas_cubiertas: 8,
    agendas: {
      tecnologica: { score: 70, criticas: 14, nuevas:  8 },
      datos:       { score: 73, criticas: 19, nuevas: 13 },
      genero:      { score: 81, criticas: 14, nuevas: 21 },
    },
  },
  {
    semana: 2, label: 'Semana 2', total_preguntas: 39,
    brechas_criticas: 54, brechas_parciales: 35, brechas_cubiertas: 9,
    agendas: {
      tecnologica: { score: 72, criticas: 16, nuevas: 12 },
      datos:       { score: 75, criticas: 22, nuevas: 19 },
      genero:      { score: 83, criticas: 16, nuevas: 34 },
    },
  },
  {
    semana: 3, label: 'Semana 3', total_preguntas: 62,
    brechas_criticas: 61, brechas_parciales: 38, brechas_cubiertas: 10,
    agendas: {
      tecnologica: { score: 69, criticas: 18, nuevas: 20 },
      datos:       { score: 74, criticas: 24, nuevas: 28 },
      genero:      { score: 85, criticas: 19, nuevas: 42 },
    },
  },
  {
    semana: 4, label: 'Semana 4', total_preguntas: 90,
    brechas_criticas: 71, brechas_parciales: 44, brechas_cubiertas: 11,
    agendas: {
      tecnologica: { score: 71, criticas: 21, nuevas: 34 },
      datos:       { score: 76, criticas: 28, nuevas: 51 },
      genero:      { score: 87, criticas: 22, nuevas: 81 },
    },
  },
]
```

- [ ] **Step 2: Verificar que compila**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/data/evolucionData.ts
git commit -m "feat: add evolucionData with SemanaSnapshot mock data"
```

---

### Task 3: useMonitorData hook (TDD)

**Files:**
- Create: `src/hooks/useMonitorData.ts`
- Create: `src/test/useMonitorData.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/test/useMonitorData.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useMonitorData } from '../hooks/useMonitorData'

vi.mock('../services/dataService', () => ({
  getPreguntas: vi.fn().mockResolvedValue([
    { id: 'p1', texto: 'test', fecha: '2026-04-26T10:00:00Z',
      agenda_clasificada: 'genero', resultado_score: 0.8,
      datasets_encontrados: [], es_sintetico: false },
    { id: 'p2', texto: 'test2', fecha: '2026-04-26T11:00:00Z',
      agenda_clasificada: 'datos', resultado_score: 0.5,
      datasets_encontrados: [], es_sintetico: false },
  ]),
}))

describe('useMonitorData', () => {
  it('retorna agendas y tópicos de los datos mock', async () => {
    const { result } = renderHook(() => useMonitorData())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.agendas).toHaveLength(3)
    expect(result.current.topics).toHaveLength(5)
  })

  it('totalPreguntas incluye las preguntas cargadas de Supabase', async () => {
    const { result } = renderHook(() => useMonitorData())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.totalPreguntas).toBeGreaterThan(0)
  })

  it('error es null cuando todo está bien', async () => {
    const { result } = renderHook(() => useMonitorData())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.error).toBeNull()
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
npx vitest run src/test/useMonitorData.test.ts
```

Expected: FAIL — `Cannot find module '../hooks/useMonitorData'`

- [ ] **Step 3: Implementar useMonitorData.ts**

Crear `src/hooks/useMonitorData.ts`:

```typescript
import { useState, useEffect } from 'react'
import { getPreguntas } from '../services/dataService'
import { AGENDA_MONITOR, MAPA_TOPICS, type AgendaMonitor, type MapaTopic } from '../data/monitorData'

interface MonitorDataState {
  agendas: AgendaMonitor[]
  topics: MapaTopic[]
  totalPreguntas: number
  isReady: boolean
  error: string | null
}

export function useMonitorData(): MonitorDataState {
  const [state, setState] = useState<MonitorDataState>({
    agendas: AGENDA_MONITOR,
    topics: MAPA_TOPICS,
    totalPreguntas: 0,
    isReady: false,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    getPreguntas()
      .then(preguntas => {
        if (cancelled) return
        setState({
          agendas: AGENDA_MONITOR,
          topics: MAPA_TOPICS,
          totalPreguntas: preguntas.length,
          isReady: true,
          error: null,
        })
      })
      .catch(err => {
        if (cancelled) return
        setState(s => ({
          ...s,
          totalPreguntas: 0,
          isReady: true,
          error: err instanceof Error ? err.message : 'Error al cargar datos',
        }))
      })

    return () => { cancelled = true }
  }, [])

  return state
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

```bash
npx vitest run src/test/useMonitorData.test.ts
```

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMonitorData.ts src/test/useMonitorData.test.ts
git commit -m "feat: add useMonitorData hook with Supabase question count"
```

---

### Task 4: CSS para ambas páginas

**Files:**
- Modify: `src/styles/app.css`

- [ ] **Step 1: Agregar clases CSS al final de app.css**

Abrir `src/styles/app.css` y agregar al final:

```css
/* ═══ Monitor Colectivo ═══ */

.monitor-page { min-height: 100vh; }

.monitor-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 2.5rem;
}

.agenda-monitor-card {
  background: var(--surface);
  border: 1px solid var(--ink-faint);
  border-radius: var(--r-lg);
  padding: 1.1rem 1.25rem;
  border-top-width: 3px;
}

.agenda-monitor-eyebrow {
  font-family: var(--mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .08em;
  margin-bottom: 6px;
}

.agenda-monitor-total {
  font-family: var(--serif);
  font-size: 48px;
  line-height: 1;
  letter-spacing: -0.03em;
}

.agenda-monitor-label {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-light);
  margin-top: 2px;
  margin-bottom: 12px;
}

.agenda-topic-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.agenda-topic-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.agenda-topic-name {
  color: var(--ink-mid);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agenda-topic-bar-wrap {
  width: 60px;
  height: 3px;
  background: var(--ink-faint);
  border-radius: 2px;
  overflow: hidden;
  flex-shrink: 0;
}

.agenda-topic-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.agenda-topic-count {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-light);
  min-width: 20px;
  text-align: right;
}

.mapa-section-title {
  font-family: var(--mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--ink-light);
  margin-bottom: 12px;
}

.mapa-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.mapa-card {
  background: var(--surface);
  border: 1px solid var(--ink-faint);
  border-radius: var(--r);
  padding: 1rem;
  transition: border-color .15s, transform .15s;
}

.mapa-card:hover {
  border-color: var(--ink);
  transform: translateY(-2px);
}

.mapa-card-topic {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 6px;
}

.mapa-card-count {
  font-family: var(--serif);
  font-size: 28px;
  line-height: 1;
  margin-bottom: 4px;
}

.mapa-card-label {
  font-size: 11px;
  font-family: var(--mono);
  color: var(--ink-light);
  margin-bottom: 10px;
}

.mapa-mini-bar {
  height: 3px;
  background: var(--ink-faint);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 8px;
}

.mapa-mini-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.mapa-card-breakdown {
  display: flex;
  gap: 8px;
  font-size: 11px;
  font-family: var(--mono);
  color: var(--ink-light);
  flex-wrap: wrap;
}

/* ═══ DatosQueremos ═══ */

.datos-page { min-height: 100vh; }

.semana-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.semana-tab {
  font-size: 11px;
  font-family: var(--mono);
  padding: 5px 12px;
  border-radius: 20px;
  border: 1px solid var(--ink-faint);
  cursor: pointer;
  background: white;
  color: var(--ink-mid);
  transition: all .15s;
}

.semana-tab:hover { border-color: var(--ink); color: var(--ink); }
.semana-tab.active { background: var(--ink); color: var(--paper); border-color: var(--ink); }

.metricas-compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
}

.metricas-col-label {
  font-family: var(--mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--ink-light);
  margin-bottom: 8px;
}

.evolucion-card {
  background: var(--surface);
  border: 1px solid var(--ink-faint);
  border-radius: var(--r);
  padding: 10px 14px;
  margin-bottom: 8px;
}

.evolucion-card-eyebrow {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--ink-light);
  text-transform: uppercase;
  letter-spacing: .06em;
  margin-bottom: 4px;
}

.evolucion-card-num {
  font-family: var(--serif);
  font-size: 32px;
  line-height: 1;
  letter-spacing: -0.03em;
}

.evolucion-card-delta {
  font-family: var(--mono);
  font-size: 11px;
  margin-top: 3px;
}

.delta-pos { color: var(--gap-crit); }
.delta-neu { color: var(--ink-light); }

/* Gráfico de barras de evolución */
.chart-section {
  background: var(--surface);
  border: 1px solid var(--ink-faint);
  border-radius: var(--r-lg);
  padding: 1.25rem 1.5rem 1rem;
  margin-bottom: 2rem;
}

.chart-title {
  font-family: var(--mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--ink-light);
  margin-bottom: 1.25rem;
}

.chart-bars {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  height: 100px;
}

.chart-bar-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  flex: 1;
  height: 100%;
  justify-content: flex-end;
  transition: opacity 0.3s;
}

.chart-bar-row {
  display: flex;
  gap: 3px;
  align-items: flex-end;
  width: 100%;
  justify-content: center;
}

.chart-bar {
  width: 8px;
  border-radius: 3px 3px 0 0;
  transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 2px;
}

.chart-bar-label {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--ink-light);
  text-align: center;
  white-space: nowrap;
}

.chart-legend {
  display: flex;
  gap: 1rem;
  margin-top: 10px;
  flex-wrap: wrap;
}

.chart-legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: var(--mono);
  font-size: 10px;
  color: var(--ink-mid);
}

.chart-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* AgendaEvol cards */
.agenda-evol-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.agenda-evol-card {
  background: var(--surface);
  border: 1px solid var(--ink-faint);
  border-radius: var(--r-lg);
  padding: 1rem 1.25rem;
  border-left-width: 3px;
}

.agenda-evol-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 10px;
}

.agenda-evol-title {
  font-weight: 600;
  font-size: 14px;
}

.agenda-evol-badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.semana-badge {
  font-size: 10px;
  font-family: var(--mono);
  padding: 2px 8px;
  border-radius: 3px;
}

.agenda-evol-stats {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--ink-mid);
  margin-bottom: 10px;
}

.agenda-evol-bars {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.evol-bar-label {
  font-size: 10px;
  font-family: var(--mono);
  color: var(--ink-light);
  margin-bottom: 3px;
}

.evol-bar-track {
  height: 6px;
  background: var(--ink-faint);
  border-radius: 3px;
  overflow: hidden;
}

.evol-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.evol-bar-pct {
  font-size: 10px;
  font-family: var(--mono);
  color: var(--ink-light);
  margin-top: 2px;
}
```

- [ ] **Step 2: Verificar que compila**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/styles/app.css
git commit -m "feat: add CSS for MonitorColectivo and DatosQueremos pages"
```

---

### Task 5: MonitorColectivo.tsx

**Files:**
- Modify: `src/pages/MonitorColectivo.tsx`

- [ ] **Step 1: Reemplazar MonitorColectivo.tsx**

Reemplazar el contenido de `src/pages/MonitorColectivo.tsx`:

```typescript
import { useMonitorData } from '../hooks/useMonitorData'
import type { AgendaMonitor, MapaTopic } from '../data/monitorData'

// ── AgendaCard ──────────────────────────────────────────────────────────────

function AgendaCard({ agenda }: { agenda: AgendaMonitor }) {
  const maxCount = Math.max(...agenda.topicos.map(t => t.count))
  return (
    <div className="agenda-monitor-card" style={{ borderTopColor: agenda.barColor }}>
      <div className="agenda-monitor-eyebrow" style={{ color: agenda.color }}>
        {agenda.label}
      </div>
      <div className="agenda-monitor-total" style={{ color: agenda.color }}>
        {agenda.total}
      </div>
      <div className="agenda-monitor-label">
        preguntas · +{agenda.preguntas_semana} esta semana
      </div>
      <div className="agenda-topic-list">
        {agenda.topicos.map(t => (
          <div key={t.nombre} className="agenda-topic-row">
            <span className="agenda-topic-name">{t.nombre}</span>
            <div className="agenda-topic-bar-wrap">
              <div
                className="agenda-topic-bar-fill"
                style={{
                  width: `${Math.round((t.count / maxCount) * 100)}%`,
                  background: agenda.barColor,
                }}
              />
            </div>
            <span className="agenda-topic-count">{t.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── MapaCard ────────────────────────────────────────────────────────────────

function MapaCard({ topic, maxTotal }: { topic: MapaTopic; maxTotal: number }) {
  const cat = topic.score >= 0.75 ? 'critica' : topic.score >= 0.5 ? 'parcial' : 'cubierta'
  const colors = {
    critica: 'var(--gap-crit)',
    parcial: 'var(--gap-part)',
    cubierta: 'var(--gap-cov)',
  }
  const color = colors[cat]
  return (
    <div className="mapa-card">
      <div className="mapa-card-topic">{topic.topic}</div>
      <div className="mapa-card-count" style={{ color }}>{topic.total}</div>
      <div className="mapa-card-label">preguntas sin respuesta completa</div>
      <div className="mapa-mini-bar">
        <div
          className="mapa-mini-fill"
          style={{ width: `${Math.round((topic.total / maxTotal) * 100)}%`, background: color }}
        />
      </div>
      <div className="mapa-card-breakdown">
        <span style={{ color: 'var(--gap-crit)' }}>{topic.criticas} críticas</span>
        <span style={{ color: 'var(--gap-part)' }}>{topic.parciales} parciales</span>
        <span style={{ color: 'var(--gap-cov)' }}>{topic.cubiertas} cubiertas</span>
      </div>
    </div>
  )
}

// ── MonitorColectivo ────────────────────────────────────────────────────────

export function MonitorColectivo() {
  const { agendas, topics, totalPreguntas, isReady, error } = useMonitorData()
  const maxTotal = Math.max(...topics.map(t => t.total))

  return (
    <main className="monitor-page">
      <div className="container">
        <div className="hero">
          <p className="hero-eyebrow">Monitor Colectivo</p>
          <h1>El mapa <em>colectivo</em> de brechas</h1>
          <p className="hero-sub">
            {isReady
              ? `${totalPreguntas} preguntas ingresadas · distribución por agenda y tópico`
              : 'Cargando datos…'}
          </p>
        </div>

        {error && (
          <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--warn)', marginBottom: '1rem' }}>
            {error}
          </p>
        )}

        <div className="monitor-grid">
          {agendas.map(a => <AgendaCard key={a.id} agenda={a} />)}
        </div>

        <p className="mapa-section-title">Mapa de tópicos</p>
        <div className="mapa-grid">
          {topics.map(t => <MapaCard key={t.topic} topic={t} maxTotal={maxTotal} />)}
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verificar que compila**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/pages/MonitorColectivo.tsx
git commit -m "feat: implement MonitorColectivo with AgendaCards and MapaGrid"
```

---

### Task 6: DatosQueremos.tsx

**Files:**
- Modify: `src/pages/DatosQueremos.tsx`

- [ ] **Step 1: Reemplazar DatosQueremos.tsx**

Reemplazar el contenido de `src/pages/DatosQueremos.tsx`:

```typescript
import { useState } from 'react'
import { EVOLUCION_MOCK, type SemanaSnapshot } from '../data/evolucionData'

const AGENDA_COLORS = {
  tecnologica: { color: '#0C447C', bar: '#378ADD', label: 'Agenda Tecnológica' },
  datos:       { color: '#3C3489', bar: '#7F77DD', label: 'Agenda de Datos' },
  genero:      { color: '#72243E', bar: '#D4537E', label: 'Agenda de Género' },
} as const

type AgendaKey = keyof typeof AGENDA_COLORS

// ── MetricaCard ─────────────────────────────────────────────────────────────

function MetricaCard({
  eyebrow, num, numColor, delta, deltaClass,
}: { eyebrow: string; num: number | string; numColor: string; delta: string; deltaClass: string }) {
  return (
    <div className="evolucion-card">
      <div className="evolucion-card-eyebrow">{eyebrow}</div>
      <div className="evolucion-card-num" style={{ color: numColor }}>{num}</div>
      <div className={`evolucion-card-delta ${deltaClass}`}>{delta}</div>
    </div>
  )
}

// ── EvolucionChart ───────────────────────────────────────────────────────────

function EvolucionChart({ selectedIdx }: { selectedIdx: number }) {
  return (
    <div className="chart-section">
      <div className="chart-title">Evolución semanal de brechas por agenda</div>
      <div className="chart-bars">
        {EVOLUCION_MOCK.map((sem, i) => {
          const isInitial = i === 0
          const isSelected = i === selectedIdx
          const opacity = isInitial || isSelected ? 1 : i < selectedIdx ? 0.4 : 0.15
          return (
            <div key={sem.semana} className="chart-bar-group" style={{ opacity }}>
              <div className="chart-bar-row">
                {(['tecnologica', 'datos', 'genero'] as AgendaKey[]).map(ag => (
                  <div
                    key={ag}
                    className="chart-bar"
                    style={{
                      height: `${sem.agendas[ag].score}%`,
                      background: AGENDA_COLORS[ag].bar,
                    }}
                    title={`${AGENDA_COLORS[ag].label}: ${sem.agendas[ag].score}%`}
                  />
                ))}
              </div>
              <div
                className="chart-bar-label"
                style={{ fontWeight: isInitial || isSelected ? 600 : 400 }}
              >
                {isInitial ? 'Inicial' : sem.label.replace('Semana ', 'S')}
              </div>
            </div>
          )
        })}
      </div>
      <div className="chart-legend">
        {(['tecnologica', 'datos', 'genero'] as AgendaKey[]).map(ag => (
          <div key={ag} className="chart-legend-item">
            <div className="chart-legend-dot" style={{ background: AGENDA_COLORS[ag].bar }} />
            {AGENDA_COLORS[ag].label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── AgendaEvolCard ───────────────────────────────────────────────────────────

function AgendaEvolCard({
  agendaKey, snapshot, baseSnapshot, selectedIdx,
}: {
  agendaKey: AgendaKey
  snapshot: SemanaSnapshot
  baseSnapshot: SemanaSnapshot
  selectedIdx: number
}) {
  const cfg = AGENDA_COLORS[agendaKey]
  const curr = snapshot.agendas[agendaKey]
  const base = baseSnapshot.agendas[agendaKey]
  const delta = curr.score - base.score

  return (
    <div className="agenda-evol-card" style={{ borderLeftColor: cfg.bar }}>
      <div className="agenda-evol-header">
        <div>
          <div className="agenda-evol-title" style={{ color: cfg.color }}>{cfg.label}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-mid)', marginTop: 2 }}>
            Score brecha: <strong>{curr.score}/100</strong>
            {delta !== 0 && (
              <span style={{
                fontSize: 11, fontFamily: 'var(--mono)',
                color: delta > 0 ? 'var(--gap-crit)' : 'var(--ok)',
              }}>
                {' '}({delta > 0 ? '+' : ''}{delta} vs estado inicial)
              </span>
            )}
          </div>
        </div>
        <div className="agenda-evol-badges">
          {EVOLUCION_MOCK.slice(0, selectedIdx + 1).map((sem, i) => (
            <span
              key={sem.semana}
              className="semana-badge"
              style={{
                background: i === selectedIdx ? cfg.bar : i === 0 ? 'var(--ink)' : 'var(--ink-faint)',
                color: i === selectedIdx || i === 0 ? 'white' : 'var(--ink-light)',
              }}
            >
              {i === 0 ? 'Base' : i === selectedIdx
                ? `${sem.agendas[agendaKey].score}%`
                : sem.agendas[agendaKey].score}
            </span>
          ))}
        </div>
      </div>
      <div className="agenda-evol-stats">
        <span>Brechas críticas: <strong style={{ color: 'var(--gap-crit)' }}>{curr.criticas}</strong></span>
        <span>Preguntas nuevas: <strong style={{ color: cfg.color }}>{curr.nuevas}</strong></span>
      </div>
      <div className="agenda-evol-bars">
        <div>
          <div className="evol-bar-label">Estado inicial</div>
          <div className="evol-bar-track">
            <div className="evol-bar-fill" style={{ width: `${base.score}%`, background: 'var(--ink-mid)', opacity: 0.4 }} />
          </div>
          <div className="evol-bar-pct">{base.score}%</div>
        </div>
        <div>
          <div className="evol-bar-label">{snapshot.label}</div>
          <div className="evol-bar-track">
            <div className="evol-bar-fill" style={{ width: `${curr.score}%`, background: cfg.bar }} />
          </div>
          <div className="evol-bar-pct">{curr.score}%</div>
        </div>
      </div>
    </div>
  )
}

// ── DatosQueremos ────────────────────────────────────────────────────────────

export function DatosQueremos() {
  const [selectedIdx, setSelectedIdx] = useState(1)
  const selected = EVOLUCION_MOCK[selectedIdx]
  const base = EVOLUCION_MOCK[0]
  const deltaC = selected.brechas_criticas - base.brechas_criticas

  return (
    <main className="datos-page">
      <div className="container">
        <div className="hero">
          <p className="hero-eyebrow">¿Qué datos queremos?</p>
          <h1>Los datos que <em>necesitamos</em></h1>
          <p className="hero-sub">
            Estado inicial anclado versus evolución semanal según preguntas ingresadas.
          </p>
        </div>

        <div className="semana-tabs">
          {EVOLUCION_MOCK.slice(1).map((sem, i) => (
            <button
              key={sem.semana}
              className={`semana-tab${selectedIdx === i + 1 ? ' active' : ''}`}
              onClick={() => setSelectedIdx(i + 1)}
            >
              {sem.label}
            </button>
          ))}
        </div>

        <div className="metricas-compare">
          <div>
            <div className="metricas-col-label">Estado inicial</div>
            <MetricaCard eyebrow="Preguntas ingresadas" num={0} numColor="var(--ink)" delta="Base — sin preguntas" deltaClass="delta-neu" />
            <MetricaCard eyebrow="Brechas críticas" num={base.brechas_criticas} numColor="var(--gap-crit)" delta="Estado base" deltaClass="delta-neu" />
            <MetricaCard eyebrow="Brechas parciales" num={base.brechas_parciales} numColor="var(--gap-part)" delta={`${base.brechas_cubiertas} cubiertas`} deltaClass="delta-neu" />
          </div>
          <div>
            <div className="metricas-col-label">{selected.label}</div>
            <MetricaCard eyebrow="Preguntas ingresadas" num={selected.total_preguntas} numColor="var(--ink)" delta={`+${selected.total_preguntas} desde inicio`} deltaClass="delta-pos" />
            <MetricaCard eyebrow="Brechas críticas" num={selected.brechas_criticas} numColor="var(--gap-crit)" delta={`+${deltaC} nuevas detectadas`} deltaClass={deltaC > 0 ? 'delta-pos' : 'delta-neu'} />
            <MetricaCard eyebrow="Brechas parciales" num={selected.brechas_parciales} numColor="var(--gap-part)" delta={`${selected.brechas_cubiertas} cubiertas`} deltaClass="delta-neu" />
          </div>
        </div>

        <EvolucionChart selectedIdx={selectedIdx} />

        <div className="agenda-evol-list">
          {(['tecnologica', 'datos', 'genero'] as AgendaKey[]).map(ag => (
            <AgendaEvolCard
              key={ag}
              agendaKey={ag}
              snapshot={selected}
              baseSnapshot={base}
              selectedIdx={selectedIdx}
            />
          ))}
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verificar que compila**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Ejecutar todos los tests**

```bash
npx vitest run
```

Expected: todos los tests pasan.

- [ ] **Step 4: Iniciar el servidor de desarrollo y verificar manualmente**

```bash
npm run dev
```

Navegar a `http://localhost:5173/colectivo`:
- Tres AgendaCards con colores de agenda, totales grandes, y barras de tópicos
- Grid de 5 MapaCards con scores de brecha coloreados y mini-barras

Navegar a `http://localhost:5173/datos`:
- Tabs Semana 1–4; al hacer click cambia la columna derecha
- Gráfico de barras con barras animadas; semanas pasadas semitransparentes
- Cards de agenda con barra de progreso "inicial vs. actual"

- [ ] **Step 5: Commit**

```bash
git add src/pages/DatosQueremos.tsx
git commit -m "feat: implement DatosQueremos with weekly evolution chart and agenda cards"
```

---

### Task 7: Verificación final y tests de regresión

**Files:** ninguno nuevo

- [ ] **Step 1: Ejecutar todos los tests**

```bash
npx vitest run
```

Expected: todos los tests pasan (48 anteriores + nuevos).

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit final si hay cambios sin commitear**

```bash
git status
# si hay cambios:
git add -p
git commit -m "chore: final cleanup phase 3"
```
