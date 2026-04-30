# Phase 6 — UI Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 UI issues across 3 pages: replace the week-tabs overflow in `/datos` with an ISO range selector + sidebar layout, add metrics band and tooltips to `/colectivo`, and fix similarity bars + labels in `/brechas`.

**Architecture:** All changes are pure UI — no hooks, services, or data logic is modified. `DatosQueremos` gets a `RangoSelector` sub-component and a two-column CSS layout. `MonitorColectivo` gets a metrics band and inline tooltips. `MonitorBrechas` normalizes similarity bars client-side in the render function.

**Tech Stack:** React 18, TypeScript, Vitest + Testing Library, CSS custom properties (no external UI lib)

---

## File Map

| File | Change |
|---|---|
| `src/pages/DatosQueremos.tsx` | Add `RangoSelector`, filter semanas by range, restructure to sidebar layout |
| `src/pages/MonitorColectivo.tsx` | Add `MetricsBand`, section descriptions, tooltips on AgendaCard + TopicCard |
| `src/pages/MonitorBrechas.tsx` | Normalize `similitud` bars in `ResultsColumns`, update ScorePanel labels |
| `src/styles/app.css` | Add `.datos-layout`, `.datos-sidebar`, `.datos-main`, `.metrics-band`, `.tooltip` classes |
| `src/test/DatosQueremos.test.tsx` | New: tests for RangoSelector filtering logic |
| `src/test/MonitorColectivo.test.tsx` | New: tests for MetricsBand calculations |
| `src/test/MonitorBrechas.test.tsx` | New: tests for similarity normalization |

---

## Task 1: CSS foundation

Add all new CSS classes needed by Tasks 2–4. No JS yet.

**Files:**
- Modify: `src/styles/app.css` (append at end)

- [ ] **Step 1: Append new CSS classes**

Open `src/styles/app.css` and append at the very end:

```css
/* ═══ Phase 6 — DatosQueremos layout ═══ */

.datos-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 2rem;
  align-items: start;
}

.datos-sidebar {
  position: sticky;
  top: 4.5rem; /* clears the sticky site-header (~64px) */
}

.datos-main { min-width: 0; }

@media (max-width: 767px) {
  .datos-layout {
    grid-template-columns: 1fr;
  }
  .datos-sidebar {
    position: static;
  }
}

.rango-selector {
  background: var(--surface);
  border: 1px solid var(--ink-faint);
  border-radius: var(--r);
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.rango-selector-title {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--ink-light);
  margin-bottom: .75rem;
}

.rango-row {
  display: flex;
  flex-direction: column;
  gap: .5rem;
}

.rango-row label {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-mid);
  margin-bottom: 2px;
  display: block;
}

.rango-selects {
  display: flex;
  gap: 6px;
}

.rango-select {
  font-family: var(--mono);
  font-size: 12px;
  padding: 5px 8px;
  border: 1px solid var(--ink-faint);
  border-radius: var(--r);
  background: white;
  color: var(--ink);
  cursor: pointer;
  flex: 1;
}

.rango-select:focus { outline: 2px solid var(--accent); border-color: var(--accent); }

/* ═══ Phase 6 — MonitorColectivo metrics band ═══ */

.metrics-band {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: .75rem;
  margin-bottom: 2rem;
}

@media (max-width: 600px) {
  .metrics-band { grid-template-columns: repeat(2, 1fr); }
}

.metrics-band-card {
  border: 1px solid var(--ink-faint);
  border-radius: var(--r);
  padding: .875rem 1rem;
  text-align: center;
}

.metrics-band-num {
  font-family: var(--serif);
  font-size: 2rem;
  line-height: 1;
  margin-bottom: .25rem;
}

.metrics-band-label {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--ink-light);
  text-transform: uppercase;
  letter-spacing: .04em;
}

.section-description {
  font-size: 12px;
  font-family: var(--mono);
  color: var(--ink-light);
  margin-bottom: 1rem;
  line-height: 1.6;
}

/* ═══ Phase 6 — Tooltip ═══ */

.tooltip-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tooltip-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--ink-faint);
  color: var(--ink-mid);
  font-size: 9px;
  font-family: var(--mono);
  cursor: default;
  flex-shrink: 0;
}

.tooltip-icon:hover + .tooltip-bubble,
.tooltip-icon:focus + .tooltip-bubble {
  display: block;
}

.tooltip-bubble {
  display: none;
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--ink);
  color: white;
  font-size: 11px;
  font-family: var(--sans);
  line-height: 1.5;
  padding: 6px 10px;
  border-radius: 6px;
  white-space: normal;
  width: 220px;
  z-index: 200;
  pointer-events: none;
}
```

- [ ] **Step 2: Verify no existing class names conflict**

```bash
grep -n "datos-layout\|datos-sidebar\|metrics-band\|tooltip-wrap\|rango-selector" src/styles/app.css | head -20
```

Expected: only the lines you just added.

- [ ] **Step 3: Commit**

```bash
git add src/styles/app.css
git commit -m "style: add Phase 6 CSS — datos layout, metrics band, tooltip, rango selector"
```

---

## Task 2: RangoSelector + filtering in DatosQueremos

Add the ISO week range selector and wire it to filter all stats shown on the page.

**Files:**
- Modify: `src/pages/DatosQueremos.tsx`
- Create: `src/test/DatosQueremos.test.tsx`

