# Loading Skeletons + Textos + Tipografía — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar skeleton loading states en Monitor Colectivo y Datos Queremos, actualizar textos de MonitorBrechas sincronizados con el monolito, quitar conteos de preguntas del Monitor Colectivo, y aumentar tamaños tipográficos globalmente.

**Architecture:** Nuevo componente `Skeleton.tsx` con un primitive pulsante y tres shapes compuestos; MonitorColectivo y DatosQueremos consumen los shapes mientras `!isReady`; MonitorBrechas solo recibe cambios de texto/labels. CSS global recibe la animación skeleton y los nuevos tamaños de fuente.

**Tech Stack:** React + TypeScript, CSS custom properties en `src/styles/app.css`, Vitest para tests existentes.

---

## Files

| Acción | Archivo | Responsabilidad |
|--------|---------|-----------------|
| Modify | `src/styles/app.css` | `@keyframes skeleton-pulse`, `.skeleton` class, font sizes |
| Create | `src/components/Skeleton.tsx` | Primitive + SkeletonMetricsBand, SkeletonAgendaGrid, SkeletonTopicGrid |
| Modify | `src/pages/MonitorColectivo.tsx` | Integrar skeletons, quitar conteos de preguntas |
| Modify | `src/pages/DatosQueremos.tsx` | Integrar skeleton mientras !isReady |
| Modify | `src/pages/MonitorBrechas.tsx` | Textos, callout, chips label, col headers |

---

## Task 1: CSS — animación skeleton + tamaños tipográficos

**Files:**
- Modify: `src/styles/app.css:126-143` (hero h1, hero-sub)
- Modify: `src/styles/app.css:537-544` (mapa-section-title)
- Modify: `src/styles/app.css:1187-1193` (section-description)
- Add: nueva sección con `@keyframes skeleton-pulse` y `.skeleton`

- [ ] **Step 1: Actualizar `.hero h1` font-size**

En `src/styles/app.css` línea 128, cambiar:
```css
.hero h1 {
  font-family: var(--serif);
  font-size: clamp(2.8rem, 6vw, 4.2rem);
  line-height: 1.1;
  letter-spacing: -0.03em;
  color: var(--ink);
  margin-bottom: 12px;
  max-width: 600px;
}
```

- [ ] **Step 2: Actualizar `.hero-sub` font-size**

En `src/styles/app.css` línea 138, cambiar:
```css
.hero-sub {
  font-size: 16px;
  color: var(--ink-mid);
  max-width: 520px;
  line-height: 1.65;
}
```

- [ ] **Step 3: Actualizar `.mapa-section-title` font-size**

En `src/styles/app.css` línea 537, cambiar:
```css
.mapa-section-title {
  font-family: var(--mono);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--accent);
  margin-bottom: 12px;
}
```

- [ ] **Step 4: Actualizar `.section-description` font-size**

En `src/styles/app.css` línea 1187, cambiar:
```css
.section-description {
  font-size: 15px;
  font-family: var(--mono);
  color: var(--ink-light);
  margin-bottom: 1rem;
  line-height: 1.6;
}
```

- [ ] **Step 5: Agregar animación skeleton al final de app.css**

Agregar al final de `src/styles/app.css`:
```css
/* ═══ Skeleton loading ═══ */

@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.45; }
}

.skeleton {
  background: var(--ink-faint);
  border-radius: 4px;
  animation: skeleton-pulse 1.4s ease-in-out infinite;
}
```

- [ ] **Step 6: Verificar build limpio**

```bash
npm run build 2>&1 | tail -5
```
Esperado: `✓ built in` sin errores TypeScript.

- [ ] **Step 7: Commit**

```bash
git add src/styles/app.css
git commit -m "style: skeleton animation + larger typography (h1, hero-sub, section-description)"
```

---

## Task 2: Crear `src/components/Skeleton.tsx`

**Files:**
- Create: `src/components/Skeleton.tsx`

- [ ] **Step 1: Crear el archivo con primitive y tres shapes**

