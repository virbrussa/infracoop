# Loading Skeletons + Textos + Tamaños — Design Spec
**Date:** 2026-04-27

## Scope

Tres grupos de cambios coordinados:

1. Skeleton loading states para páginas con carga asíncrona
2. Textos autoexplicativos en MonitorBrechas (sincronizados con el monolito)
3. Tamaños tipográficos más grandes globalmente
4. Quitar conteo de preguntas de Monitor Colectivo

---

## 1. Skeleton Components (`src/components/Skeleton.tsx`)

### Primitive
`<Skeleton width? height? rounded? className? />` — div gris pulsante usando `animation: pulse` ya definido en CSS global.

### Shapes compuestos
- **`SkeletonMetricsBand`** — 4 tarjetas (número grande + etiqueta corta)
- **`SkeletonAgendaGrid`** — 3 cards que imitan `AgendaCard` (eyebrow + número serif + barra horizontal)
- **`SkeletonTopicGrid`** — 5 cards que imitan `TopicCard` (label + score grande + sublabel)

### Uso
- `MonitorColectivo`: mientras `!isReady`, render `<SkeletonMetricsBand>` + `<SkeletonAgendaGrid>` + `<SkeletonTopicGrid>` en lugar de los datos reales
- `DatosQueremos`: mientras `!isReady` (de `useEvolucionStats`), render skeletons para MetricaCards y el gráfico

---

## 2. MonitorBrechas — Textos (`src/pages/MonitorBrechas.tsx`)

| Campo | Nuevo valor |
|-------|-------------|
| eyebrow | "Monitoreo de brechas" |
| h1 | "¿Qué datos nos *faltan*?" |
| hero-sub | "Escribí una pregunta sobre datos de género que te interese. El monitor busca qué datos existen, qué exige la normativa vigente y dónde está la brecha de datos teniendo en cuenta tu info." |
| Callout nuevo | Caja borde-izquierdo acento debajo del hero-sub: título "* ¿Por qué te solicitamos una pregunta?" + texto "El objetivo del monitor es poner en evidencia qué datos tenemos vs qué datos queremos. DCL pone la lupa en la primera instancia de cualquier proceso de recolección de datos, el problema detrás de esos datos. En el ciclo de datos esa primera fase se llama *problematización* y es allí donde queremos incidir." |
| ChipsBar label | "Termómetro de Incidencia" |
| ChipsBar sub | "Elegí hacia dónde querés llevar esta brecha." (nueva línea encima de los chips) |
| Col header Datasets | "Datasets disponibles" |
| Col header Normativas | "Marcos normativos relevantes" |

---

## 3. MonitorColectivo — Quitar conteo de preguntas (`src/pages/MonitorColectivo.tsx`)

- `hero-sub`: eliminar `totalPreguntas` y la línea dinámica → texto estático "Cada pregunta ingresada contribuye al mapa común de brechas."
- `AgendaCard` footer: eliminar `<div>{a.total} preguntas han explorado esta agenda</div>`
- `TopicCard` meta: eliminar `<><span>·</span><span>{t.preguntas_relacionadas} preguntas</span></>`

---

## 4. CSS Global — Tipografía (`src/index.css`)

| Selector | Antes | Después |
|----------|-------|---------|
| `.hero h1` | `clamp(2rem,5vw,3rem)` | `clamp(2.8rem,6vw,4.2rem)` |
| `.hero-sub` | `15px` | `16px` |
| `.section-description` | `14px` | `16px` |
| `.mapa-section-title` | `13px` (implícito) | `14px` |

---

## Out of scope
- Textos de MonitorColectivo hero (eyebrow, h1)
- Textos de DatosQueremos hero (h1, sub)
- Cambios a otras páginas (Landing, Ingreso, Revisar)
