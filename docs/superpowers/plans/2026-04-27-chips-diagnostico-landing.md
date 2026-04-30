# Chips + Diagnóstico PDF + Landing Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add advocacy chip selector + clean print-view `/diagnostico` route to `/brechas`, and redesign the landing page with proper typographic editorial sections.

**Architecture:** `ChipsBar` sits inside `MonitorBrechas` below `ResultadoMetaBand`; clicking "Descargar diagnóstico" navigates to `/diagnostico` passing `GapResult` + selected chips via React Router `state`. `Diagnostico.tsx` is a standalone page (no Layout/Header) that auto-calls `window.print()` on mount. `Landing.tsx` is a full rewrite — same content, structured into visually distinct sections using the existing design tokens.

**Tech Stack:** React, TypeScript, React Router v6 (`useNavigate`, `useLocation`), existing CSS custom properties.

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `src/pages/MonitorBrechas.tsx` | Add `ChipsBar` component + wire navigate to `/diagnostico` |
| Create | `src/pages/Diagnostico.tsx` | Clean print-view page, auto-print on mount |
| Modify | `src/App.tsx` | Add `/diagnostico` route |
| Modify | `src/styles/app.css` | Print styles + chip styles |
| Modify | `src/pages/Landing.tsx` | Editorial redesign |

---

## Task 1: Chip styles + print CSS

**Files:**
- Modify: `src/styles/app.css`

- [ ] **Step 1: Append chip + print styles to `src/styles/app.css`**

```css
/* ═══ Advocacy Chips ═══ */

.chips-bar {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  align-items: center;
  padding: 1rem 0 .5rem;
  border-top: 1px solid var(--ink-faint);
  margin-top: 1rem;
}

.chips-bar-label {
  font-family: var(--mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--ink-light);
  margin-right: .25rem;
  flex-shrink: 0;
}

.chip {
  font-family: var(--mono);
  font-size: 11px;
  padding: 5px 12px;
  border-radius: 9999px;
  border: 1px solid var(--ink-faint);
  background: white;
  color: var(--ink-mid);
  cursor: pointer;
  transition: all .15s;
  user-select: none;
}

.chip:hover { border-color: var(--ink); color: var(--ink); }

.chip.selected {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

/* ═══ Diagnóstico print view ═══ */

.diagnostico-page {
  max-width: 680px;
  margin: 0 auto;
  padding: 3rem 2rem 5rem;
  font-family: var(--sans);
  color: var(--ink);
  background: var(--paper);
  min-height: 100vh;
}

.diagnostico-back {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-light);
  text-decoration: none;
  display: inline-block;
  margin-bottom: 2rem;
}

.diagnostico-back:hover { color: var(--ink); }

.diagnostico-logo {
  font-family: var(--serif);
  font-size: 18px;
  color: var(--ink);
  letter-spacing: -.03em;
  margin-bottom: .25rem;
}

.diagnostico-logo span { color: var(--accent); }

.diagnostico-sub {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--ink-light);
  letter-spacing: .08em;
  text-transform: uppercase;
  margin-bottom: 2rem;
}

.diagnostico-query {
  font-family: var(--serif);
  font-size: 1.1rem;
  line-height: 1.5;
  color: var(--ink);
  border-left: 3px solid var(--accent);
  padding-left: 1rem;
  margin-bottom: 2rem;
  font-style: italic;
}

.diagnostico-score-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--ink-faint);
}

.diagnostico-score-num {
  font-family: var(--serif);
  font-size: 3rem;
  line-height: 1;
  letter-spacing: -.03em;
}

.diagnostico-chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  margin-bottom: 2rem;
}

.diagnostico-chip {
  font-family: var(--mono);
  font-size: 11px;
  padding: 4px 12px;
  border-radius: 9999px;
  background: var(--accent);
  color: white;
}

.diagnostico-section-title {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--ink-light);
  font-family: var(--mono);
  margin: 1.5rem 0 .75rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.diagnostico-section-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--ink-faint);
}

.diagnostico-hit {
  padding: .6rem 0;
  border-bottom: 1px solid var(--ink-faint);
  font-size: 13px;
}

.diagnostico-hit-title { font-weight: 500; color: var(--ink); margin-bottom: 2px; }

.diagnostico-hit-meta {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--ink-light);
}

.diagnostico-footer {
  margin-top: 3rem;
  padding-top: 1rem;
  border-top: 1px solid var(--ink-faint);
  font-family: var(--mono);
  font-size: 10px;
  color: var(--ink-light);
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px;
}

@media print {
  .diagnostico-back { display: none; }
  .diagnostico-page { padding: 1.5rem; }
  body { background: white; }
}
```

