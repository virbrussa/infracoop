# Refactorización de Contenido e IU — Infra.Coop

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Actualizar paleta de colores, textos en español latino neutro, footer con créditos y licencia, hovers visibles, filtro mensual, inversión visual del score de brecha y campos nuevos en el formulario de aportes.

**Architecture:** 6 tareas independientes sobre archivos CSS y React. Sin cambios de backend ni migraciones de DB. El filtro mensual agrupa semanas ISO existentes en meses calendario solo en la UI. Los nuevos campos del formulario se almacenan en la columna `ingresado_por` existente (concatenación) — sin tocar dataService ni Supabase.

**Tech Stack:** React 18 + TypeScript, Vite, CSS Custom Properties, Recharts, Supabase (no se toca en este plan).

---

## Mapa de archivos

| Archivo | Qué cambia |
|---|---|
| `src/styles/tokens.css` | Reemplaza paleta ink + accent con 7 nuevos hex |
| `src/styles/app.css` | Audita y arregla todos los `:hover`; agrega `.mes-selector` |
| `src/components/Layout.tsx` | Agrega footer con créditos, enlace Diversa y licencia BY-NC-SA |
| `src/pages/Landing.tsx` | Nuevos textos, hipervínculos, títulos de sección |
| `src/pages/MonitorColectivo.tsx` | Quita dots leyenda, nuevas descripciones, score visual invertido |
| `src/pages/DatosQueremos.tsx` | Reemplaza RangoSelector por MesSelector; hero-sub actualizado |
| `src/pages/IngresoForm.tsx` | Título, bajada, campos email + alias, texto de reconocimiento |
| `src/test/DatosQueremos.test.tsx` | Tests para `isoWeekToYearMonth`, `getUniqueMeses`, `filterSemanasByMes` |
| `src/test/MonitorColectivo.test.tsx` | Actualiza expectativas de score (100 − brecha) |

---

## Task 1: Tokens CSS — Nueva paleta de colores

**Files:**
- Modify: `src/styles/tokens.css`

- [ ] **Step 1: Reemplazar las variables ink y accent**

Abrir `src/styles/tokens.css`. Reemplazar exactamente las líneas del bloque `/* ── Ink scale ── */` y `/* ── Brand / accent ── */`:

```css
/* ── Ink scale (purple-tinted neutrals) ── */
--ink:        #3F1C6A;
--ink-mid:    #4B2575;
--ink-light:  #8E6BB3;
--ink-faint:  #E6DEF1;

/* ── Surfaces ── */
--paper:      #FAF7F2;
--paper-warm: #F5F0FF;
--surface:    #FFFFFF;

/* ── Brand / accent ── */
--accent:       #7A4FA3;
--accent-hover: #6A3E91;
--accent-deep:  #5B2E86;
--accent-muted: #A07CC2;
--accent-bg:    #F5F0FF;
```

También actualizar `--agenda-genero` en la misma sección de agenda colors:

```css
--agenda-genero:     #7A4FA3;   /* plum actualizado */
--agenda-genero-bg:  #F5F0FF;
```

- [ ] **Step 2: Verificar que el build compila sin errores**

```bash
cd /home/davas/Documents/InfraCoopDashboard && npm run build 2>&1 | tail -20
```
Esperado: `✓ built in` sin errores TypeScript.

- [ ] **Step 3: Commit**

```bash
git add src/styles/tokens.css
git commit -m "feat: update design token palette to new purple scale"
```

---

## Task 2: App CSS — Auditoría y corrección de hovers

**Files:**
- Modify: `src/styles/app.css`

Se reemplazan/mejoran los estados `:hover` y `:focus` para que sean completamente visibles con la nueva paleta, en escritura normal (sin forzar mayúsculas donde no corresponde).

- [ ] **Step 1: Arreglar hover del botón primario**

Localizar y reemplazar en `tokens.css` (ya hecho en Task 1) y en `app.css`:

```css
/* ANTES: */
.btn-primary:hover { background: var(--ink); }

/* DESPUÉS: */
.btn-primary:hover { background: var(--accent-hover); }
```

- [ ] **Step 2: Mejorar hover de nav-pill (agregar fondo)**

```css
/* ANTES: */
.nav-pill:hover { border-color: var(--accent); }

/* DESPUÉS: */
.nav-pill:hover { border-color: var(--accent); background: var(--accent-bg); color: var(--accent); }
```

