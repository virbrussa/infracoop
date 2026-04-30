# UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three frontend UX improvements: mobile-responsive layout, an empty-state with example questions in /brechas, and live Supabase corpus stats on the Landing page.

**Architecture:** Pure CSS additions for mobile (new media query block in `app.css`); a new `ExampleQuestions` component in `MonitorBrechas.tsx`; a new `useLandingStats` hook that fetches counts from Supabase, used in `Landing.tsx`.

**Tech Stack:** CSS Grid / media queries; React; Supabase JS v2 (`select` with `{ count: 'exact', head: true }`).

---

## File Map

| File | Change |
|---|---|
| `src/styles/app.css` | Add `@media (max-width: 640px)` block for motor/results/monitor/header grids |
| `src/pages/MonitorBrechas.tsx` | Add `ExampleQuestions` component shown when `resultado === null && !isLoading` |
| `src/hooks/useLandingStats.ts` | New hook — fetches dataset, normativa, pregunta counts from Supabase |
| `src/pages/Landing.tsx` | Import `useLandingStats`, add a stats strip below the hero |
| `src/test/MonitorBrechas.test.tsx` | Test that example questions render before search |
| `src/test/hooks.test.tsx` | Add tests for `useLandingStats` |

---

## Task 4: Mobile-responsive layout

**Files:**
- Modify: `src/styles/app.css`

### Background

On screens ≤ 640 px these layouts break:
- `.motor-results-inner` — `grid-template-columns: 260px 1fr` → score panel and results overlap
- `.results-columns` — `grid-template-columns: 1fr 1fr` → columns too narrow to read
- `.monitor-grid` — `grid-template-columns: repeat(3, 1fr)` — three agenda cards in a tiny viewport
- `.metricas-compare` — `grid-template-columns: 1fr 1fr` — same issue in DatosQueremos
- `.site-logo-sub` — the tagline takes too much horizontal space

`.datos-layout` already has its own `@media (max-width: 767px)` block (line 1146) — do NOT duplicate it.

No tests for CSS; verify by running `npm run dev` and resizing to 375px (iPhone SE) in browser DevTools.

- [ ] **Step 4.1: Add mobile media query block to `app.css`**

Append at the end of the file (after line 1548), before closing:

```css
/* ═══ Mobile — ≤ 640 px ═══ */

@media (max-width: 640px) {
  /* Container */
  .container {
    padding: 2rem 1rem 4rem;
  }

  /* Header: hide tagline on very small screens */
  .site-logo-sub {
    display: none;
  }

  /* Motor de Brechas: stack score panel above results */
  .motor-results {
    padding: 1.25rem 1rem 3rem;
  }

  .motor-results-inner {
    grid-template-columns: 1fr;
  }

  .score-panel {
    position: static; /* undo sticky */
  }

  /* Results columns: single column */
  .results-columns {
    grid-template-columns: 1fr;
  }

  /* Monitor Colectivo: 1 column agenda cards */
  .monitor-grid {
    grid-template-columns: 1fr;
  }

  /* DatosQueremos: metricas compare */
  .metricas-compare {
    grid-template-columns: 1fr;
  }

  /* Hero text: tighten on small screens */
  .hero h1 {
    font-size: clamp(2rem, 9vw, 2.8rem);
  }
}
```

- [ ] **Step 4.2: Build check**

```bash
cd /home/davas/Documents/InfraCoopDashboard
npm run build 2>&1 | tail -10
```

Expected: `built in Xs` with no errors.

- [ ] **Step 4.3: Visual verification in dev server**

```bash
npm run dev &
```

Open `http://localhost:5173` in browser, open DevTools → device toolbar → set to 375×812 (iPhone SE). Verify:
- `/` (Landing): hero text readable, no horizontal overflow
- `/brechas`: score panel stacks above results columns after a search
- `/colectivo`: three agenda cards stack vertically
- `/datos`: sidebar stacks above chart area (already handled by 767px breakpoint)