- [ ] **Step 2: Build — no errors expected**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/app.css
git commit -m "style: add chips and diagnostico print styles"
```

---

## Task 2: `Diagnostico.tsx` — print view page

**Files:**
- Create: `src/pages/Diagnostico.tsx`

- [ ] **Step 1: Create the page**

```typescript
import { useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import type { GapResult } from '../types'

interface DiagnosticoState {
  resultado: GapResult
  query: string
  chips: string[]
}

export function Diagnostico() {
  const location = useLocation()
  const state = location.state as DiagnosticoState | null

  useEffect(() => {
    if (state) {
      const t = setTimeout(() => window.print(), 600)
      return () => clearTimeout(t)
    }
  }, [state])

  if (!state) {
    return (
      <div className="diagnostico-page">
        <Link to="/brechas" className="diagnostico-back">← Volver al motor</Link>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-light)' }}>
          No hay diagnóstico para mostrar.
        </p>
      </div>
    )
  }

  const { resultado, query, chips } = state
  const pct = Math.round(resultado.score * 100)
  const colorMap: Record<string, string> = {
    critica: 'var(--gap-crit)',
    parcial: 'var(--gap-part)',
    cubierta: 'var(--gap-cov)',
  }
  const color = colorMap[resultado.categoria]

  return (
    <div className="diagnostico-page">
      <Link to="/brechas" className="diagnostico-back">← Volver al motor</Link>

      <div className="diagnostico-logo">
        Infra<span>.</span>Coop
      </div>
      <div className="diagnostico-sub">Motor de brechas · Diagnóstico de incidencia</div>

      <div className="diagnostico-query">"{query}"</div>

      <div className="diagnostico-score-row">
        <div>
          <div className="diagnostico-score-num" style={{ color }}>{pct}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-light)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
            score de brecha
          </div>
        </div>
        <span className={`gap-category-badge ${resultado.categoria}`} style={{ alignSelf: 'flex-start' }}>
          ● {resultado.categoria}
        </span>
        <div style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-light)', lineHeight: 1.6 }}>
          <div>Ag. Tecnológica: <strong style={{ color: 'var(--agenda-tec)' }}>{resultado.agendas.tecnologica}</strong></div>
          <div>Ag. de Datos: <strong style={{ color: 'var(--agenda-datos)' }}>{resultado.agendas.datos}</strong></div>
          <div>Ag. de Género: <strong style={{ color: 'var(--agenda-genero)' }}>{resultado.agendas.genero}</strong></div>
        </div>
      </div>

      {chips.length > 0 && (
        <>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-light)', marginBottom: '.5rem' }}>
            Agenda de incidencia
          </div>
          <div className="diagnostico-chips-row">
            {chips.map(c => <span key={c} className="diagnostico-chip">{c}</span>)}
          </div>
        </>
      )}

      <div className="diagnostico-section-title">Datasets disponibles</div>
      {resultado.datasets.length === 0
        ? <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-light)' }}>Sin datasets relacionados</p>
        : resultado.datasets.map(hit => (
          <div key={hit.id} className="diagnostico-hit">
            <div className="diagnostico-hit-title">{hit.titulo}</div>
            <div className="diagnostico-hit-meta">
              {[hit.fuente, hit.pais, hit.anio].filter(Boolean).join(' · ')}
            </div>
          </div>
        ))
      }

      <div className="diagnostico-section-title">Marcos normativos</div>
      {resultado.normativas.length === 0
        ? <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-light)' }}>Sin normativas relacionadas</p>
        : resultado.normativas.map(hit => (
          <div key={hit.id} className="diagnostico-hit">
            <div className="diagnostico-hit-title">{hit.titulo}</div>
            <div className="diagnostico-hit-meta">
              {[hit.fuente, hit.pais].filter(Boolean).join(' · ')}
            </div>
          </div>
        ))
      }

      <div className="diagnostico-footer">
        <span>Data Cooperativas Latinas · Mozilla Fellowship 2024–2026</span>
        <span>Infra.Coop Motor de Brechas v0.4</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add route to `src/App.tsx`**

Add import:
```typescript
import { Diagnostico } from './pages/Diagnostico'
```

Add route inside `<Routes>`:
```tsx
<Route path="/diagnostico" element={<Diagnostico />} />
```

