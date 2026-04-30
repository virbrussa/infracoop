# Visualizaciones Recharts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar visualizaciones CSS estáticas con Recharts interactivo y mejorar el gauge de MonitorBrechas con CSS animado.

**Architecture:** Recharts instalado directamente (sin shadcn/Tailwind). Los componentes de charts se escriben inline en cada página — no se crea una capa de abstracción separada. El sistema CSS existente no se toca.

**Tech Stack:** Recharts 3.x, CSS `conic-gradient`, Vitest + ResizeObserver mock

---

## File Map

| Archivo | Cambio |
|---------|--------|
| `src/test/setup.ts` | Agregar mock de ResizeObserver + mock global de Recharts |
| `src/pages/DatosQueremos.tsx` | Reemplazar `StackedWeekChart` con `ComposedChart` de Recharts |
| `src/pages/MonitorBrechas.tsx` | Gauge CSS mejorado en `ScorePanel` + mini BarChart en `HitRow` |
| `src/pages/MonitorColectivo.tsx` | Delta semanal + sparkline LineChart en `AgendaCard` |
| `src/pages/Diagnostico.tsx` | CSS print cleanup (sin charts) |
| `src/styles/app.css` | Estilos para gauge animado + ajustes Diagnostico print |

---

### Task 1: Instalar Recharts y agregar mocks de test

**Files:**
- Modify: `src/test/setup.ts`

- [ ] **Instalar Recharts**

```bash
npm install recharts
```

- [ ] **Actualizar `src/test/setup.ts`**

```typescript
import '@testing-library/jest-dom'

// ResizeObserver no existe en jsdom — Recharts lo requiere
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock global de recharts para tests — evita errores de SVG en jsdom
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 300, height: 100 }}>{children}</div>
    ),
  }
})
```

- [ ] **Agregar import de vi en setup.ts** (vitest lo inyecta globalmente pero el mock necesita el import)

Verificar que `vitest.config.ts` tiene `globals: true`. Si no, agregar `import { vi } from 'vitest'` al inicio de setup.ts.

```bash
grep "globals" /home/davas/Documents/InfraCoopDashboard/vitest.config.ts
```

Si no aparece `globals: true`, editar `vitest.config.ts`:

```typescript
// vitest.config.ts — agregar globals: true en test config
test: {
  globals: true,
  // ... resto de config existente
}
```

- [ ] **Verificar que los 106 tests siguen pasando**

```bash
npm test -- --run
```

Resultado esperado: `Tests 106 passed (106)`

- [ ] **Commit**

```bash
git add src/test/setup.ts package.json package-lock.json vitest.config.ts
git commit -m "feat: install recharts + add ResizeObserver and recharts mocks for tests"
```

---

### Task 2: DatosQueremos — ComposedChart (barras apiladas + línea)

**Files:**
- Modify: `src/pages/DatosQueremos.tsx:149-209` (función `StackedWeekChart`)

- [ ] **Reemplazar `StackedWeekChart` por versión Recharts**

Eliminar la función `StackedWeekChart` completa (líneas 149-209 aprox.) y reemplazar con:

```tsx
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'

const MAX_CHART_BARS = 24

function StackedWeekChart({ semanas }: { semanas: SemanaStats[] }) {
  const visible = semanas.length <= MAX_CHART_BARS
    ? semanas
    : semanas.slice(semanas.length - MAX_CHART_BARS)

  const labelEvery = visible.length > 16 ? 4 : visible.length > 8 ? 2 : 1

  const data = visible.map(s => ({
    label: s.label.replace('Sem. ', 'S'),
    tecnologica: s.por_agenda.tecnologica.nuevas,
    datos: s.por_agenda.datos.nuevas,
    genero: s.por_agenda.genero.nuevas,
    total: s.nuevas,
  }))

  return (
    <div className="chart-section">
      <div className="chart-title">Preguntas nuevas por semana — distribución por agenda</div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-faint)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fontFamily: 'var(--mono)', fill: 'var(--ink-light)' }}
            interval={labelEvery - 1}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fontFamily: 'var(--mono)', fill: 'var(--ink-light)' }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={{ fontFamily: 'var(--mono)', fontSize: 12, border: '1px solid var(--ink-faint)', borderRadius: 6 }}
            labelStyle={{ fontWeight: 600, marginBottom: 4 }}
          />
          <Bar dataKey="tecnologica" stackId="a" fill="#378ADD" name="Ag. Tecnológica" isAnimationActive />
          <Bar dataKey="datos"       stackId="a" fill="#7F77DD" name="Ag. de Datos"    isAnimationActive />
          <Bar dataKey="genero"      stackId="a" fill="#D4537E" name="Ag. de Género"   isAnimationActive radius={[2, 2, 0, 0]} />
          <Line
            type="monotone"
            dataKey="total"
            name="Total"
            stroke="var(--ink)"
            strokeWidth={2}
            dot={false}
            isAnimationActive
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: 'var(--mono)', paddingTop: 8 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Actualizar la llamada** — el prop `selectedIdx` ya no existe, eliminar del JSX:

Buscar en `DatosQueremos` (línea ~390):
```tsx
<StackedWeekChart semanas={filteredSemanas} selectedIdx={selectedIdx} />
```
Cambiar a:
```tsx
<StackedWeekChart semanas={filteredSemanas} />
```

- [ ] **Eliminar la variable `selectedIdx`** si solo se usaba en `StackedWeekChart`:

Verificar si `selectedIdx` se usa en otro lugar. Si no:
```tsx
// Eliminar estas líneas:
const selectedIdx = filteredSemanas.length - 1
```
`selected` sigue siendo `filteredSemanas[filteredSemanas.length - 1]`.

- [ ] **Correr tests**

```bash
npm test -- --run src/test/DatosQueremos.test.tsx
```

Resultado esperado: todos los tests de DatosQueremos pasan.

- [ ] **Verificar en el navegador** — abrir `/datos`, confirmar que el chart aparece con barras animadas y línea de total.

- [ ] **Commit**

```bash
git add src/pages/DatosQueremos.tsx
git commit -m "feat: replace StackedWeekChart with Recharts ComposedChart in DatosQueremos"
```

---

### Task 3: MonitorBrechas — Gauge CSS animado

**Files:**
- Modify: `src/pages/MonitorBrechas.tsx:171-228` (función `ScorePanel`)
- Modify: `src/styles/app.css`

- [ ] **Reemplazar el gauge lineal por gauge semicircular con conic-gradient**

En `ScorePanel`, reemplazar el bloque `<div className="score-gauge">`:

```tsx
// Reemplazar:
<div className="score-gauge">
  <div className="score-gauge-track">
    <div
      className="score-gauge-marker"
      style={{ left: `${pct}%` }}
      aria-label={`Score: ${pct}`}
    />
  </div>
  <div className="score-gauge-labels">
    <span>cubierto</span>
    <span>crítico</span>
  </div>
</div>

// Con:
<div className="score-arc-gauge" aria-label={`Score de brecha: ${pct} de 100`}>
  <div
    className="score-arc-fill"
    style={{ '--arc-pct': pct } as React.CSSProperties}
  />
  <div className="score-arc-labels">
    <span>0</span>
    <span>100</span>
  </div>
</div>
```

- [ ] **Agregar estilos del gauge en `src/styles/app.css`**

Al final del bloque de estilos de `.score-panel` (buscar `.score-gauge` en app.css y reemplazar el bloque completo):

```css
/* ── Score arc gauge ── */
.score-arc-gauge {
  width: 100%;
  margin: 0.5rem 0;
}

.score-arc-fill {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(
    to right,
    var(--gap-cov) 0%,
    var(--gap-part) 50%,
    var(--gap-crit) 100%
  );
  position: relative;
  overflow: visible;
}