- [ ] **Step 3: Mejorar hover del chip (usar accent, no ink crudo)**

```css
/* ANTES: */
.chip:hover { border-color: var(--ink); color: var(--ink); }

/* DESPUÉS: */
.chip:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-bg); }
```

- [ ] **Step 4: Mejorar hover de semana-tab**

```css
/* ANTES: */
.semana-tab:hover { border-color: var(--accent); color: var(--accent); }

/* DESPUÉS: */
.semana-tab:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-bg); }
```

- [ ] **Step 5: Agregar hover a topic-card con color explícito**

```css
/* ANTES: */
.topic-card:hover { border-color: var(--accent); transform: translateY(-2px); }

/* DESPUÉS: */
.topic-card:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: 0 2px 8px rgba(122,79,163,.12); }
```

- [ ] **Step 6: Hacer bold los títulos de sección (`.mapa-section-title`) y aumentar tamaño del label de tópico**

En `app.css`, localizar `.mapa-section-title` y agregar `font-weight: 700`:

```css
.mapa-section-title {
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--accent);
  margin-bottom: 12px;
}
```

También localizar `.topic-card-label` y aumentar de 12px a 14px con bold explícito:

```css
.topic-card-label {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink-mid);
  margin-bottom: 8px;
}
```

- [ ] **Step 7: Agregar estilos CSS para el MesSelector (Task 6 los usará)**

Agregar al final de la sección `/* ═══ Phase 6 — DatosQueremos layout ═══ */`:

```css
/* ── Mes selector ── */
.mes-selector {
  background: var(--surface);
  border: 1px solid var(--ink-faint);
  border-radius: var(--r);
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.mes-selector-title {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--ink-light);
  margin-bottom: .75rem;
}

.mes-select {
  font-family: var(--mono);
  font-size: 13px;
  padding: 5px 8px;
  border: 1px solid var(--ink-faint);
  border-radius: var(--r);
  background: white;
  color: var(--ink);
  cursor: pointer;
  width: 100%;
}

.mes-select:focus { outline: 2px solid var(--accent); border-color: var(--accent); }
```

- [ ] **Step 7: Verificar build**

```bash
npm run build 2>&1 | tail -10
```
Esperado: sin errores.

- [ ] **Step 9: Commit**

```bash
git add src/styles/app.css
git commit -m "fix: improve hover visibility, bold section titles, larger topic labels"
```

---

## Task 3: Layout — Footer global con créditos y licencia

**Files:**
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: Reescribir Layout.tsx con footer**

Reemplazar el contenido completo de `src/components/Layout.tsx`:

```tsx
interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <>
      <main className="container">{children}</main>
      <footer style={{
        borderTop: '1px solid var(--ink-faint)',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.5rem',
        fontFamily: 'var(--mono)',
        fontSize: '11px',
        color: 'var(--ink-light)',
        maxWidth: 1000,
        margin: '0 auto',
      }}>
        <span>
          Diseño Data Cooperativas Latina, Desarrollo e Implementación{' '}
          <a
            href="https://diversa.studio/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent)', textDecoration: 'underline' }}
          >
            Diversa
          </a>
        </span>
        <span>DataCooperativas Latinas. BY-NC-SA</span>
      </footer>
    </>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat: add global footer with credits and BY-NC-SA license"
```

---

## Task 4: Landing — Textos, hipervínculos y títulos en español latino neutro

**Files:**
- Modify: `src/pages/Landing.tsx`

Cambios:
- Hero: enlazar "Data Cooperativas Latinas" → `https://datacooperativas.lat/`
- Sección 01 "La pregunta como evidencia": nuevo texto en 3 párrafos
- Sección 02: título → "¿Qué datos tenemos?", texto nuevo con TU PREGUNTA en negrita e incisos a) / b)
- Sección "Otras ideas": título → "Otras ideas para Infra.Coop", agregar contacto al pie

- [ ] **Step 1: Reescribir Landing.tsx**

Reemplazar el contenido completo de `src/pages/Landing.tsx`:

```tsx
import { Layout } from '../components/Layout'
import { useLandingStats } from '../hooks/useLandingStats'

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

function StatsStrip({ datasets, normativas, preguntas, isLoading, error }: {
  datasets: number; normativas: number; preguntas: number; isLoading: boolean; error?: string | null
}) {
  if (error) {
    return (
      <div style={{ padding: '1.25rem 0', borderTop: '1px solid var(--ink-faint)', borderBottom: '1px solid var(--ink-faint)', marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-light)' }}>
          — estadísticas no disponibles —
        </p>
      </div>
    )
  }

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

export function Landing() {
  const { datasets, normativas, preguntas, isLoading, error: statsError } = useLandingStats()

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
            Infra.Coop es la dimensión tecnosocial de{' '}
            <a
              href="https://datacooperativas.lat/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent)', textDecoration: 'underline', fontWeight: 600 }}
            >
              Data Cooperativas Latinas
            </a>
            . Una infraestructura digital inclusiva basada en los conceptos y modelo de gobernanza de datos cooperativos.
          </p>
        </div>

        {/* Live stats */}
        <StatsStrip
          datasets={datasets}
          normativas={normativas}
          preguntas={preguntas}
          isLoading={isLoading}
          error={statsError}
        />

        {/* Monitor de Brechas */}
        <Section eyebrow="01 · Monitor de Brechas" title="La pregunta como evidencia">
          <p style={{ marginBottom: '1rem' }}>
            El propósito es evidenciar el rol que juega la problematización situada, oportuna y real en el estado actual y futuro de los datos de género que queremos.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            La pregunta como elemento inicial de un proceso que podemos llamar el Ciclo de Datos es vital para cambiar el estado de situación de las brechas, pero también para demostrar cómo —al integrar el conocimiento territorial, los problemas situados e interseccionales— el criterio de calidad de un dato se torna otro. Uno más acorde con los datos que necesitamos para visibilizar lo que falta, fortalecer lo que ya es un derecho o incidir en el devenir de la agenda pública.
          </p>
          <p>
            <strong>La(s) pregunta(s)</strong> como inquietud-acción disparadora enfatiza la urgencia, pertinencia y oportunidad de los datos cooperativos para contar con los <strong>datos que queremos</strong>.
          </p>
        </Section>

        {/* ¿Qué datos tenemos? */}
        <Section eyebrow="02 · Monitor Colectivo" title="¿Qué datos tenemos?">
          <p style={{ marginBottom: '1rem' }}>
            Al ingresar <strong>tu pregunta</strong> contribuyes a crear evidencia colectiva sobre el estado actual de la agenda común de datos de género, tecnología y de datos propiamente dichos.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            En esta instancia se contrasta el aporte colectivo con dos elementos de la Base de Datos de Infra.Coop:
          </p>
          <p style={{ marginBottom: '.5rem', paddingLeft: '1rem', borderLeft: '2px solid var(--ink-faint)' }}>
            <strong>a)</strong> Por un lado sistematizamos datasets temáticos.
          </p>
          <p style={{ marginBottom: '1rem', paddingLeft: '1rem', borderLeft: '2px solid var(--ink-faint)' }}>
            <strong>b)</strong> Por otro lado curamos distintos marcos normativos vigentes a nivel nacional, regional e internacional inherentes a dicha agenda.
          </p>
          <p>
            A medida que se suman preguntas, el monitor colectivo visualizará los cambios en el estado de situación de los datos disponibles identificando brechas de distinta naturaleza.
          </p>
        </Section>

        {/* Los datos que queremos */}
        <Section eyebrow="03 · ¿Qué datos queremos?" title="Evolución de la demanda colectiva">
          <p>
            En este apartado el algoritmo cooperativo llega a su meta (al menos por ahora). La lupa está puesta en la evolución entre los datos que tenemos y los datos que queremos — seguida mes a mes por pregunta y por agenda.
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
            Otras ideas para Infra.Coop
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
          <p style={{ marginTop: '1.5rem', fontSize: 13, color: 'var(--ink-mid)', lineHeight: 1.7 }}>
            ¿Te interesa aportar o sugerir otras ideas?{' '}
            <a
              href="mailto:datacooperativas@gmail.com"
              style={{ color: 'var(--accent)', textDecoration: 'underline' }}
            >
              datacooperativas@gmail.com
            </a>
          </p>
        </section>

      </div>
    </Layout>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 3: Correr tests**

```bash
npm test -- --run 2>&1 | tail -20
```
Esperado: todos los tests en verde (Landing no tiene tests unitarios propios).

- [ ] **Step 4: Commit**

```bash
git add src/pages/Landing.tsx
git commit -m "feat: update Landing texts to neutral Latin Spanish with new section content"
```

---

## Task 5: MonitorColectivo — Leyenda, descripciones y score visual invertido

**Files:**
- Modify: `src/pages/MonitorColectivo.tsx`
- Modify: `src/test/MonitorColectivo.test.tsx` (actualizar expectativas de score)

Cambios:
1. Quitar `<span className="calidad-dot">` de la leyenda en `AgendaCard`
2. Nueva descripción para "Brechas por Agenda"
3. Nueva descripción para "Brechas por Tópico"
4. `TopicCard`: mostrar `100 - Math.round(t.gap_score * 100)` como "cobertura" con leyendas ajustadas
5. `MetricsBand`: centrar con `justify-content: center`; aumentar `--metrics-band-num` font a `2.5rem` en las cards de "total entradas" y "cobertura media"

- [ ] **Step 1: Actualizar AgendaCard — quitar dots de la leyenda**

En `AgendaCard`, localizar el bloque `.calidad-legend` (líneas ~136–140) y reemplazarlo:

```tsx
<div className="calidad-legend">
  <span>{a.calidad_dist.Completa} completos</span>
  <span>{a.calidad_dist.Parcial} parciales</span>
  <span>{a.calidad_dist.Nula} nulos</span>