- [ ] **Step 3: Build**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`

- [ ] **Step 4: Commit**

```bash
git add src/pages/Diagnostico.tsx src/App.tsx
git commit -m "feat: add /diagnostico print-view page with auto-print"
```

---

## Task 3: `ChipsBar` in `MonitorBrechas.tsx`

**Files:**
- Modify: `src/pages/MonitorBrechas.tsx`

- [ ] **Step 1: Add `useNavigate` import and `useState` to existing imports**

Change the first import line from:
```typescript
import { useState, useEffect } from 'react'
import { useMotorBrechas } from '../hooks/useMotorBrechas'
import { useSearchIndex } from '../context/SearchIndexContext'
import { useEmbedder } from '../context/EmbedderContext'
import type { GapResult, SearchHit } from '../types'
```
To:
```typescript
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMotorBrechas } from '../hooks/useMotorBrechas'
import { useSearchIndex } from '../context/SearchIndexContext'
import { useEmbedder } from '../context/EmbedderContext'
import type { GapResult, SearchHit } from '../types'
```

- [ ] **Step 2: Add `ChipsBar` component before `MonitorBrechas`**

Insert before the `// ── MonitorBrechas ───` comment:

```typescript
// ── ChipsBar ──────────────────────────────────────────────────────────────────

const ADVOCACY_CHIPS = [
  'Gobierno Abierto',
  'DDHH',
  'Cooperación Digital',
  'Gobernanza Cooperativa',
]

function ChipsBar({ resultado, query }: { resultado: GapResult; query: string }) {
  const [selected, setSelected] = useState<string[]>([])
  const navigate = useNavigate()

  function toggle(chip: string) {
    setSelected(prev =>
      prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
    )
  }

  function handleDescargar() {
    navigate('/diagnostico', { state: { resultado, query, chips: selected } })
  }

  return (
    <div className="chips-bar">
      <span className="chips-bar-label">Agenda de incidencia</span>
      {ADVOCACY_CHIPS.map(chip => (
        <button
          key={chip}
          className={`chip${selected.includes(chip) ? ' selected' : ''}`}
          onClick={() => toggle(chip)}
        >
          {chip}
        </button>
      ))}
      <button
        className="btn-primary"
        style={{ marginLeft: 'auto', fontSize: 12, padding: '6px 14px' }}
        onClick={handleDescargar}
      >
        Descargar diagnóstico →
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Wire `ChipsBar` into the results section**

Find the results block in `MonitorBrechas`:
```tsx
      {resultado && (
        <div className="motor-results">
          <div className="motor-results-inner">
            <ScorePanel resultado={resultado} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <ResultadoMetaBand resultado={resultado} />
              <ResultsColumns resultado={resultado} />
            </div>
          </div>
        </div>
      )}
```

Replace with:
```tsx
      {resultado && (
        <div className="motor-results">
          <div className="motor-results-inner">
            <ScorePanel resultado={resultado} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <ResultadoMetaBand resultado={resultado} />
              <ResultsColumns resultado={resultado} />
              <ChipsBar resultado={resultado} query={query} />
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 4: Build**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`

- [ ] **Step 5: Run tests**

```bash
npm test -- --run 2>&1 | tail -8
```

Expected: 106 tests passing.

- [ ] **Step 6: Commit**

```bash
git add src/pages/MonitorBrechas.tsx
git commit -m "feat: add ChipsBar with advocacy chips and Descargar diagnóstico button"
```

---

## Task 4: Landing page editorial redesign

**Files:**
- Modify: `src/pages/Landing.tsx`

- [ ] **Step 1: Rewrite `src/pages/Landing.tsx`**

```typescript
import { Layout } from '../components/Layout'

function Section({ eyebrow, title, children }: {
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section style={{ borderTop: '1px solid var(--ink-faint)', paddingTop: '2rem', marginTop: '2rem' }}>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-light)', marginBottom: '.5rem' }}>
        {eyebrow}
      </p>
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.4rem,3vw,1.9rem)', lineHeight: 1.15, letterSpacing: '-.02em', marginBottom: '1rem', color: 'var(--ink)' }}>
        {title}
      </h2>
      <div style={{ fontSize: 15, lineHeight: 1.85, color: 'var(--ink-mid)', maxWidth: 640 }}>
        {children}
      </div>
    </section>
  )
}