.score-arc-fill::after {
  content: '';
  position: absolute;
  top: 50%;
  left: calc(var(--arc-pct, 0) * 1%);
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: white;
  border: 2px solid currentColor;
  box-shadow: 0 1px 4px rgba(0,0,0,.2);
  transition: left 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.score-arc-labels {
  display: flex;
  justify-content: space-between;
  font-family: var(--mono);
  font-size: 10px;
  color: var(--ink-light);
  margin-top: 4px;
}
```

- [ ] **Correr tests**

```bash
npm test -- --run src/test/MonitorBrechas.test.tsx
```

- [ ] **Verificar en navegador** — buscar una pregunta, confirmar que el gauge aparece con el marcador en la posición correcta y que tiene transición suave al cambiar entre resultados.

- [ ] **Commit**

```bash
git add src/pages/MonitorBrechas.tsx src/styles/app.css
git commit -m "feat: upgrade MonitorBrechas gauge to animated CSS arc with gradient"
```

---

### Task 4: MonitorBrechas — Mini BarChart de calidad en HitRow

**Files:**
- Modify: `src/pages/MonitorBrechas.tsx:114-169` (función `HitRow`)

- [ ] **Agregar helper para derivar dimensiones de calidad del SearchHit**

Agregar esta función justo antes de `HitRow`:

```tsx
import { BarChart, Bar, Cell } from 'recharts'

function qualityDims(hit: SearchHit): { label: string; value: number; color: string }[] {
  const anioScore = hit.anio
    ? Math.max(0.15, Math.min(1, (hit.anio - 2000) / 24))
    : 0.15
  const calidadScore =
    hit.calidad === 'Completa' ? 1
    : hit.calidad === 'Parcial' ? 0.55
    : 0.15

  const color = (v: number) =>
    v >= 0.7 ? 'var(--gap-cov)' : v >= 0.4 ? 'var(--gap-part)' : 'var(--ink-faint)'

  return [
    { label: 'org',  value: hit.fuente ? 0.9 : 0.15,  color: color(hit.fuente ? 0.9 : 0.15) },
    { label: 'geo',  value: hit.pais   ? 0.9 : 0.15,  color: color(hit.pais   ? 0.9 : 0.15) },
    { label: 'año',  value: anioScore,                 color: color(anioScore) },
    { label: 'meta', value: calidadScore,              color: color(calidadScore) },
  ]
}
```

- [ ] **Reemplazar el bloque `hit-sim-wrap` en `HitRow`**

```tsx
// Reemplazar:
<div className="hit-sim-wrap">
  <span className="hit-sim-label">relevancia</span>
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
  <span
    className="hit-sim-pct"
    title={`Similitud semántica con tu consulta: ${(hit.similitud * 100).toFixed(1)}%`}
  >
    {normalizedSim >= 0.66 ? 'alta' : normalizedSim >= 0.33 ? 'media' : 'baja'}
  </span>
</div>

// Con:
<div className="hit-sim-wrap" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  <span className="hit-sim-label">calidad</span>
  <BarChart
    width={80}
    height={32}
    data={qualityDims(hit)}
    margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
    style={{ opacity: animated ? 1 : 0, transition: `opacity 0.4s ease ${index * 60}ms` }}
  >
    <Bar dataKey="value" isAnimationActive animationBegin={index * 80} animationDuration={600} radius={[2, 2, 0, 0]}>
      {qualityDims(hit).map((d, i) => (
        <Cell key={i} fill={d.color} />
      ))}
    </Bar>
  </BarChart>
  <span
    className="hit-sim-pct"
    title={`Similitud semántica: ${(hit.similitud * 100).toFixed(1)}%`}
  >
    {normalizedSim >= 0.66 ? 'alta' : normalizedSim >= 0.33 ? 'media' : 'baja'}
  </span>
</div>
```

- [ ] **Correr tests**

```bash
npm test -- --run src/test/MonitorBrechas.test.tsx
```

- [ ] **Verificar en navegador** — buscar una pregunta, confirmar que cada resultado tiene 4 barras mini animadas y la etiqueta alta/media/baja.

- [ ] **Commit**

```bash
git add src/pages/MonitorBrechas.tsx
git commit -m "feat: replace HitRow similarity bar with animated quality BarChart (org/geo/año/meta)"
```

---

### Task 5: MonitorColectivo — Delta + sparkline en AgendaCard

**Files:**
- Modify: `src/pages/MonitorColectivo.tsx`

- [ ] **Importar `useEvolucionStats` y `LineChart`**

Al inicio de `MonitorColectivo.tsx`, agregar:

```tsx
import { useEvolucionStats } from '../hooks/useEvolucionStats'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
```

- [ ] **Llamar al hook en el componente principal**

En `MonitorColectivo`, agregar después de `useMonitorStats`:

```tsx
const { semanas } = useEvolucionStats()
```

- [ ] **Agregar helper para derivar datos de sparkline**

Justo antes de `AgendaCard`, agregar:

```tsx
type AgendaKey = 'tecnologica' | 'datos' | 'genero'

function agendaSparkData(semanas: SemanaStats[], agKey: AgendaKey) {
  return semanas.slice(-8).map(s => ({ v: s.por_agenda[agKey].score_avg }))
}

function agendaDelta(semanas: SemanaStats[], agKey: AgendaKey): number | null {
  if (semanas.length < 2) return null
  const last = semanas[semanas.length - 1].por_agenda[agKey].score_avg
  const prev = semanas[semanas.length - 2].por_agenda[agKey].score_avg
  return last - prev
}
```

Agregar también el import del tipo `SemanaStats`:
```tsx
import type { AgendaStat, TopicStat, ColectivoFiltros, SemanaStats } from '../types'
```

- [ ] **Actualizar la interfaz y el cuerpo de `AgendaCard`**

```tsx
// Cambiar la interfaz:
function AgendaCard({ a, semanas }: { a: AgendaStat; semanas: SemanaStats[] }) {

  // a.id es 'tecnologica' | 'datos' | 'genero' — coincide con AgendaKey directamente
  const agKey = a.id as AgendaKey

  const sparkData = agendaSparkData(semanas, agKey)
  const delta = agendaDelta(semanas, agKey)

  const totalCalidad = a.calidad_dist.Completa + a.calidad_dist.Parcial + a.calidad_dist.Nula || 1
  const pct = (n: number) => `${Math.round((n / totalCalidad) * 100)}%`
```

- [ ] **Reemplazar el bloque de score en AgendaCard** para agregar delta y sparkline

Reemplazar el bloque que muestra `a.datasets_en_agenda` hasta el cierre del score:

```tsx
      {/* Score + delta + sparkline */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <div className="agenda-monitor-total" style={{ color: a.color }}>{a.datasets_en_agenda}</div>
            <Tooltip text="Datasets clasificados bajo esta agenda en el corpus." />
          </div>
          <div className="agenda-monitor-label" style={{ color: 'var(--ink-light)' }}>datasets en esta agenda</div>
          {delta !== null && (
            <div style={{
              fontSize: 12, fontFamily: 'var(--mono)', marginTop: 4,
              color: delta > 0 ? 'var(--gap-crit)' : delta < 0 ? 'var(--gap-cov)' : 'var(--ink-light)',
            }}>
              {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {Math.abs(Math.round(delta * 100))}% esta semana
            </div>
          )}
        </div>
        {sparkData.length > 1 && (
          <LineChart width={100} height={36} data={sparkData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <Line
              type="monotone"
              dataKey="v"
              stroke={a.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive
            />
          </LineChart>
        )}
      </div>
```

- [ ] **Pasar `semanas` a `AgendaCard` en el render**

Buscar en el JSX de `MonitorColectivo`:
```tsx
{agendas.map(a => <AgendaCard key={a.id} a={a} />)}
```
Cambiar a:
```tsx
{agendas.map(a => <AgendaCard key={a.id} a={a} semanas={semanas} />)}
```

- [ ] **Correr tests**

```bash
npm test -- --run src/test/MonitorColectivo.test.tsx
```

- [ ] **Verificar en navegador** — abrir `/colectivo`, confirmar que las cards muestran el delta y el sparkline cuando hay datos.

- [ ] **Commit**

```bash
git add src/pages/MonitorColectivo.tsx
git commit -m "feat: add weekly delta and sparkline LineChart to AgendaCard in MonitorColectivo"
```

---

### Task 6: Diagnóstico — Limpieza CSS print

**Files:**
- Modify: `src/pages/Diagnostico.tsx`
- Modify: `src/styles/app.css`

- [ ] **Mejorar jerarquía tipográfica en Diagnostico.tsx**

Buscar el bloque del título del diagnóstico (línea ~120 aprox.) y asegurarse que:

```tsx
// El título principal usa serif
<h1 style={{ fontFamily: 'var(--serif)', fontSize: '1.6rem', marginBottom: '0.25rem', color: 'var(--ink)' }}>
  {context.titulo}
</h1>

// Subtítulo con mono
<p style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--ink-light)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
  Diagnóstico · {chips.join(' · ')}
</p>
```

- [ ] **Agregar separadores entre secciones** en Diagnostico.tsx

Antes de cada sección mayor (Framing, Marcos, Acciones, Datasets, Normativas), agregar un `<hr>` con estilo:

```tsx
<hr style={{ border: 'none', borderTop: '1px solid var(--ink-faint)', margin: '1.5rem 0' }} />
```

- [ ] **Mejorar `@media print` en `src/styles/app.css`**

Buscar el bloque `@media print` existente y actualizarlo:

```css
@media print {
  nav, .header, .btn-export-pdf, .chip-bar { display: none !important; }

  body { background: white; }

  .diagnostico-page {
    max-width: 100%;
    padding: 0;
    margin: 0;
  }

  .diagnostico-dataset,
  .diagnostico-normativa,
  .diagnostico-marco {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .diagnostico-marco-cita {
    background: #f8f8f8 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .gap-category-badge {
    border: 1px solid currentColor;
    background: transparent !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

- [ ] **Correr todos los tests**

```bash
npm test -- --run
```

Resultado esperado: `Tests 106 passed (106)`

- [ ] **Build limpio**

```bash
npm run build
```

Resultado esperado: sin errores ni warnings críticos.

- [ ] **Commit final**

```bash
git add src/pages/Diagnostico.tsx src/styles/app.css
git commit -m "style: clean up Diagnostico print layout — typography hierarchy + print media fixes"
```

---

## Checklist de no-regresión

- [ ] 106 tests pasando
- [ ] `npm run build` sin errores
- [ ] `/datos` — ComposedChart visible con barras por agenda + línea de total
- [ ] `/brechas` — Gauge con gradiente y marcador; mini BarCharts en resultados
- [ ] `/colectivo` — Cards con delta semanal y sparkline
- [ ] `/diagnostico` — Secciones bien separadas, imprime limpio