Kill the dev server after checking.

- [ ] **Step 4.4: Commit**

```bash
git add src/styles/app.css
git commit -m "feat: mobile-responsive layout for motor, monitor, and datos pages"
```

---

## Task 5: Empty state in `/brechas` (MonitorBrechas)

**Files:**
- Modify: `src/pages/MonitorBrechas.tsx`
- Modify: `src/test/MonitorBrechas.test.tsx`

### Background

Before the user types anything, `/brechas` shows a large textarea and nothing else — there's no hint of what to do or what the tool is for. Adding 4 clickable example questions gives immediate orientation and reduces time-to-first-search.

The `ExampleQuestions` component renders when `resultado === null && !isLoading` (the initial idle state). Clicking a question populates the textarea and triggers the search automatically.

- [ ] **Step 5.1: Write failing test**

Add to `src/test/MonitorBrechas.test.tsx` (check what's already there; add after existing tests):

```typescript
describe('MonitorBrechas empty state', () => {
  it('shows example questions when no resultado and not loading', async () => {
    // The hook mock should return resultado: null, isLoading: false by default
    // (check existing mock setup at the top of the file — mockUseMotorBrechas)
    render(<MonitorBrechas />, { wrapper: AllProviders })

    await waitFor(() => {
      expect(screen.getByText(/¿Existen datos sobre feminicidio/i)).toBeInTheDocument()
    })
  })

  it('does not show example questions after a search result', async () => {
    const mockResult = {
      score: 0.7, categoria: 'critica' as const,
      datasets: [], normativas: [],
      por_agenda: { tecnologica: 0, datos: 0, genero: 0 },
    }
    mockUseMotorBrechas.mockReturnValue({
      resultado: mockResult,
      isLoading: false,
      error: null,
      buscar: vi.fn(),
      limpiar: vi.fn(),
    })

    render(<MonitorBrechas />, { wrapper: AllProviders })

    await waitFor(() => {
      expect(screen.queryByText(/¿Existen datos sobre feminicidio/i)).not.toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 5.2: Run failing test**

```bash
npm test -- --reporter=verbose src/test/MonitorBrechas.test.tsx 2>&1 | tail -20
```

Expected: FAIL — example question text not found in DOM

- [ ] **Step 5.3: Add `ExampleQuestions` component to `MonitorBrechas.tsx`**

Add the component definition before the `MonitorBrechas` export:

```typescript
const EXAMPLE_QUESTIONS = [
  '¿Existen datos sobre feminicidio desagregados por estado y edad de la víctima?',
  '¿Qué países tienen datos abiertos sobre brechas salariales de género en el sector tecnológico?',
  '¿Hay estadísticas sobre acceso de mujeres rurales a servicios de salud reproductiva?',
  '¿Existen datasets sobre participación de mujeres en cooperativas y economía social en LATAM?',
]

function ExampleQuestions({ onSelect }: { onSelect: (q: string) => void }) {
  return (
    <div style={{ marginTop: '2rem' }}>
      <p style={{
        fontFamily: 'var(--mono)',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: 'var(--ink-light)',
        marginBottom: '0.75rem',
      }}>
        Preguntas de ejemplo — hacé clic para buscar
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {EXAMPLE_QUESTIONS.map(q => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            style={{
              textAlign: 'left',
              background: 'var(--surface)',
              border: '1px solid var(--ink-faint)',
              borderRadius: 'var(--r)',
              padding: '0.7rem 1rem',
              fontSize: 14,
              color: 'var(--ink-mid)',
              cursor: 'pointer',
              lineHeight: 1.5,
              transition: 'border-color .15s, color .15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--ink)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--ink-faint)'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-mid)'
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
```

Then in the `MonitorBrechas` render, inside the main content area — add after the `<SearchBox>` but only when idle. Find the section where `resultado` is null and there's no loading state, and add:

```typescript
// In MonitorBrechas, after the SearchBox:
{resultado === null && !isLoading && (
  <ExampleQuestions onSelect={q => { setQuery(q); buscar(q) }} />
)}
```

Make sure `setQuery` is accessible in scope (it already is — `query` and `setQuery` are in `MonitorBrechas` state).

- [ ] **Step 5.4: Run tests — should pass**

```bash
npm test -- --reporter=verbose src/test/MonitorBrechas.test.tsx 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 5.5: Run full test suite**

```bash
npm test 2>&1 | tail -10
```

Expected: all tests pass

- [ ] **Step 5.6: Commit**

```bash
git add src/pages/MonitorBrechas.tsx src/test/MonitorBrechas.test.tsx
git commit -m "feat: add example questions empty state to /brechas"
```

---

## Task 6: Landing page with real Supabase corpus stats

**Files:**
- Create: `src/hooks/useLandingStats.ts`
- Modify: `src/pages/Landing.tsx`
- Modify: `src/test/hooks.test.tsx`

### Background

The Landing page currently has entirely static text. Adding a small stats strip (total datasets, normativas, preguntas) with real Supabase counts makes the tool feel alive and trustworthy. Counts are fetched with `head: true` (no rows returned, just the count — efficient).

- [ ] **Step 6.1: Write failing tests for `useLandingStats`**

Add to `src/test/hooks.test.tsx` (after existing tests):

```typescript
// ── useLandingStats ───────────────────────────────────────────────────────────

import { useLandingStats } from '../hooks/useLandingStats'

describe('useLandingStats', () => {
  function makeCountChain(count: number) {
    return {
      select: vi.fn().mockResolvedValue({ count, error: null }),
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(supabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(makeCountChain(42))   // datasets
      .mockReturnValueOnce(makeCountChain(35))   // normativas
      .mockReturnValueOnce(makeCountChain(150))  // preguntas
  })

  it('returns dataset, normativa, and pregunta counts', async () => {
    const { result } = renderHook(() => useLandingStats())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.datasets).toBe(42)
    expect(result.current.normativas).toBe(35)
    expect(result.current.preguntas).toBe(150)
  })

  it('starts in loading state', () => {
    ;(supabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(makeCountChain(0))
      .mockReturnValueOnce(makeCountChain(0))
      .mockReturnValueOnce(makeCountChain(0))
    const { result } = renderHook(() => useLandingStats())
    expect(result.current.isLoading).toBe(true)
  })
})
```

- [ ] **Step 6.2: Run failing test**

```bash
npm test -- --reporter=verbose src/test/hooks.test.tsx 2>&1 | tail -20
```

Expected: FAIL — `useLandingStats` does not exist

- [ ] **Step 6.3: Create `src/hooks/useLandingStats.ts`**

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

interface LandingStats {
  datasets: number
  normativas: number
  preguntas: number
  isLoading: boolean
  error: string | null
}

export function useLandingStats(): LandingStats {
  const [datasets,   setDatasets]   = useState(0)
  const [normativas, setNormativas] = useState(0)
  const [preguntas,  setPreguntas]  = useState(0)
  const [isLoading,  setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  useEffect(() => {
    async function fetchCounts() {
      try {
        const [
          { count: ds },
          { count: nm },
          { count: pq },
        ] = await Promise.all([
          supabase.from('datasets').select('*', { count: 'exact', head: true }),
          supabase.from('normativas').select('*', { count: 'exact', head: true }),
          supabase.from('preguntas').select('*', { count: 'exact', head: true }),
        ])
        setDatasets(ds ?? 0)
        setNormativas(nm ?? 0)
        setPreguntas(pq ?? 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error cargando estadísticas')
      } finally {
        setLoading(false)
      }
    }
    fetchCounts()
  }, [])

  return { datasets, normativas, preguntas, isLoading, error }
}
```

- [ ] **Step 6.4: Run tests — should pass**

```bash
npm test -- --reporter=verbose src/test/hooks.test.tsx 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 6.5: Update `Landing.tsx` to show stats strip**

Add the import at the top of `Landing.tsx`:

```typescript
import { useLandingStats } from '../hooks/useLandingStats'
```

Add a `StatsStrip` component before the `Landing` export:

```typescript
function StatsStrip({ datasets, normativas, preguntas, isLoading }: {
  datasets: number; normativas: number; preguntas: number; isLoading: boolean
}) {
  const items = [
    { num: datasets,   label: 'datasets en el corpus' },
    { num: normativas, label: 'marcos normativos' },
    { num: preguntas,  label: 'preguntas registradas' },
  ]
  return (
    <div style={{
      display: 'flex',
      gap: '2rem',
      flexWrap: 'wrap',
      padding: '1.25rem 0',
      borderTop: '1px solid var(--ink-faint)',
      borderBottom: '1px solid var(--ink-faint)',
      marginBottom: '2rem',
    }}>
      {items.map(({ num, label }) => (
        <div key={label}>
          <div style={{
            fontFamily: 'var(--serif)',
            fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
            lineHeight: 1,
            letterSpacing: '-0.03em',
            color: isLoading ? 'var(--ink-faint)' : 'var(--ink)',
            transition: 'color .3s',
          }}>
            {isLoading ? '—' : num.toLocaleString('es-MX')}
          </div>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '.1em',
            color: 'var(--ink-light)',
            marginTop: 4,
          }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  )
}
```

Inside the `Landing` function, add the hook call and render the strip below the hero:

```typescript
export function Landing() {
  const { datasets, normativas, preguntas, isLoading } = useLandingStats()

  return (
    <Layout>
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '3rem 1rem 6rem' }}>

        {/* Hero */}
        <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--ink-faint)' }}>
          {/* ... existing hero JSX unchanged ... */}
        </div>

        {/* Live stats */}
        <StatsStrip
          datasets={datasets}
          normativas={normativas}
          preguntas={preguntas}
          isLoading={isLoading}
        />

        {/* ... rest of sections unchanged ... */}
```

- [ ] **Step 6.6: Run full test suite**

```bash
npm test 2>&1 | tail -10
```

Expected: all tests PASS (count ≥ previous + ~3 new tests)

- [ ] **Step 6.7: Build check**

```bash
npm run build 2>&1 | tail -10
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 6.8: Commit**

```bash
git add src/hooks/useLandingStats.ts src/pages/Landing.tsx src/test/hooks.test.tsx
git commit -m "feat: show live corpus stats (datasets, normativas, preguntas) on Landing"
```

---

## Self-Review

**Spec coverage:**
- ✅ Task 4: Mobile layout — all broken grids (motor-results-inner, results-columns, monitor-grid, metricas-compare) fixed via `@media (max-width: 640px)`
- ✅ Task 5: Empty state en /brechas — `ExampleQuestions` with 4 clickable pre-set questions
- ✅ Task 6: Landing con métricas reales — `useLandingStats` hook + `StatsStrip` component

**Placeholder scan:** None found.

**Type consistency:**
- `useLandingStats` returns `{ datasets, normativas, preguntas, isLoading, error }` — matches `StatsStrip` props. ✅
- `ExampleQuestions` prop `onSelect: (q: string) => void` — called with `q => { setQuery(q); buscar(q) }` which matches. ✅
- `supabase.from(...).select('*', { count: 'exact', head: true })` returns `{ count: number | null }` — guarded with `?? 0`. ✅

**Known nuance:** The Supabase `select` with `head: true` mock in the test uses a simplified chain (`{ select: vi.fn().mockResolvedValue(...) }`) — this matches how the hook calls it (direct await, no `.eq` chaining). If the test mock needs adjustment for how supabase.from chains, the pattern in `makeCountChain` may need to return `mockReturnThis()` on `select`. Adjust if test fails with "not a function".