**Context on data shape:** `useEvolucionStats()` returns `semanas: SemanaStats[]` where each item has `isoWeek: string` (format `"2026-W17"`), `label: string`, `nuevas`, `acumuladas`, `score_promedio`, `criticas`, `parciales`, `cubiertas`, `por_agenda`. The hook does no filtering — filtering happens in the component.

- [ ] **Step 1: Write failing tests**

Create `src/test/DatosQueremos.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'

// Pure helper functions extracted from the component — test them here
// (We extract these before implementing the component changes)

function parseIsoWeek(isoWeek: string): { year: number; week: number } {
  const [year, wPart] = isoWeek.split('-W')
  return { year: Number(year), week: Number(wPart) }
}

function isoWeekToNum(isoWeek: string): number {
  const { year, week } = parseIsoWeek(isoWeek)
  return year * 100 + week
}

function filterSemanasByRange(
  semanas: { isoWeek: string }[],
  desde: string,
  hasta: string
): { isoWeek: string }[] {
  const desdeNum = isoWeekToNum(desde)
  const hastaNum = isoWeekToNum(hasta)
  return semanas.filter(s => {
    const n = isoWeekToNum(s.isoWeek)
    return n >= desdeNum && n <= hastaNum
  })
}

function deriveYears(semanas: { isoWeek: string }[]): number[] {
  const years = new Set(semanas.map(s => parseIsoWeek(s.isoWeek).year))
  return [...years].sort((a, b) => a - b)
}

function deriveWeeksForYear(semanas: { isoWeek: string }[], year: number): number[] {
  const weeks = semanas
    .filter(s => parseIsoWeek(s.isoWeek).year === year)
    .map(s => parseIsoWeek(s.isoWeek).week)
  return [...new Set(weeks)].sort((a, b) => a - b)
}

const SEMANAS = [
  { isoWeek: '2025-W01' },
  { isoWeek: '2025-W10' },
  { isoWeek: '2026-W05' },
  { isoWeek: '2026-W17' },
]

describe('filterSemanasByRange', () => {
  it('returns all semanas when range covers everything', () => {
    expect(filterSemanasByRange(SEMANAS, '2025-W01', '2026-W17')).toHaveLength(4)
  })

  it('filters to a single year', () => {
    const result = filterSemanasByRange(SEMANAS, '2025-W01', '2025-W52')
    expect(result).toHaveLength(2)
    expect(result.map(s => s.isoWeek)).toEqual(['2025-W01', '2025-W10'])
  })

  it('returns empty when desde > hasta', () => {
    expect(filterSemanasByRange(SEMANAS, '2026-W17', '2025-W01')).toHaveLength(0)
  })

  it('returns exactly one semana for exact match', () => {
    expect(filterSemanasByRange(SEMANAS, '2026-W05', '2026-W05')).toHaveLength(1)
  })
})

describe('deriveYears', () => {
  it('returns unique years sorted', () => {
    expect(deriveYears(SEMANAS)).toEqual([2025, 2026])
  })
})

describe('deriveWeeksForYear', () => {
  it('returns weeks for 2025', () => {
    expect(deriveWeeksForYear(SEMANAS, 2025)).toEqual([1, 10])
  })

  it('returns weeks for 2026', () => {
    expect(deriveWeeksForYear(SEMANAS, 2026)).toEqual([5, 17])
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- src/test/DatosQueremos.test.tsx
```

Expected: FAIL — `filterSemanasByRange is not defined` (functions not exported yet).

- [ ] **Step 3: Extract helpers and rewrite DatosQueremos.tsx**

Replace the full content of `src/pages/DatosQueremos.tsx` with:

```tsx
import { useState, useMemo } from 'react'
import { Layout } from '../components/Layout'
import { useEvolucionStats } from '../hooks/useEvolucionStats'
import type { SemanaStats } from '../types'

const AGENDA_CFG = {
  tecnologica: { color: '#0C447C', bar: '#378ADD', label: 'Agenda Tecnológica' },
  datos:       { color: '#3C3489', bar: '#7F77DD', label: 'Agenda de Datos' },
  genero:      { color: '#72243E', bar: '#D4537E', label: 'Agenda de Género' },
} as const

type AgendaKey = keyof typeof AGENDA_CFG

// ── Helpers (exported for tests) ─────────────────────────────────────────────

export function parseIsoWeek(isoWeek: string): { year: number; week: number } {
  const [year, wPart] = isoWeek.split('-W')
  return { year: Number(year), week: Number(wPart) }
}

export function isoWeekToNum(isoWeek: string): number {
  const { year, week } = parseIsoWeek(isoWeek)
  return year * 100 + week
}

export function filterSemanasByRange(
  semanas: SemanaStats[],
  desde: string,
  hasta: string
): SemanaStats[] {
  const desdeNum = isoWeekToNum(desde)
  const hastaNum = isoWeekToNum(hasta)
  return semanas.filter(s => {
    const n = isoWeekToNum(s.isoWeek)
    return n >= desdeNum && n <= hastaNum
  })
}

export function deriveYears(semanas: { isoWeek: string }[]): number[] {
  const years = new Set(semanas.map(s => parseIsoWeek(s.isoWeek).year))
  return [...years].sort((a, b) => a - b)
}

export function deriveWeeksForYear(semanas: { isoWeek: string }[], year: number): number[] {
  const weeks = semanas
    .filter(s => parseIsoWeek(s.isoWeek).year === year)
    .map(s => parseIsoWeek(s.isoWeek).week)
  return [...new Set(weeks)].sort((a, b) => a - b)
}

// ── RangoSelector ─────────────────────────────────────────────────────────────

interface IsoWeekValue { year: number; week: number }

interface RangoSelectorProps {
  semanas: SemanaStats[]
  desde: IsoWeekValue
  hasta: IsoWeekValue
  onDesdeChange: (v: IsoWeekValue) => void
  onHastaChange: (v: IsoWeekValue) => void
}

function RangoSelector({ semanas, desde, hasta, onDesdeChange, onHastaChange }: RangoSelectorProps) {
  const years = deriveYears(semanas)

  const desdeWeeks = deriveWeeksForYear(semanas, desde.year)
  const hastaWeeks = deriveWeeksForYear(semanas, hasta.year)

  function handleDesdeYear(year: number) {
    const weeks = deriveWeeksForYear(semanas, year)
    const week = weeks[0] ?? 1
    const newDesde = { year, week }
    onDesdeChange(newDesde)
    // auto-fix: if hasta < desde, bump hasta
    if (isoWeekToNum(`${hasta.year}-W${String(hasta.week).padStart(2,'0')}`) <
        isoWeekToNum(`${year}-W${String(week).padStart(2,'0')}`)) {
      onHastaChange(newDesde)
    }
  }

  function handleDesdeWeek(week: number) {
    const newDesde = { ...desde, week }
    onDesdeChange(newDesde)
    if (isoWeekToNum(`${hasta.year}-W${String(hasta.week).padStart(2,'0')}`) <
        isoWeekToNum(`${newDesde.year}-W${String(week).padStart(2,'0')}`)) {
      onHastaChange(newDesde)
    }
  }

  function handleHastaYear(year: number) {
    const weeks = deriveWeeksForYear(semanas, year)
    const week = weeks[weeks.length - 1] ?? 52
    onHastaChange({ year, week })
  }

  return (
    <div className="rango-selector">
      <div className="rango-selector-title">Rango de tiempo</div>
      <div className="rango-row">
        <div>
          <label>Desde</label>
          <div className="rango-selects">
            <select className="rango-select" value={desde.year}
              onChange={e => handleDesdeYear(Number(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="rango-select" value={desde.week}
              onChange={e => handleDesdeWeek(Number(e.target.value))}>
              {desdeWeeks.map(w => (
                <option key={w} value={w}>S{String(w).padStart(2,'0')}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label>Hasta</label>
          <div className="rango-selects">
            <select className="rango-select" value={hasta.year}
              onChange={e => handleHastaYear(Number(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="rango-select" value={hasta.week}
              onChange={e => onHastaChange({ ...hasta, week: Number(e.target.value) })}>
              {hastaWeeks.map(w => (
                <option key={w} value={w}>S{String(w).padStart(2,'0')}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MetricaCard ───────────────────────────────────────────────────────────────

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

// ── StackedWeekChart ──────────────────────────────────────────────────────────

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

  // Initialize range to full extent once data loads
  const initialDesde = useMemo(() => {
    if (semanas.length === 0) return { year: new Date().getFullYear(), week: 1 }
    const { year, week } = parseIsoWeek(semanas[0].isoWeek)
    return { year, week }
  }, [semanas.length > 0 ? semanas[0].isoWeek : ''])

  const initialHasta = useMemo(() => {
    if (semanas.length === 0) return { year: new Date().getFullYear(), week: 52 }
    const last = semanas[semanas.length - 1]
    return parseIsoWeek(last.isoWeek)
  }, [semanas.length > 0 ? semanas[semanas.length - 1].isoWeek : ''])

  const [desde, setDesde] = useState<{ year: number; week: number } | null>(null)
  const [hasta, setHasta] = useState<{ year: number; week: number } | null>(null)

  const effectiveDesde = desde ?? initialDesde
  const effectiveHasta = hasta ?? initialHasta

  const desdeStr = `${effectiveDesde.year}-W${String(effectiveDesde.week).padStart(2,'0')}`
  const hastaStr = `${effectiveHasta.year}-W${String(effectiveHasta.week).padStart(2,'0')}`

  const filteredSemanas = useMemo(
    () => filterSemanasByRange(semanas, desdeStr, hastaStr),
    [semanas, desdeStr, hastaStr]
  )

  const selectedIdx = filteredSemanas.length - 1
  const selected = filteredSemanas[selectedIdx]

  const totalAcumuladas = filteredSemanas.at(-1)?.acumuladas ?? 0
  const maxTopTema = topTemas[0]?.count ?? 1

  const sidebarMetrics = selected ? [
    { eyebrow: 'Preguntas en rango', num: totalAcumuladas, numColor: 'var(--ink)', sub: `${filteredSemanas.length} semanas` },
    { eyebrow: 'Brechas críticas', num: selected.criticas, numColor: 'var(--gap-crit)', sub: `${selected.parciales} parciales` },
    { eyebrow: 'Score promedio', num: `${Math.round(selected.score_promedio * 100)}%`, numColor: 'var(--gap-part)', sub: 'en el rango' },
  ] : []

  return (
    <Layout>
      <main className="datos-page">
        <div className="hero">
          <p className="hero-eyebrow">¿Qué queremos?</p>
          <h1>La demanda <em>revelada</em> por las preguntas</h1>
          <p className="hero-sub">
            {isReady
              ? `${totalAcumuladas} preguntas · demanda semanal de datos faltantes`
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
          <div className="datos-layout">
            {/* ── Sidebar ── */}
            <aside className="datos-sidebar">
              <RangoSelector
                semanas={semanas}
                desde={effectiveDesde}
                hasta={effectiveHasta}
                onDesdeChange={v => setDesde(v)}
                onHastaChange={v => setHasta(v)}
              />

              <div className="metricas-compare" style={{ gridTemplateColumns: '1fr', gap: '.75rem' }}>
                <div>
                  <div className="metricas-col-label">Corpus base</div>
                  <MetricaCard eyebrow="Score brecha base" num={`${Math.round(baseline.score * 100)}%`} numColor="var(--ink)" sub="Antes de cualquier pregunta" />
                  <MetricaCard eyebrow="Tópicos críticos" num={baseline.criticas} numColor="var(--gap-crit)" sub="Sin cobertura" />
                </div>
                {selected && (
                  <div style={{ marginTop: '.5rem' }}>
                    <div className="metricas-col-label">Rango seleccionado</div>
                    {sidebarMetrics.map(m => (
                      <MetricaCard key={m.eyebrow} {...m} />
                    ))}
                  </div>
                )}
              </div>

              {topTemas.length > 0 && (
                <>
                  <p className="mapa-section-title" style={{ marginTop: '1.5rem' }}>Temas más demandados</p>
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
            </aside>

            {/* ── Main content ── */}
            <div className="datos-main">
              <StackedWeekChart semanas={filteredSemanas} selectedIdx={selectedIdx} />

              {selected && (
                <div className="agenda-evol-list" style={{ marginTop: '2rem' }}>
                  {(['tecnologica', 'datos', 'genero'] as AgendaKey[]).map(ag => (
                    <AgendaDemandCard key={ag} agKey={ag} sem={selected} baseline={baseline} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </Layout>
  )
}
```