Crear `src/components/Skeleton.tsx`:
```tsx
import type { CSSProperties } from 'react'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  rounded?: boolean
  style?: CSSProperties
}

export function Skeleton({ width = '100%', height = 16, rounded = false, style }: SkeletonProps) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: rounded ? 999 : 4, ...style }}
    />
  )
}

export function SkeletonMetricsBand() {
  return (
    <div className="metrics-band">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="metrics-band-card">
          <Skeleton height={36} width="55%" style={{ marginBottom: 8 }} />
          <Skeleton height={11} width="75%" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonAgendaGrid() {
  return (
    <div className="monitor-grid">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="agenda-monitor-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Skeleton height={10} width="40%" />
          <Skeleton height={32} width="50%" />
          <Skeleton height={8} width="70%" />
          <Skeleton height={10} width="100%" />
          <Skeleton height={10} width="90%" />
          <Skeleton height={10} width="80%" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTopicGrid() {
  return (
    <div className="mapa-grid">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="topic-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton height={12} width="65%" />
          <Skeleton height={42} width="45%" />
          <Skeleton height={10} width="55%" />
          <Skeleton height={10} width="80%" />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verificar compilación TypeScript**

```bash
npm run build 2>&1 | tail -5
```
Esperado: `✓ built in` sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/Skeleton.tsx
git commit -m "feat: add Skeleton primitive and SkeletonMetricsBand/AgendaGrid/TopicGrid shapes"
```

---

## Task 3: MonitorColectivo — skeletons + quitar conteos de preguntas

**Files:**
- Modify: `src/pages/MonitorColectivo.tsx`

Los tres cambios son en el mismo archivo, se hacen juntos y se commitean juntos.

- [ ] **Step 1: Agregar imports de Skeleton**

Al inicio de `src/pages/MonitorColectivo.tsx`, agregar al import block existente:
```tsx
import { SkeletonMetricsBand, SkeletonAgendaGrid, SkeletonTopicGrid } from '../components/Skeleton'
```

- [ ] **Step 2: Quitar totalPreguntas del destructuring del hook**

En `MonitorColectivo()` (línea ~146), cambiar:
```tsx
const { agendas, topics, totalPreguntas, totalDatasets, totalNormativas, paises, isReady, error } = useMonitorStats(filtros)
```
por:
```tsx
const { agendas, topics, totalDatasets, totalNormativas, paises, isReady, error } = useMonitorStats(filtros)
```

- [ ] **Step 3: Actualizar hero-sub a texto estático**

En el bloque `<div className="hero">`, cambiar el `<p className="hero-sub">` completo:
```tsx
<p className="hero-sub">
  Cada pregunta ingresada contribuye al mapa común de brechas.
</p>
```
(eliminar la expresión condicional con totalPreguntas)

- [ ] **Step 4: Quitar footer de preguntas en AgendaCard**

En `AgendaCard`, eliminar el bloque completo (línea ~106):
```tsx
{/* ELIMINAR este div: */}
<div style={{ marginTop: 10, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-light)' }}>
  {a.total} preguntas han explorado esta agenda
</div>
```

- [ ] **Step 5: Quitar conteo de preguntas en TopicCard**

En `TopicCard`, en el bloque `.topic-meta`, eliminar el fragmento condicional:
```tsx
{/* ELIMINAR: */}
{t.preguntas_relacionadas > 0 && (
  <><span>·</span><span>{t.preguntas_relacionadas} preguntas</span></>
)}
```

- [ ] **Step 6: Integrar skeletons en el return principal**

En `MonitorColectivo()`, reemplazar las secciones de agendas y tópicos con render condicional. El bloque completo de secciones (desde MetricsBand hasta el final del `<main>`) queda:

```tsx
{isReady ? (
  <MetricsBand
    totalDatasets={totalDatasets}
    totalNormativas={totalNormativas}
    topics={topics}
  />
) : (
  <SkeletonMetricsBand />
)}

<p className="mapa-section-title">Brechas por Agenda</p>
<p className="section-description">
  Cada agenda agrupa los datasets según el marco temático al que pertenecen.
  La barra de calidad indica qué porcentaje de los datasets tiene metadatos completos, parciales o nulos.
</p>
{isReady ? (
  <div className="monitor-grid">
    {agendas.map(a => <AgendaCard key={a.id} a={a} />)}
  </div>
) : (
  <SkeletonAgendaGrid />
)}

<p className="mapa-section-title">Brechas por Tópico</p>
<p className="section-description">
  El score de brecha mide qué tan cubierto está cada tópico en el corpus — mayor % = menos cubierto.
  0% = completamente cubierto · 100% = brecha crítica sin datos.
</p>
{isReady ? (
  <div className="mapa-grid">
    {topics.map(t => <TopicCard key={t.id} t={t} />)}
  </div>
) : (
  <SkeletonTopicGrid />
)}
```

- [ ] **Step 7: Correr tests existentes para verificar que no rompimos nada**

```bash
npm run test -- --reporter=verbose 2>&1 | tail -20
```
Esperado: los tests de `MonitorColectivo.test.tsx` (`calcTopicsCriticas`, `calcCoberturaMedia`) siguen pasando — no fueron tocados.

- [ ] **Step 8: Build limpio**

```bash
npm run build 2>&1 | tail -5
```
Esperado: `✓ built in` sin errores TypeScript.

- [ ] **Step 9: Commit**

```bash
git add src/pages/MonitorColectivo.tsx
git commit -m "feat: skeleton loading in MonitorColectivo + remove question counts"
```

---

## Task 4: DatosQueremos — skeleton mientras carga

**Files:**
- Modify: `src/pages/DatosQueremos.tsx`

- [ ] **Step 1: Agregar imports de Skeleton**

Al inicio de `src/pages/DatosQueremos.tsx`, agregar:
```tsx
import { Skeleton } from '../components/Skeleton'
```

- [ ] **Step 2: Agregar skeleton state en el return**

En `DatosQueremos()`, antes del bloque `{semanas.length > 0 && (`, agregar un bloque de skeleton para el caso `!isReady`:

```tsx
{!isReady && !error && (
  <div className="datos-layout">
    <aside className="datos-sidebar">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Skeleton height={36} width="70%" />
        <Skeleton height={36} width="80%" />
        <Skeleton height={80} width="100%" style={{ marginTop: 8 }} />
        <Skeleton height={80} width="100%" />
      </div>
    </aside>
    <div className="datos-main">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '1rem' }}>
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} height={32} width="100%" />
        ))}
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 3: Correr tests**

```bash
npm run test -- --reporter=verbose 2>&1 | tail -20
```
Esperado: todos los tests pasan.

- [ ] **Step 4: Build limpio**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/DatosQueremos.tsx
git commit -m "feat: skeleton loading state in DatosQueremos"
```

---

## Task 5: MonitorBrechas — textos, callout, chips, col headers

**Files:**
- Modify: `src/pages/MonitorBrechas.tsx`

Todos los cambios son de texto/JSX en el mismo archivo.

- [ ] **Step 1: Actualizar eyebrow y h1 (incluye el estado de carga del embedder)**

En el bloque de `embedderStatus === 'loading' || embedderStatus === 'error'` (línea ~366), cambiar:
```tsx
<p className="hero-eyebrow">Monitor de Brechas</p>
<h1>¿Qué datos <em>faltan</em>?</h1>
```
por:
```tsx
<p className="hero-eyebrow">Monitoreo de brechas</p>
<h1>¿Qué datos nos <em>faltan</em>?</h1>
```