</div>
```

- [ ] **Step 2: Actualizar TopicCard — invertir score, nuevas etiquetas**

Reemplazar la función `TopicCard` completa:

```tsx
function TopicCard({ t }: { t: TopicStat }) {
  const colors = { critica: 'var(--gap-crit)', parcial: 'var(--gap-part)', cubierta: 'var(--gap-cov)' }
  const labels = { critica: 'sin datos', parcial: 'dato insuficiente', cubierta: 'bien cubierto' }
  const color = colors[t.categoria]
  const cobertura = 100 - Math.round(t.gap_score * 100)

  return (
    <div className="topic-card">
      <div className="topic-card-label">{t.label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <div className="topic-score-big" style={{ color }}>{cobertura}</div>
        <Tooltip text="Score de cobertura: 100 = tópico completamente cubierto en el corpus. 0 = brecha crítica, sin datos disponibles." />
      </div>
      <div className="topic-score-sublabel" style={{ color }}>{labels[t.categoria]}</div>
      <div className="topic-meta">
        <span>{t.datasets_cubriendo} datasets</span>
        <span>·</span>
        <span>{t.normativas_cubriendo} normativas</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Actualizar MetricsBand — centrar y aumentar prominencia**

Reemplazar la función `MetricsBand` completa:

```tsx
function MetricsBand({ totalDatasets, totalNormativas, topics }: {
  totalDatasets: number
  totalNormativas: number
  topics: TopicStat[]
}) {
  const criticas = calcTopicsCriticas(topics)
  const cobertura = calcCoberturaMedia(topics)

  return (
    <div className="metrics-band" style={{ justifyContent: 'center' }}>
      <div className="metrics-band-card">
        <div className="metrics-band-num" style={{ fontSize: '2.5rem' }}>{totalDatasets + totalNormativas}</div>
        <div className="metrics-band-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          Total entradas
          <Tooltip text="Suma de datasets y normativas en el corpus, aplicando los filtros activos de agenda, país y calidad." />
        </div>
      </div>
      <div className="metrics-band-card">
        <div className="metrics-band-num">3</div>
        <div className="metrics-band-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          Agendas activas
          <Tooltip text="Tres agendas temáticas del proyecto: Tecnológica, de Datos y de Género." />
        </div>
      </div>
      <div className="metrics-band-card">
        <div className="metrics-band-num" style={{ color: criticas > 0 ? 'var(--gap-crit)' : 'var(--gap-cov)' }}>
          {criticas}
        </div>
        <div className="metrics-band-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          Tópicos críticos
          <Tooltip text="Tópicos con brecha ≥ 65%: el corpus tiene muy pocos datos relevantes para ese tema." />
        </div>
      </div>
      <div className="metrics-band-card">
        <div className="metrics-band-num" style={{ fontSize: '2.5rem', color: cobertura >= 50 ? 'var(--gap-cov)' : 'var(--gap-crit)' }}>
          {cobertura}%
        </div>
        <div className="metrics-band-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          Cobertura media
          <Tooltip text="Promedio de cobertura sobre los 5 tópicos (100% − score de brecha promedio). Mayor % = corpus más completo." />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Actualizar descripciones de sección en MonitorColectivo**

En la función `MonitorColectivo`, localizar las dos `<p className="section-description">` y reemplazarlas:

Primera (Brechas por Agenda):
```tsx
<p className="section-description">
  Cada agenda agrupa los datasets según el marco temático al que pertenecen.
  La barra de calidad indica qué porcentaje de datasets cumplen con requisitos
  relativos a datos abiertos y principios de datos oficiales.
</p>
```

Segunda (Brechas por Tópico):
```tsx
<p className="section-description">
  El score de brecha mide qué tan cubierto está cada tópico teniendo en cuenta
  el estado de los datos y normativas vigentes.{' '}
  <strong>Brecha crítica</strong> (sin datos).{' '}
  <strong>Brecha parcial</strong> (dato existente pero insuficiente o escaso).
</p>
```

- [ ] **Step 5: Correr tests y actualizar expectativas**

```bash
npm test -- --run src/test/MonitorColectivo.test.tsx 2>&1
```

Si algún test busca el valor anterior del score (ej. `"67%"` para un gap_score de 0.67), cambiar la expectativa a `"33"` (cobertura = 100 − 67). Aplicar los cambios que fallen. Ejemplo de cambio en el test:

```tsx
// ANTES (gap_score 0.67 → mostraba "67%")
expect(screen.getByText('67%')).toBeInTheDocument()

// DESPUÉS (cobertura = 100 − 67 = 33)
expect(screen.getByText('33')).toBeInTheDocument()
```

- [ ] **Step 6: Verificar todos los tests**

```bash
npm test -- --run 2>&1 | tail -20
```
Esperado: todos en verde.

- [ ] **Step 7: Commit**

```bash
git add src/pages/MonitorColectivo.tsx src/test/MonitorColectivo.test.tsx
git commit -m "feat: remove legend dots, update descriptions, invert gap score display to coverage"
```

---

## Task 6: DatosQueremos — Filtro mensual (reemplaza RangoSelector)

**Files:**
- Modify: `src/pages/DatosQueremos.tsx`
- Modify: `src/test/DatosQueremos.test.tsx`

Estrategia: agregar helpers exportados `isoWeekToYearMonth` y `getUniqueMeses` y `filterSemanasByMes`. Reemplazar `RangoSelector` por `MesSelector`. El gráfico sigue mostrando las semanas del mes seleccionado (barras semanales dentro del mes).

- [ ] **Step 1: Escribir tests para los nuevos helpers**

En `src/test/DatosQueremos.test.tsx`, agregar al bloque de helpers existente:

```tsx
describe('isoWeekToYearMonth', () => {
  it('extracts year-month from iso week', () => {
    expect(isoWeekToYearMonth('2025-W03')).toBe('2025-01')
    expect(isoWeekToYearMonth('2025-W05')).toBe('2025-01')
    // Week 9 of 2025 starts 2025-02-24
    expect(isoWeekToYearMonth('2025-W09')).toBe('2025-02')
  })
})

describe('getUniqueMeses', () => {
  const semanas = [
    { isoWeek: '2025-W03' } as SemanaStats,
    { isoWeek: '2025-W04' } as SemanaStats,
    { isoWeek: '2025-W09' } as SemanaStats,
  ]
  it('returns sorted unique YYYY-MM strings', () => {
    expect(getUniqueMeses(semanas)).toEqual(['2025-01', '2025-02'])
  })
})

describe('filterSemanasByMes', () => {
  const semanas = [
    { isoWeek: '2025-W03' } as SemanaStats,
    { isoWeek: '2025-W04' } as SemanaStats,
    { isoWeek: '2025-W09' } as SemanaStats,
  ]
  it('returns only weeks belonging to the given month', () => {
    const result = filterSemanasByMes(semanas, '2025-01')
    expect(result).toHaveLength(2)
    expect(result[0].isoWeek).toBe('2025-W03')
  })
})
```

- [ ] **Step 2: Verificar que los tests fallan**

```bash
npm test -- --run src/test/DatosQueremos.test.tsx 2>&1 | grep -E "FAIL|PASS|Error" | head -10
```
Esperado: fallos por `isoWeekToYearMonth is not a function`, etc.

- [ ] **Step 3: Actualizar título del gráfico en StackedWeekChart**

En `src/pages/DatosQueremos.tsx`, localizar la función `StackedWeekChart` y cambiar el texto del `div.chart-title`:

```tsx
<div className="chart-title">Demanda mensual de datos — distribución por agenda</div>
```

- [ ] **Step 4: Agregar helpers y MesSelector a DatosQueremos.tsx**

Después de la línea `export function deriveWeeksForYear(...)` y antes del componente `RangoSelector`, agregar:

```tsx
const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export function isoWeekToYearMonth(isoWeek: string): string {
  const { year, week } = parseIsoWeek(isoWeek)
  // ISO week to approximate date: week 1 Jan 4 is always in week 1
  const jan4 = new Date(year, 0, 4)
  const dayOfWeek = jan4.getDay() || 7
  const weekStart = new Date(jan4)
  weekStart.setDate(jan4.getDate() - (dayOfWeek - 1) + (week - 1) * 7)
  const m = String(weekStart.getMonth() + 1).padStart(2, '0')
  return `${weekStart.getFullYear()}-${m}`
}

export function getUniqueMeses(semanas: { isoWeek: string }[]): string[] {
  const set = new Set(semanas.map(s => isoWeekToYearMonth(s.isoWeek)))
  return [...set].sort()
}

export function filterSemanasByMes(semanas: SemanaStats[], mesKey: string): SemanaStats[] {
  return semanas.filter(s => isoWeekToYearMonth(s.isoWeek) === mesKey)
}

function mesLabel(mesKey: string): string {
  const [year, month] = mesKey.split('-')
  return `${MESES_ES[Number(month) - 1]} ${year}`
}

// ── MesSelector ───────────────────────────────────────────────────────────────

interface MesSelectorProps {
  meses: string[]
  selected: string
  onChange: (m: string) => void
}

function MesSelector({ meses, selected, onChange }: MesSelectorProps) {
  return (
    <div className="mes-selector">
      <div className="mes-selector-title">Mes y año</div>
      <select
        className="mes-select"
        value={selected}
        onChange={e => onChange(e.target.value)}
      >
        {meses.map(m => (
          <option key={m} value={m}>{mesLabel(m)}</option>
        ))}
      </select>
    </div>
  )
}
```

- [ ] **Step 4: Actualizar el componente DatosQueremos para usar MesSelector**

Dentro de `export function DatosQueremos()`, reemplazar todo el bloque de estado y la lógica de filtrado:

```tsx
export function DatosQueremos() {
  const { semanas, topTemas, baseline, baselinePerAgenda, isReady, error } = useEvolucionStats()

  const meses = useMemo(() => getUniqueMeses(semanas), [semanas])

  const [selectedMes, setSelectedMes] = useState<string | null>(null)

  const effectiveMes = selectedMes ?? meses[meses.length - 1] ?? ''

  const filteredSemanas = useMemo(
    () => filterSemanasByMes(semanas, effectiveMes),
    [semanas, effectiveMes]
  )

  const selected = filteredSemanas[filteredSemanas.length - 1]

  const totalAcumuladas = filteredSemanas[filteredSemanas.length - 1]?.acumuladas ?? 0
  const maxTopTema = topTemas[0]?.count ?? 1

  const sidebarMetrics = selected ? [
    { eyebrow: 'Preguntas en el mes', num: totalAcumuladas, numColor: 'var(--ink)', sub: `${filteredSemanas.length} semanas` },
    { eyebrow: 'Brechas críticas', num: selected.criticas, numColor: 'var(--gap-crit)', sub: `${selected.parciales} parciales` },
    { eyebrow: 'Score promedio', num: `${Math.round(selected.score_promedio * 100)}%`, numColor: 'var(--gap-part)', sub: 'en el mes' },
  ] : []

  return (
    <Layout>
      <main className="datos-page">
        <div className="hero">
          <p className="hero-eyebrow">¿Qué datos queremos?</p>
          <h1>Los datos que el corpus <em>no tiene</em></h1>
          <p className="hero-sub">
            {isReady
              ? `${totalAcumuladas} preguntas · demanda mensual de datos`
              : 'Cargando demanda…'}
          </p>
        </div>

        {error && (
          <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--warn)', marginBottom: '1rem' }}>
            {error}
          </p>
        )}

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

        {semanas.length === 0 && isReady && (
          <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-light)' }}>
            — Aún no hay preguntas ingresadas —
          </p>
        )}

        {semanas.length > 0 && (
          <div className="datos-layout">
            {/* ── Sidebar ── */}
            <aside className="datos-sidebar">
              {meses.length > 0 && (
                <MesSelector
                  meses={meses}
                  selected={effectiveMes}
                  onChange={m => setSelectedMes(m)}
                />
              )}

              <div className="metricas-compare" style={{ gridTemplateColumns: '1fr', gap: '.75rem' }}>
                <div>
                  <div className="metricas-col-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Corpus base
                    <InfoTooltip text="Métricas calculadas sobre el corpus de datasets y normativas existente, sin considerar ninguna pregunta de la comunidad." />
                  </div>
                  <MetricaCard eyebrow="Score brecha base" num={`${Math.round(baseline.score * 100)}%`} numColor="var(--ink)" sub="Antes de cualquier pregunta" />
                  <MetricaCard eyebrow="Tópicos críticos" num={baseline.criticas} numColor="var(--gap-crit)" sub="Sin cobertura" />
                </div>
                {selected && (
                  <div style={{ marginTop: '.5rem' }}>
                    <div className="metricas-col-label">Mes seleccionado</div>
                    {sidebarMetrics.map(m => (
                      <MetricaCard key={m.eyebrow} {...m} />
                    ))}
                  </div>
                )}
              </div>

              {topTemas.length > 0 && (
                <>
                  <p className="mapa-section-title" style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                    Temas más demandados
                    <InfoTooltip text="Subtemas más frecuentes en los datasets encontrados por las preguntas de la comunidad. Refleja qué tipos de datos se buscan con más insistencia." />
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
            </aside>

            {/* ── Main content ── */}
            <div className="datos-main">
              <StackedWeekChart semanas={filteredSemanas} />

              {selected && (
                <div className="agenda-evol-list" style={{ marginTop: '2rem' }}>
                  {(['tecnologica', 'datos', 'genero'] as AgendaKey[]).map(ag => (
                    <AgendaDemandCard key={ag} agKey={ag} sem={selected} baselineScore={baselinePerAgenda[ag]} />
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

- [ ] **Step 5: Correr tests**

```bash
npm test -- --run src/test/DatosQueremos.test.tsx 2>&1 | tail -20
```

Si algún test existente usa `RangoSelector`, `filterSemanasByRange`, `deriveYears`, `deriveWeeksForYear` — mantenerlos (esas funciones siguen exportadas). Actualizar solo tests que fallen por el nuevo component state.

- [ ] **Step 6: Verificar todos los tests**

```bash
npm test -- --run 2>&1 | tail -20
```
Esperado: todos en verde.

- [ ] **Step 7: Commit**

```bash
git add src/pages/DatosQueremos.tsx src/test/DatosQueremos.test.tsx
git commit -m "feat: replace week range filter with month/year selector in DatosQueremos"
```

---

## Task 7: IngresoForm — Nuevo título, bajada, campos de contacto y atribución

**Files:**
- Modify: `src/pages/IngresoForm.tsx`

Cambios:
- Título: "Sube tu aporte a Infra.Coop" (neutral, no voseísmo)
- Bajada: texto público sobre curaduría
- Agregar campo local `emailContacto` (required) y `aportadoPor` (optional) al estado del componente
- Al submit, componer `ingresado_por = email + " | " + aportadoPor` (sin cambios en DB ni en tipos)
- Texto al pie del formulario: "Todas las contribuciones serán debidamente reconocidas."

- [ ] **Step 1: Agregar estado local para los nuevos campos**

En `export function IngresoForm()`, después de `const [errors, setErrors] = useState<FieldErrors>({})`, agregar:

```tsx
const [emailContacto, setEmailContacto] = useState('')
const [aportadoPor, setAportadoPor] = useState('')
```

- [ ] **Step 2: Agregar validación del email en la función `validate()`**

Dentro de `function validate(): boolean`, antes de `setErrors(errs)`:

```tsx
// Validar email de contacto (shared para ambos tipos)
if (!emailContacto.trim()) {
  errs.emailContacto = 'El email de contacto es obligatorio'
} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailContacto.trim())) {
  errs.emailContacto = 'Ingresa un email válido'
}
```

- [ ] **Step 3: Componer ingresado_por antes del submit**

En `handleSubmit`, antes de la llamada a `submitFormulario`/`submitNormativa`, agregar:

```tsx
const ingresadoPorCompuesto = aportadoPor.trim()
  ? `${emailContacto.trim()} | ${aportadoPor.trim()}`
  : emailContacto.trim()

if (tipo === 'dataset') {
  setDatasetData(prev => ({ ...prev, ingresado_por: ingresadoPorCompuesto }))
} else {
  setNormativaData(prev => ({ ...prev, ingresado_por: ingresadoPorCompuesto }))
}
```

Nota: `setDatasetData` es síncrono en sentido lógico para el submit — pasar el valor compuesto directamente al service:

```tsx
if (tipo === 'dataset') {
  insertedId = await submitFormulario(
    { ...datasetData, ingresado_por: ingresadoPorCompuesto },
    modo
  )
} else {
  insertedId = await submitNormativa(
    { ...normativaData, ingresado_por: ingresadoPorCompuesto },
    modo
  )
}
```

- [ ] **Step 4: Agregar limpiar los campos en handleReset**

En `handleReset`, agregar:

```tsx
setEmailContacto('')
setAportadoPor('')
```

Y limpiar el error en `clearError`:

```tsx
// la función clearError ya es genérica, funciona igual para 'emailContacto'
```

- [ ] **Step 5: Actualizar el JSX del formulario**

Reemplazar el bloque completo de `return (...)` dentro de `IngresoForm`, comenzando por el `<Layout>` interno:

Cambiar el `<h1>` de título:
```tsx
<h1 style={{ fontFamily: 'var(--serif)', fontSize: '2rem', marginBottom: '0.5rem' }}>
  Sube tu aporte a Infra.Coop
</h1>
```

Cambiar el `<p>` de bajada (reemplazar el bloque condicional):
```tsx
<p style={{ color: 'var(--ink-mid)', fontSize: '14px', marginBottom: '2rem', lineHeight: 1.65 }}>
  Puedes colaborar compartiendo un enlace a un dataset (datos abiertos, estadísticos u otros)
  o una normativa perteneciente a la temática del proyecto.
  Los envíos pasarán por una instancia de curaduría antes de ser parte de la Base de Datos.
</p>
```

En el `<form>`, después de los campos del tipo (DatasetFields / NormativaFields), reemplazar el bloque `{/* ingresado_por — shared */}`:

```tsx
{/* Campos de contacto y atribución — shared */}
<Field label="Información de contacto (Email)" required error={errors.emailContacto}>
  <input
    style={errors.emailContacto ? inputErrorStyle : inputStyle}
    type="email"
    placeholder="tu@email.com"
    value={emailContacto}
    onChange={e => { setEmailContacto(e.target.value); clearError('emailContacto') }}
  />
</Field>

<Field label="Dataset aportado por (alias, organización o nombre — opcional)">
  <input
    style={inputStyle}
    type="text"
    placeholder="Ej. Mi Organización"
    value={aportadoPor}
    onChange={e => setAportadoPor(e.target.value)}
  />
</Field>

<p style={{ fontSize: 12, color: 'var(--ink-light)', fontFamily: 'var(--mono)', marginTop: '-0.5rem' }}>
  Todas las contribuciones serán debidamente reconocidas.
</p>
```

- [ ] **Step 6: Verificar build y tests**

```bash
npm run build 2>&1 | tail -10
npm test -- --run 2>&1 | tail -20
```
Esperado: build limpio, todos los tests en verde.

- [ ] **Step 7: Commit final**

```bash
git add src/pages/IngresoForm.tsx
git commit -m "feat: update IngresoForm title, description and add contact/attribution fields"
```

---

## Verificación final

- [ ] **Correr suite completa**

```bash
npm test -- --run 2>&1 | tail -30
```
Esperado: todos los tests en verde.

- [ ] **Build de producción limpio**

```bash
npm run build 2>&1 | tail -10
```
Esperado: `✓ built in` sin warnings.

- [ ] **Commit de cierre**

```bash
git add -p  # revisar cualquier cambio suelto
git commit -m "chore: final verification pass — all tests green, build clean"
```