- [ ] **Step 4: Update test imports to use named exports**

In `src/test/DatosQueremos.test.tsx`, replace the inline function definitions with imports:

```tsx
import { describe, it, expect } from 'vitest'
import {
  filterSemanasByRange,
  deriveYears,
  deriveWeeksForYear,
  isoWeekToNum,
  parseIsoWeek,
} from '../pages/DatosQueremos'
import type { SemanaStats } from '../types'

const makeSemana = (isoWeek: string): SemanaStats => ({
  isoWeek, label: isoWeek, nuevas: 1, acumuladas: 1,
  score_promedio: 0.5, criticas: 0, parciales: 1, cubiertas: 0,
  por_agenda: {
    tecnologica: { nuevas: 0, score_avg: 0 },
    datos: { nuevas: 0, score_avg: 0 },
    genero: { nuevas: 1, score_avg: 0.5 },
  },
})

const SEMANAS = [
  makeSemana('2025-W01'),
  makeSemana('2025-W10'),
  makeSemana('2026-W05'),
  makeSemana('2026-W17'),
]

describe('filterSemanasByRange', () => {
  it('returns all semanas when range covers everything', () => {
    expect(filterSemanasByRange(SEMANAS, '2025-W01', '2026-W17')).toHaveLength(4)
  })

  it('filters to a single year', () => {
    const result = filterSemanasByRange(SEMANAS, '2025-W01', '2025-W52')
    expect(result).toHaveLength(2)
    expect(result.map(s => s.isoWeek)).toEqual(['2025-W01', '2025-W10'])
  })

  it('returns empty when desde > hasta', () => {
    expect(filterSemanasByRange(SEMANAS, '2026-W17', '2025-W01')).toHaveLength(0)
  })

  it('returns exactly one semana for exact match', () => {
    expect(filterSemanasByRange(SEMANAS, '2026-W05', '2026-W05')).toHaveLength(1)
  })
})

describe('deriveYears', () => {
  it('returns unique years sorted', () => {
    expect(deriveYears(SEMANAS)).toEqual([2025, 2026])
  })
})

describe('deriveWeeksForYear', () => {
  it('returns weeks for 2025', () => {
    expect(deriveWeeksForYear(SEMANAS, 2025)).toEqual([1, 10])
  })

  it('returns weeks for 2026', () => {
    expect(deriveWeeksForYear(SEMANAS, 2026)).toEqual([5, 17])
  })
})

describe('isoWeekToNum', () => {
  it('converts correctly for cross-year comparison', () => {
    expect(isoWeekToNum('2025-W52')).toBeLessThan(isoWeekToNum('2026-W01'))
  })
})
```

- [ ] **Step 5: Run tests**

```bash
npm test -- src/test/DatosQueremos.test.tsx
```

Expected: all 8 tests PASS.

- [ ] **Step 6: Run full test suite**

```bash
npm test
```

Expected: 74+ tests passing, 0 failing.

- [ ] **Step 7: Commit**

```bash
git add src/pages/DatosQueremos.tsx src/test/DatosQueremos.test.tsx
git commit -m "feat: replace semana-tabs with ISO range selector + sidebar layout in /datos"
```

---

## Task 3: MonitorColectivo — metrics band, section text, tooltips