En el bloque principal del return (línea ~401), cambiar:
```tsx
<p className="hero-eyebrow">Monitor de Brechas</p>
<h1>¿Qué datos <em>faltan</em>?</h1>
<p className="hero-sub">Escribe una pregunta sobre datos de género en América Latina.</p>
```
por:
```tsx
<p className="hero-eyebrow">Monitoreo de brechas</p>
<h1>¿Qué datos nos <em>faltan</em>?</h1>
<p className="hero-sub">
  Escribí una pregunta sobre datos de género que te interese. El monitor busca qué datos existen,
  qué exige la normativa vigente y dónde está la brecha de datos teniendo en cuenta tu info.
</p>
<div style={{
  marginTop: '1.25rem',
  padding: '.75rem 1rem',
  borderLeft: '3px solid var(--accent)',
  borderRadius: '0 var(--r) var(--r) 0',
  background: 'var(--paper)',
}}>
  <p style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--accent)', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 5 }}>
    * ¿Por qué te solicitamos una pregunta?
  </p>
  <p style={{ fontSize: 13, color: 'var(--ink-light)', lineHeight: 1.7 }}>
    El objetivo del monitor es poner en evidencia qué datos tenemos vs qué datos queremos.
    DCL pone la lupa en la primera instancia de cualquier proceso de recolección de datos,
    el problema detrás de esos datos. En el ciclo de datos esa primera fase se llama{' '}
    <em style={{ color: 'var(--ink-mid)' }}>problematización</em> y es allí donde queremos incidir.
  </p>
</div>
```

- [ ] **Step 2: Actualizar ChipsBar — label y agregar subtítulo**

En `ChipsBar` (línea ~319), cambiar:
```tsx
<span className="chips-bar-label">Agenda de incidencia</span>
```
por:
```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
  <span className="chips-bar-label">Termómetro de Incidencia</span>
  <span style={{ fontSize: 12, color: 'var(--ink-light)', fontFamily: 'var(--sans)' }}>
    Elegí hacia dónde querés llevar esta brecha.
  </span>
</div>
```

- [ ] **Step 3: Actualizar col headers en ResultsColumns**

En `ResultsColumns` (línea ~267), cambiar:
```tsx
<span className="label-mono">Datasets</span>
```
por:
```tsx
<span className="label-mono">Datasets disponibles</span>
```

Y cambiar:
```tsx
<span className="label-mono">Normativas</span>
```
por:
```tsx
<span className="label-mono">Marcos normativos relevantes</span>
```

- [ ] **Step 4: Correr tests existentes**

```bash
npm run test -- --reporter=verbose 2>&1 | tail -20
```
Esperado: `normalizeSimToMax` tests pasan, todos los demás también.

- [ ] **Step 5: Build limpio**

```bash
npm run build 2>&1 | tail -5
```
Esperado: `✓ built in` sin errores TypeScript.

- [ ] **Step 6: Commit**

```bash
git add src/pages/MonitorBrechas.tsx
git commit -m "feat: update MonitorBrechas texts — eyebrow, h1, hero-sub, callout explicativo, chips, col headers"
```

---

## Self-Review

**Spec coverage:**
- [x] Skeleton primitive + 3 shapes → Task 2
- [x] MonitorColectivo skeletons mientras !isReady → Task 3
- [x] DatosQueremos skeleton mientras !isReady → Task 4
- [x] MonitorColectivo: quitar totalPreguntas hero-sub → Task 3, Step 3
- [x] MonitorColectivo: quitar AgendaCard footer preguntas → Task 3, Step 4
- [x] MonitorColectivo: quitar TopicCard meta preguntas → Task 3, Step 5
- [x] MonitorColectivo: section titles "Brechas por Agenda / Tópico" → Task 3, Step 6
- [x] CSS @keyframes skeleton-pulse + .skeleton class → Task 1, Step 5
- [x] hero h1 clamp(2.8rem, 6vw, 4.2rem) → Task 1, Step 1
- [x] hero-sub 16px → Task 1, Step 2
- [x] section-description 15px → Task 1, Step 4
- [x] MonitorBrechas eyebrow/h1/hero-sub → Task 5, Step 1
- [x] MonitorBrechas callout explicativo → Task 5, Step 1
- [x] ChipsBar label "Termómetro de Incidencia" + sub → Task 5, Step 2
- [x] Col headers "Datasets disponibles" / "Marcos normativos relevantes" → Task 5, Step 3

**Placeholder scan:** Ningún TBD o placeholder detectado.

**Type consistency:** `SkeletonMetricsBand`, `SkeletonAgendaGrid`, `SkeletonTopicGrid` definidos en Task 2, importados en Tasks 3. `Skeleton` (primitive) definido en Task 2, importado en Task 4.
