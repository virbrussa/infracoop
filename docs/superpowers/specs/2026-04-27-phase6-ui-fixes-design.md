# Phase 6 — UI Fixes Design

**Fecha:** 2026-04-27  
**Estado:** Aprobado  
**Páginas afectadas:** `/datos` (DatosQueremos), `/colectivo` (MonitorColectivo), `/brechas` (MonitorBrechas)

---

## Contexto

Cuatro issues de UI identificados tras el build de Phase 5 (search semántico). Todos son mejoras de legibilidad y usabilidad — no cambian la lógica de negocio ni los hooks de datos.

---

## Issue 1 — Selector de rango en `/datos`

**Problema:** `.semana-tabs` genera un pill por cada semana ISO desde 2024, desbordando el layout.

**Solución:** Reemplazar el bloque de tabs por dos selectores encadenados (desde / hasta), cada uno con dropdown de año + dropdown de semana ISO.

**Comportamiento:**
- Al montar: el selector "desde" apunta a la primera semana con datos; "hasta" apunta a la semana más reciente.
- Los años disponibles se derivan de `semanas[]` (no hardcodeados).
- Las semanas disponibles en cada dropdown se filtran según el año seleccionado.
- Validación: `desde ≤ hasta`; si el usuario selecciona un rango inválido, "hasta" se ajusta automáticamente al mismo valor que "desde".
- El estado del rango es local al componente (`useState`). No persiste entre sesiones.
- El chart `StackedWeekChart`, las métricas y las `AgendaDemandCard` se filtran para mostrar solo las semanas dentro del rango seleccionado.
- `selectedIdx` (semana activa dentro del chart) se resetea al índice más reciente dentro del nuevo rango cada vez que cambia el rango.

**Componente nuevo:** `RangoSelector` dentro de `DatosQueremos.tsx`.

---

## Issue 2 — Layout de `/datos`

**Problema:** Con los tabs eliminados, la página queda como una columna larga sin jerarquía visual clara.

**Solución:** Layout de dos columnas en pantallas ≥ 768px:

- **Columna izquierda (sidebar, ~240px fija):**
  - `RangoSelector` (sticky dentro del sidebar, se queda visible al hacer scroll)
  - Métricas clave del rango activo: preguntas acumuladas, score promedio, brechas críticas
  - Top temas demandados (lista compacta)

- **Columna derecha (main, flex: 1):**
  - `StackedWeekChart`
  - `AgendaDemandCard` × 3

- En pantallas < 768px: columna única, sidebar arriba del contenido principal (sin sticky).

**CSS:** Nueva clase `.datos-layout` con `display: grid; grid-template-columns: 240px 1fr; gap: 2rem`. Las clases `.datos-sidebar` y `.datos-main` para cada columna.

---

## Issue 3 — Monitor Colectivo: métricas y contexto

**Problema:** La página muestra datos pero no explica qué significa cada sección.

**Solución:** Dos capas de contexto:

### Banda de métricas resumen (bajo el hero)

Fila de 4 tarjetas derivadas de los datos existentes en `useMonitorStats`:

| Métrica | Cálculo |
|---|---|
| Total entradas | `totalDatasets + totalNormativas` |
| Agendas activas | `agendas.filter(a => a.datasets_en_agenda > 0).length` |
| Tópicos críticos | `topics.filter(t => t.categoria === 'critica').length` |
| Cobertura media | `Math.round((1 - mean(topics.map(t => t.gap_score))) * 100)%` |

Las tarjetas usan colores semánticos: gris neutro para totales, `--gap-crit` para tópicos críticos, `--gap-cov` para cobertura media.

### Bajadas explicativas por sección

Texto corto (1-2 oraciones) antes de la grilla de agendas y antes de la grilla de tópicos. Texto fijo en el componente, no dinámico.

- Antes de agendas: *"Cada agenda agrupa los datasets según el marco temático al que pertenecen. La barra de calidad indica qué porcentaje de los datasets tiene metadatos completos, parciales o nulos."*
- Antes de tópicos: *"El score de brecha mide qué tan cubierto está cada tópico en el corpus. 0% = completamente cubierto · 100% = brecha crítica sin datos."*

### Tooltips ⓘ en tarjetas

En `AgendaCard`: tooltip en el número grande (total datasets en agenda) y en la barra de calidad.  
En `TopicCard`: tooltip en el score grande.

**Implementación:** Componente `Tooltip` simple: `<span>` con `title` attribute en primera iteración (accesible, sin JS extra). Si se quiere hover con estilo, usar un pequeño componente CSS-only con `::after`.

---

## Issue 4 — Monitor de Brechas: barras de similitud y contexto

### Barras de similitud normalizadas

**Problema:** Los scores de similitud coseno del corpus son bajos en valor absoluto (ej: 0.03–0.15), por lo que las barras aparecen casi vacías.

**Solución:** Normalizar las barras al máximo del lote actual.

En `ResultsColumns`, antes de renderizar:
```ts
const allHits = [...resultado.datasets, ...resultado.normativas]
const maxSim = Math.max(...allHits.map(h => h.similitud), 0.001)
```

Cada `HitRow` recibe `normalizedSim = hit.similitud / maxSim` para la anchura de la barra.  
El label numérico al costado muestra el score raw: `{Math.round(hit.similitud * 100)}%` (puede ser bajo, lo cual es honesto).

Alternativa: mostrar el score raw como texto y usar la barra solo para comparación relativa — ej: "0.12 · relevancia relativa: ████░░".

### Labels descriptivos y tooltips en ScorePanel

- El número grande lleva sublabel: *"Score de brecha · 0 = cubierto · 100 = crítico"* (reemplaza el actual `"score brecha"`).
- Los tres pills de agenda llevan tooltip ⓘ: *"Proporción de la brecha atribuible a esta agenda, calculada sobre los datasets encontrados."*
- El termómetro lleva marcas de escala: 0%, 50%, 100% visibles en el track.

---

## Archivos a modificar

| Archivo | Cambios |
|---|---|
| `src/pages/DatosQueremos.tsx` | Nuevo `RangoSelector`, nuevo layout sidebar/main, filtrado por rango |
| `src/styles/app.css` | Clases `.datos-layout`, `.datos-sidebar`, `.datos-main`, `.metrics-band`, `.tooltip-*` |
| `src/pages/MonitorColectivo.tsx` | Banda de métricas, bajadas por sección, tooltips en AgendaCard y TopicCard |
| `src/pages/MonitorBrechas.tsx` | Barras normalizadas, labels descriptivos en ScorePanel, tooltips en pills de agenda |

No se modifican hooks ni servicios — todos los datos necesarios ya están disponibles.

---

## Criterios de éxito

- `/datos` no desborda con >50 semanas de datos.
- El rango desde/hasta filtra correctamente chart + métricas + cards por agenda.
- `/colectivo` muestra 4 métricas resumen y texto explicativo en cada sección.
- Todos los tooltips son accesibles (al menos con `title` attribute).
- Las barras de similitud en `/brechas` siempre muestran diferencia visual entre resultados del mismo lote.
- 74 tests siguen pasando (los cambios son solo de UI).