**Files:**
- Modify: `src/pages/MonitorColectivo.tsx`
- Create: `src/test/MonitorColectivo.test.tsx`

**Context:** `useMonitorStats()` returns `{ agendas, topics, totalPreguntas, totalDatasets, totalNormativas, isReady, error }`. The metrics band uses `topics` to count criticals and calculate mean coverage. No new hook calls needed.

- [ ] **Step 1: Write failing tests**

Create `src/test/MonitorColectivo.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import type { TopicStat } from '../types'

// Pure helpers exported from MonitorColectivo
export function calcTopicsCriticas(topics: TopicStat[]): number {
  return topics.filter(t => t.categoria === 'critica').length
}

export function calcCoberturaMedia(topics: TopicStat[]): number {
  if (topics.length === 0) return 0
  const mean = topics.reduce((acc, t) => acc + t.gap_score, 0) / topics.length
  return Math.round((1 - mean) * 100)
}

const TOPICS: TopicStat[] = [
  { id: 't1', label: 'A', gap_score: 0.8, categoria: 'critica',  datasets_cubriendo: 2, normativas_cubriendo: 1, preguntas_relacionadas: 5 },
  { id: 't2', label: 'B', gap_score: 0.5, categoria: 'parcial',  datasets_cubriendo: 3, normativas_cubriendo: 2, preguntas_relacionadas: 3 },
  { id: 't3', label: 'C', gap_score: 0.2, categoria: 'cubierta', datasets_cubriendo: 5, normativas_cubriendo: 3, preguntas_relacionadas: 1 },
]

describe('calcTopicsCriticas', () => {
  it('counts only critica topics', () => {
    expect(calcTopicsCriticas(TOPICS)).toBe(1)
  })

  it('returns 0 for empty array', () => {
    expect(calcTopicsCriticas([])).toBe(0)
  })
})

describe('calcCoberturaMedia', () => {
  it('calculates inverted mean gap score as percentage', () => {
    // mean gap = (0.8 + 0.5 + 0.2) / 3 = 0.5 → cobertura = 50%
    expect(calcCoberturaMedia(TOPICS)).toBe(50)
  })

  it('returns 0 for empty array', () => {
    expect(calcCoberturaMedia([])).toBe(0)
  })

  it('returns 100 for all-zero gap scores', () => {
    const covered = TOPICS.map(t => ({ ...t, gap_score: 0 }))
    expect(calcCoberturaMedia(covered)).toBe(100)
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

```bash
npm test -- src/test/MonitorColectivo.test.tsx
```

Expected: FAIL — functions not exported.

- [ ] **Step 3: Rewrite MonitorColectivo.tsx**

Replace full content of `src/pages/MonitorColectivo.tsx`:

```tsx
import { Layout } from '../components/Layout'
import { useMonitorStats } from '../hooks/useMonitorStats'
import type { AgendaStat, TopicStat } from '../types'

// ── Helpers (exported for tests) ─────────────────────────────────────────────

export function calcTopicsCriticas(topics: TopicStat[]): number {
  return topics.filter(t => t.categoria === 'critica').length
}