function FutureLayer({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--accent)', letterSpacing: '.04em', marginBottom: '.35rem' }}>
        ✦ {title}
      </p>
      <div style={{ paddingLeft: '1.25rem', fontSize: 14, color: 'var(--ink-mid)', lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  )
}

export function Landing() {
  return (
    <Layout>
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '3rem 1rem 6rem' }}>

        {/* Hero */}
        <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--ink-faint)' }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-light)', marginBottom: '.75rem' }}>
            Infra.Coop
          </p>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3rem)', lineHeight: 1.1, letterSpacing: '-.03em', marginBottom: '1rem' }}>
            ¿Qué es <em style={{ color: 'var(--accent)' }}>Infra.Coop</em>?
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.75, color: 'var(--ink)', maxWidth: 600 }}>
            Infra.Coop es la dimensión tecnosocial de Data Cooperativas Latinas. Una infraestructura digital inclusiva basada en los conceptos y modelo de gobernanza de datos cooperativos.
          </p>
        </div>

        {/* Monitor de Brechas */}
        <Section eyebrow="01 · Monitor de Brechas" title="La pregunta como evidencia">
          <p style={{ marginBottom: '1rem' }}>
            El propósito es evidenciar el rol que juegan las preguntas —la fase de problema— al momento de iniciar un proceso de recolección de datos. Qué nos preguntemos, cómo y para quién incide en qué datos se definen recolectar.
          </p>
          <p>
            Con la PREGUNTA nos interesa enfatizar en la urgencia, pertinencia y oportunidad de los datos cooperativos —datos ciudadanos— para contar con los DATOS QUE QUEREMOS.
          </p>
        </Section>

        {/* Monitor Colectivo */}
        <Section eyebrow="02 · Monitor Colectivo" title="El mapa común de brechas">
          <p style={{ marginBottom: '1rem' }}>
            Tu pregunta contribuye a crear la evidencia común del estado de los datos de género, contrastándola con dos bases de datos seleccionadas para Infra.Coop:
          </p>
          <p style={{ marginBottom: '.5rem', paddingLeft: '1rem', borderLeft: '2px solid var(--ink-faint)' }}>
            a) Datasets de género regionales
          </p>
          <p style={{ marginBottom: '1rem', paddingLeft: '1rem', borderLeft: '2px solid var(--ink-faint)' }}>
            b) Marcos de normativas vigentes a nivel global, regional y nacional — normativas de datos, de tecnologías y de género.
          </p>
          <p>
            A medida que se sumen más preguntas, se irá visualizando la diferencia entre la brecha de datos existente versus la brecha real.
          </p>
        </Section>

        {/* Los datos que queremos */}
        <Section eyebrow="03 · ¿Qué datos queremos?" title="Evolución de la demanda colectiva">
          <p>
            En este apartado el algoritmo cooperativo llega a su meta (al menos por ahora). La lupa está puesta en la evolución entre los datos que tenemos y los datos que queremos — seguida semana a semana por pregunta y por agenda.
          </p>
        </Section>

        {/* Futuras capas */}
        <Section eyebrow="En proceso" title="Las capas que vienen">
          <p style={{ marginBottom: '1.5rem' }}>
            La Capa de Monitor es la primera prototipada. Hemos ideado para implementar a futuro:
          </p>

          <FutureLayer title="Capa federada de nodos">
            <p>Un foro y comunidad de aprendizaje cooperativo.</p>
            <p>Exploración de las intervenciones del modelo de gobernanza para la incidencia en distintos espacios territoriales y temáticos.</p>
            <p>Aplicación de metodologías del Ciclo de Datos que queremos por temática y nodos.</p>
          </FutureLayer>

          <FutureLayer title="Capa de datos cooperativos">
            <p>Espacio seguro y cuidado para archivar tus datos ciudadanos.</p>
            <p>Con distintos niveles de acceso por roles y/o criterios de gobernanza del Protocolo.</p>
          </FutureLayer>

          <FutureLayer title="Protocolo de gobernanza de la Infra.Coop">
            <p>El marco normativo interno que rige cómo se toman decisiones sobre los datos cooperativos.</p>
          </FutureLayer>
        </Section>

        {/* Otras ideas */}
        <section style={{ borderTop: '1px solid var(--ink-faint)', paddingTop: '2rem', marginTop: '2rem' }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-light)', marginBottom: '1rem' }}>
            Otras ideas — con tu ayuda
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {[
              'Simulador de intervenciones en el ciclo de datos de tu elección (OSC)',
              'Explorador de diagnósticos de incidencia para OSC, funcionarios públicos, organismos y activistas',
              'Sistematizador de evidencia: útil para áreas de litigio estratégico',
              'Creación de cuenta en la plataforma',
            ].map(idea => (
              <p key={idea} style={{ fontSize: 13, color: 'var(--ink-light)', fontFamily: 'var(--mono)', paddingLeft: '1rem', borderLeft: '1px solid var(--ink-faint)' }}>
                — {idea}
              </p>
            ))}
          </div>
        </section>

      </div>
    </Layout>
  )
}
```

- [ ] **Step 2: Build**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`

- [ ] **Step 3: Run tests**

```bash
npm test -- --run 2>&1 | tail -8
```

Expected: 106 tests passing (no landing-specific tests — it's pure presentation).

- [ ] **Step 4: Commit**

```bash
git add src/pages/Landing.tsx
git commit -m "feat: landing page editorial redesign with typographic sections"
```

---

## Task 5: Final integration commit

- [ ] **Step 1: Full build + test**

```bash
npm run build 2>&1 | tail -5 && npm test -- --run 2>&1 | tail -8
```

Expected: build clean, 106 tests passing.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: Phase 10 chips + diagnostico + landing complete"
```