export function calcCoberturaMedia(topics: TopicStat[]): number {
  if (topics.length === 0) return 0
  const mean = topics.reduce((acc, t) => acc + t.gap_score, 0) / topics.length
  return Math.round((1 - mean) * 100)
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function Tooltip({ text }: { text: string }) {
  return (
    <span className="tooltip-wrap">
      <span className="tooltip-icon" tabIndex={0}>i</span>
      <span className="tooltip-bubble">{text}</span>
    </span>
  )
}

// ── MetricsBand ───────────────────────────────────────────────────────────────

function MetricsBand({ totalDatasets, totalNormativas, topics }: {
  totalDatasets: number
  totalNormativas: number
  topics: TopicStat[]
}) {
  const criticas = calcTopicsCriticas(topics)
  const cobertura = calcCoberturaMedia(topics)

  return (
    <div className="metrics-band">
      <div className="metrics-band-card">
        <div className="metrics-band-num">{totalDatasets + totalNormativas}</div>
        <div className="metrics-band-label">total entradas</div>
      </div>
      <div className="metrics-band-card">
        <div className="metrics-band-num">3</div>
        <div className="metrics-band-label">agendas activas</div>
      </div>
      <div className="metrics-band-card">
        <div className="metrics-band-num" style={{ color: criticas > 0 ? 'var(--gap-crit)' : 'var(--gap-cov)' }}>
          {criticas}
        </div>
        <div className="metrics-band-label">tópicos críticos</div>
      </div>
      <div className="metrics-band-card">
        <div className="metrics-band-num" style={{ color: cobertura >= 50 ? 'var(--gap-cov)' : 'var(--gap-crit)' }}>
          {cobertura}%
        </div>
        <div className="metrics-band-label">cobertura media</div>
      </div>
    </div>
  )
}

// ── AgendaCard ────────────────────────────────────────────────────────────────

function AgendaCard({ a }: { a: AgendaStat }) {
  const totalCalidad = a.calidad_dist.Completa + a.calidad_dist.Parcial + a.calidad_dist.Nula || 1
  const pct = (n: number) => `${Math.round((n / totalCalidad) * 100)}%`

  return (
    <div className="agenda-monitor-card" style={{ borderTopColor: a.barColor, color: a.color }}>
      <div className="agenda-monitor-eyebrow" style={{ color: a.color }}>{a.label}</div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <div className="agenda-monitor-total" style={{ color: a.color }}>{a.datasets_en_agenda}</div>
        <Tooltip text="Datasets clasificados bajo esta agenda en el corpus. Incluye todos los datasets independientemente de su calidad." />
      </div>
      <div className="agenda-monitor-label" style={{ color: 'var(--ink-light)' }}>datasets disponibles en esta agenda</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <div className="calidad-bar" style={{ flex: 1 }}>
          <div className="calidad-segment" style={{ width: pct(a.calidad_dist.Completa), background: 'var(--gap-cov)' }} />
          <div className="calidad-segment" style={{ width: pct(a.calidad_dist.Parcial),  background: 'var(--gap-part)' }} />
          <div className="calidad-segment" style={{ width: pct(a.calidad_dist.Nula),     background: 'var(--ink-faint)' }} />
        </div>
        <Tooltip text="Calidad de los metadatos: Completa = todos los campos requeridos presentes. Parcial = faltan algunos campos. Nula = sin metadatos." />
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

// ── TopicCard ─────────────────────────────────────────────────────────────────

function TopicCard({ t }: { t: TopicStat }) {
  const colors = { critica: 'var(--gap-crit)', parcial: 'var(--gap-part)', cubierta: 'var(--gap-cov)' }
  const labels = { critica: 'brecha crítica', parcial: 'brecha parcial', cubierta: 'bien cubierto' }
  const color = colors[t.categoria]

  return (
    <div className="topic-card">
      <div className="topic-card-label">{t.label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <div className="topic-score-big" style={{ color }}>{Math.round(t.gap_score * 100)}%</div>
        <Tooltip text="Score de brecha: 0% = tópico bien cubierto en el corpus. 100% = brecha crítica, pocos o ningún dato disponible." />
      </div>
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

        {isReady && (
          <MetricsBand
            totalDatasets={totalDatasets}
            totalNormativas={totalNormativas}
            topics={topics}
          />
        )}

        <p className="mapa-section-title">Cobertura por agenda</p>
        <p className="section-description">
          Cada agenda agrupa los datasets según el marco temático al que pertenecen.
          La barra de calidad indica qué porcentaje de los datasets tiene metadatos completos, parciales o nulos.
        </p>
        <div className="monitor-grid">
          {agendas.map(a => <AgendaCard key={a.id} a={a} />)}
        </div>

        <p className="mapa-section-title">Cobertura por tópico</p>
        <p className="section-description">
          El score de brecha mide qué tan cubierto está cada tópico en el corpus — mayor % = menos cubierto.
          0% = completamente cubierto · 100% = brecha crítica sin datos.
        </p>
        <div className="mapa-grid">
          {topics.map(t => <TopicCard key={t.id} t={t} />)}
        </div>
      </main>
    </Layout>
  )
}
```

- [ ] **Step 4: Update test imports**

In `src/test/MonitorColectivo.test.tsx`, replace the inline function definitions with imports at the top:

```tsx
import { describe, it, expect } from 'vitest'
import { calcTopicsCriticas, calcCoberturaMedia } from '../pages/MonitorColectivo'
import type { TopicStat } from '../types'
```

Remove the inline `export function calcTopicsCriticas` and `export function calcCoberturaMedia` definitions — keep only the test cases.

- [ ] **Step 5: Run tests**

```bash
npm test -- src/test/MonitorColectivo.test.tsx
```

Expected: 5 tests PASS.

- [ ] **Step 6: Run full suite**

```bash
npm test
```

Expected: 79+ tests passing, 0 failing.

- [ ] **Step 7: Commit**

```bash
git add src/pages/MonitorColectivo.tsx src/test/MonitorColectivo.test.tsx
git commit -m "feat: add metrics band, section descriptions, and tooltips to Monitor Colectivo"
```

---

## Task 4: MonitorBrechas — normalized similarity bars + score labels

**Files:**
- Modify: `src/pages/MonitorBrechas.tsx`
- Create: `src/test/MonitorBrechas.test.tsx`

**Context:** `GapResult.datasets` and `GapResult.normativas` are arrays of `SearchHit`. Each `SearchHit` has `similitud: number` (raw cosine similarity, 0.0–1.0, typically very low like 0.02–0.15). The fix normalizes bar widths relative to the max in the combined dataset+normativa list. The `hit-sim-pct` label still shows the raw value.

- [ ] **Step 1: Write failing tests**

Create `src/test/MonitorBrechas.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { normalizeSimToMax } from '../pages/MonitorBrechas'

describe('normalizeSimToMax', () => {
  it('maps the highest value to 1.0', () => {
    const hits = [{ similitud: 0.12 }, { similitud: 0.08 }, { similitud: 0.04 }]
    const norm = normalizeSimToMax(hits)
    expect(norm[0]).toBeCloseTo(1.0)
  })

  it('preserves relative ordering', () => {
    const hits = [{ similitud: 0.12 }, { similitud: 0.06 }, { similitud: 0.03 }]
    const norm = normalizeSimToMax(hits)
    expect(norm[0]).toBeGreaterThan(norm[1])
    expect(norm[1]).toBeGreaterThan(norm[2])
  })

  it('scales correctly: 0.06 / 0.12 = 0.5', () => {
    const hits = [{ similitud: 0.12 }, { similitud: 0.06 }]
    const norm = normalizeSimToMax(hits)
    expect(norm[1]).toBeCloseTo(0.5)
  })

  it('handles all-zero similitudes without dividing by zero', () => {
    const hits = [{ similitud: 0 }, { similitud: 0 }]
    const norm = normalizeSimToMax(hits)
    expect(norm[0]).toBe(0)
    expect(norm[1]).toBe(0)
  })

  it('handles empty array', () => {
    expect(normalizeSimToMax([])).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

```bash
npm test -- src/test/MonitorBrechas.test.tsx
```

Expected: FAIL — `normalizeSimToMax` not exported.

- [ ] **Step 3: Rewrite MonitorBrechas.tsx**

Replace the full content of `src/pages/MonitorBrechas.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { useMotorBrechas } from '../hooks/useMotorBrechas'
import { useSearchIndex } from '../context/SearchIndexContext'
import { useEmbedder } from '../context/EmbedderContext'
import type { GapResult, SearchHit } from '../types'

const LOADING_STEPS = [
  'Buscando similitudes…',
  'Calculando score de brecha…',
  'Cruzando normativas…',
  'Registrando pregunta…',
]

const calidadClass: Record<string, string> = {
  Completa: 'cubierta', Parcial: 'parcial', Nula: 'critica',
}

// ── Helper (exported for tests) ───────────────────────────────────────────────

export function normalizeSimToMax(hits: { similitud: number }[]): number[] {
  if (hits.length === 0) return []
  const max = Math.max(...hits.map(h => h.similitud))
  if (max === 0) return hits.map(() => 0)
  return hits.map(h => h.similitud / max)
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function Tooltip({ text }: { text: string }) {
  return (
    <span className="tooltip-wrap">
      <span className="tooltip-icon" tabIndex={0}>i</span>
      <span className="tooltip-bubble">{text}</span>
    </span>
  )
}

// ── SearchBox ─────────────────────────────────────────────────────────────────

interface SearchBoxProps {
  value: string
  onChange: (v: string) => void
  onSearch: () => void
  onClear: () => void
  isLoading: boolean
  isDisabled: boolean
  indexError: string | null
  isIndexReady: boolean
}

function SearchBox({
  value, onChange, onSearch, onClear,
  isLoading, isDisabled, indexError, isIndexReady,
}: SearchBoxProps) {
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    if (!isLoading) { setStepIndex(0); return }
    const t = setInterval(() => setStepIndex(i => (i + 1) % LOADING_STEPS.length), 700)
    return () => clearInterval(t)
  }, [isLoading])

  return (
    <div className="search-box">
      {indexError && <p className="search-error">{indexError}</p>}
      <textarea
        className="search-textarea"
        placeholder="¿Qué datos de género necesitas? Ej: «¿Existen datos sobre feminicidio desagregados por estado?»"
        maxLength={400}
        value={value}
        rows={3}
        disabled={isLoading}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSearch() }}
      />
      {isLoading && (
        <p className="search-loading-step">{LOADING_STEPS[stepIndex]}</p>
      )}
      <div className="search-footer">
        <span className="char-count">{value.length} / 400</span>
        {!isIndexReady && !indexError && (
          <span className="index-loading-note label-mono">Cargando motor…</span>
        )}
        <div className="search-actions">
          {value && !isLoading && (
            <button className="btn-ghost" onClick={onClear}>Limpiar</button>
          )}
          <button
            className="btn-primary"
            onClick={onSearch}
            disabled={isDisabled}
          >
            Buscar brecha →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── HitRow ────────────────────────────────────────────────────────────────────

function HitRow({ hit, index, normalizedSim }: { hit: SearchHit; index: number; normalizedSim: number }) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), index * 60 + 100)
    return () => clearTimeout(t)
  }, [index])

  const barColor = hit.tipo === 'dataset' ? 'var(--accent)' : 'var(--agenda-genero)'

  return (
    <div
      className="hit-row"
      style={{ '--row-delay': `${index * 60}ms` } as React.CSSProperties}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
        <span className="hit-titulo">{hit.titulo}</span>
        {hit.calidad && (
          <span className={`gap-category-badge ${calidadClass[hit.calidad] ?? 'parcial'}`}
            style={{ flexShrink: 0, fontSize: 10 }}>
            {hit.calidad}
          </span>
        )}
      </div>
      <div className="hit-meta">
        {hit.fuente && <span>{hit.fuente}</span>}
        {hit.pais && <><span className="hit-meta-sep">·</span><span>{hit.pais}</span></>}
        {hit.anio && <><span className="hit-meta-sep">·</span><span>{hit.anio}</span></>}
      </div>
      <div className="hit-sim-wrap">
        <div className="hit-sim-track">
          <div
            className="hit-sim-bar"
            style={{
              width: animated ? `${normalizedSim * 100}%` : '0%',
              background: barColor,
              transition: `width 0.6s cubic-bezier(0.4,0,0.2,1) ${index * 60}ms`,
            }}
          />
        </div>
        <span className="hit-sim-pct" title="Similitud coseno con tu pregunta">
          {Math.round(hit.similitud * 100)}%
        </span>
      </div>
    </div>
  )
}

// ── ScorePanel ────────────────────────────────────────────────────────────────

function ScorePanel({ resultado }: { resultado: GapResult }) {
  const pct = Math.round(resultado.score * 100)
  const colorMap = {
    critica: 'var(--gap-crit)',
    parcial: 'var(--gap-part)',
    cubierta: 'var(--gap-cov)',
  }
  const color = colorMap[resultado.categoria]

  return (
    <div className="score-panel">
      <div>
        <div className="score-number" style={{ color }}>{pct}</div>
        <div className="score-label label-mono" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          score de brecha
          <Tooltip text="0 = dato completamente cubierto en el corpus · 100 = brecha crítica, pocos o ningún dato disponible para tu pregunta." />
        </div>
        <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-light)', marginTop: 2 }}>
          0 = cubierto · 100 = crítico
        </div>
      </div>
      <span className={`gap-category-badge ${resultado.categoria}`}>
        ● {resultado.categoria}
      </span>

      <div className="termometro-wrap">
        <div className="termometro-track">
          <div className="termometro-level" style={{ height: `${pct}%` }} />
          {/* Scale marks */}
          {[0, 50, 100].map(mark => (
            <div key={mark} style={{
              position: 'absolute',
              bottom: `${mark}%`,
              left: '100%',
              marginLeft: 4,
              fontSize: 9,
              fontFamily: 'var(--mono)',
              color: 'var(--ink-light)',
              transform: 'translateY(50%)',
              whiteSpace: 'nowrap',
            }}>{mark}</div>
          ))}
        </div>
        <span className="termometro-pct label-mono">{pct}%</span>
      </div>

      <div className="agenda-score-list">
        {[
          { tipo: 'tecnologica', label: 'Ag. Tecnológica', val: resultado.agendas.tecnologica },
          { tipo: 'datos',       label: 'Ag. de Datos',    val: resultado.agendas.datos },
          { tipo: 'genero',      label: 'Ag. de Género',   val: resultado.agendas.genero },
        ].map(a => (
          <div key={a.tipo} className={`agenda-score-pill ${a.tipo}`}
            title="Proporción de la brecha atribuible a esta agenda, calculada sobre los datasets y normativas encontrados.">
            <span className="label-mono" style={{ fontSize: 10 }}>{a.label}</span>
            <span className="agenda-score-num">{a.val}</span>
          </div>
        ))}
      </div>

      <p className="score-sintesis">{resultado.titulo}</p>
    </div>
  )
}

// ── ResultsColumns ────────────────────────────────────────────────────────────

function ResultsColumns({ resultado }: { resultado: GapResult }) {
  const allHits = [...resultado.datasets, ...resultado.normativas]
  const maxSim = Math.max(...allHits.map(h => h.similitud), 0.001)
  const normalize = (h: SearchHit) => h.similitud / maxSim

  return (
    <div className="results-columns">
      <div className="results-col">
        <div className="results-col-header">
          <span className="label-mono">Datasets</span>
          <span className="results-col-count">{resultado.datasets.length}</span>
        </div>
        {resultado.datasets.length === 0
          ? <p className="results-empty">Sin datasets relacionados</p>
          : resultado.datasets.map((hit, i) => (
              <HitRow key={hit.id} hit={hit} index={i} normalizedSim={normalize(hit)} />
            ))
        }
      </div>
      <div className="results-col">
        <div className="results-col-header">
          <span className="label-mono">Normativas</span>
          <span className="results-col-count">{resultado.normativas.length}</span>
        </div>
        {resultado.normativas.length === 0
          ? <p className="results-empty">Sin normativas relacionadas</p>
          : resultado.normativas.map((hit, i) => (
              <HitRow key={hit.id} hit={hit} index={i} normalizedSim={normalize(hit)} />
            ))
        }
      </div>
    </div>
  )
}

// ── MonitorBrechas ────────────────────────────────────────────────────────────

export function MonitorBrechas() {
  const { isReady, error: indexError } = useSearchIndex()
  const { resultado, isLoading, error: searchError, buscar, limpiar } = useMotorBrechas()
  const { status: embedderStatus, progress: embedderProgress, error: embedderError } = useEmbedder()
  const [query, setQuery] = useState('')

  const handleBuscar = () => {
    if (query.trim().length >= 5) buscar(query.trim())
  }

  const handleLimpiar = () => {
    limpiar()
    setQuery('')
  }

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
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/test/MonitorBrechas.test.tsx
```

Expected: 5 tests PASS.

- [ ] **Step 5: Run full suite**

```bash
npm test
```

Expected: 84+ tests passing, 0 failing.

- [ ] **Step 6: Commit**

```bash
git add src/pages/MonitorBrechas.tsx src/test/MonitorBrechas.test.tsx
git commit -m "feat: normalize similarity bars + add score labels and tooltips in Monitor Brechas"
```

---

## Task 5: Final verification

- [ ] **Step 1: Run full test suite one last time**

```bash
npm test
```

Expected: all tests pass, 0 failing.

- [ ] **Step 2: Start dev server and verify each page**

```bash
npm run dev
```

Check:
- `/datos` — selector Año + Semana ISO visible, cambia el rango y el chart se actualiza
- `/colectivo` — banda de 4 métricas visible, textos explicativos, tooltips ⓘ funcionan al hover
- `/brechas` — buscar una pregunta, verificar que las barras de similitud muestran diferencia visual entre resultados

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: Phase 6 UI fixes complete"
```
