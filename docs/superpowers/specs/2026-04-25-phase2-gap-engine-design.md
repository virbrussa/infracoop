# Phase 2 — Gap Engine: Diseño

**Fecha:** 2026-04-25  
**Rama:** `dev`  
**Estado:** Aprobado — listo para plan de implementación

---

## 1. Objetivo

Implementar el Motor de Brechas funcional en `MonitorBrechas.tsx`: el usuario escribe una pregunta, el sistema busca similitudes en los 192+ datasets y 35+ normativas reales cargados desde Supabase, calcula un score de brecha, y guarda la pregunta automáticamente.

Reemplaza la búsqueda mock con keyword-matching del prototipo por búsqueda real con MiniSearch indexado en el cliente.

---

## 2. Arquitectura de servicios

### Nuevos archivos

```
src/
├── context/
│   └── SearchIndexContext.tsx    — contexto que construye y provee el índice MiniSearch
├── services/
│   ├── searchService.ts          — construye índice, ejecuta búsqueda, devuelve hits con similitud
│   ├── scoreService.ts           — fórmula gap score + clasificación categórica + scores por agenda
│   └── qualityService.ts         — calcularCalidadAuto (S1–S4, pesos 20/30/30/20)
├── hooks/
│   └── useMotorBrechas.ts        — orquesta búsqueda → score → guardado Supabase
└── pages/
    └── MonitorBrechas.tsx        — reemplaza el stub actual
```

### Tipos nuevos (se agregan a `types/index.ts`)

```ts
interface SearchHit {
  id: string
  titulo: string
  fuente: string | null
  pais: string | null
  anio: number | null
  calidad: string | null
  similitud: number          // 0.0 – 1.0
  tipo: 'dataset' | 'normativa'
}

interface GapResult {
  score: number              // 0.0 – 1.0
  categoria: 'critica' | 'parcial' | 'cubierta'
  titulo: string             // síntesis generada
  datasets: SearchHit[]
  normativas: SearchHit[]
  agendas: AgendaScores
}

interface AgendaScores {
  tecnologica: number        // 0 – 100
  datos: number
  genero: number
}
```

---

## 3. Lógica de cada servicio

### `searchService.ts`

- Instala `minisearch` como dependencia de producción; `fuse.js` como fallback fuzzy.
- Campos indexados en datasets: `titulo`, `descripcion_notas`, `subtema`
- Campos indexados en normativas: `nombre`, `obligacion_datos`, `descripcion_notas`
- Retorna hasta 5 hits de datasets y 5 de normativas, con `similitud` normalizada entre 0–1 a partir del score MiniSearch.
- Si MiniSearch retorna 0 resultados, usa Fuse.js como fallback.

### `scoreService.ts`

Fórmula del prototipo, preservada exactamente:

```
score = (1 - max_sim_dataset) * 0.6 + cobertura_norma * 0.4
```

- `max_sim_dataset`: similitud máxima entre los hits de datasets (0 si no hay hits)
- `cobertura_norma`: 1 - similitud máxima de normativas (0 si no hay hits)
- Categorías: `critica` (score ≥ 0.65), `parcial` (0.35–0.65), `cubierta` (< 0.35)
- Si no hay hits de ningún tipo: retorna score `1.0`, categoría `critica`, listas vacías (brecha total por ausencia de datos)
- `calcularAgendas`: deriva los 3 scores de agenda cruzando las agendas de los hits encontrados con las agendas disponibles. Si no hay señal, usa el score global como base.

### `qualityService.ts`

Reimplementación exacta de `calcularCalidadAuto` del prototipo:

| Señal | Peso | Criterio |
|-------|------|----------|
| S1 Metadatos | 20% | fuente documentada + metodología |
| S2 Frecuencia | 30% | antigüedad ≤ 2 años → completa; > 3 años → bloquea a Nula |
| S3 Desagregación | 30% | geográfica = 1.0; nacional = 0.3; sin dato = 0 |
| S4 Accesibilidad | 20% | URL + formato legible por máquina |

### `useMotorBrechas.ts`

```
buscar(query: string) →
  1. searchService.search(query, index) → hits
  2. scoreService.calcularScore(hits) → { score, categoria, agendas }
  3. dataService.insertPregunta(query, score, datasets_ids) → fire-and-forget (error silencioso)
  4. setResultado(GapResult)
```

Estado expuesto: `{ resultado, isLoading, error, buscar, limpiar }`

---

## 4. Precarga del índice en App startup

`SearchIndexContext` se monta en `App.tsx` como wrapper del router. Al montar:
1. Llama `getDatasets()` y `getNormativas()` en paralelo
2. Construye el índice MiniSearch con ambas colecciones
3. Expone `{ index, isReady, error }`

El botón Buscar en `MonitorBrechas` permanece deshabilitado hasta que `isReady === true`.

---

## 5. Layout visual — MonitorBrechas (V2: Panel de análisis forense)

### Estructura

```
┌──────────────────────────────────────────────────────┐
│  Hero: "¿Qué datos faltan?"                          │
│  Textarea (max 400 chars) + char counter + Buscar    │
│  Steps de loading animados                           │
├────────────────┬─────────────────────────────────────┤
│  SCORE PANEL   │  SPLIT: Datasets | Normativas        │
│  (col ~30%)    │  (col ~70%)                          │
│                │  ┌─────────────┬─────────────────┐  │
│  [82]          │  │  Datasets   │   Normativas    │  │
│  score brecha  │  │  (5 hits)   │   (5 hits)      │  │
│  ● crítica     │  │  HitRow×N   │   HitRow×N      │  │
│                │  └─────────────┴─────────────────┘  │
│  Termómetro    │                                      │
│  vertical      │                                      │
│                │                                      │
│  Ag. Tec  71   │                                      │
│  Ag. Dat  78   │                                      │
│  Ag. Gén  84   │                                      │
└────────────────┴─────────────────────────────────────┘
```

### Tokens de diseño (todos inamovibles del design system)

- Fuentes: DM Serif Display (headings, score number), Instrument Sans (body), DM Mono (labels, metadata)
- Paleta: `--accent`, `--gap-crit`, `--gap-part`, `--gap-cov`, `--ink`, `--ink-light`, `--border`, `--surface`
- NO se introducen fuentes externas ni colores fuera del design system

### Elementos visuales

- **Score number**: 120px DM Serif Display, color dinámico por categoría (`--gap-crit` / `--gap-part` / `--gap-cov`)
- **Termómetro vertical**: `div` con `clip-path: inset(X% 0 0 0)` animado por CSS, gradiente de arriba (crítica) a abajo (cubierta)
- **Fondo de cuadrícula**: líneas CSS `0.5px` con `opacity: 0.06` en `--accent`
- **Barras de similitud**: `transform: scaleX(0→N)` animado con `transition-delay` escalonado al montar
- **Bordes**: solo `1px solid var(--border)`, sin sombras de caja
- **Entrada de resultados**: `opacity: 0 → 1` + `translateY(8px → 0)` al aparecer

---

## 6. Estados de la UI

| Estado | Comportamiento |
|--------|---------------|
| `idle` | Solo SearchBox visible |
| `index-loading` | Botón deshabilitado, indicador sutil "Cargando motor…" |
| `searching` | SearchBox bloqueada, steps animados |
| `success` | ScorePanel + ResultsColumns |
| `error` | Mensaje inline bajo SearchBox |

---

## 7. Manejo de errores

- Fallo al cargar Supabase para el índice → banner de error en App, MonitorBrechas muestra "No se pudo cargar el motor"
- `insertPregunta` falla → error silencioso (`console.warn`), no bloquea la UX
- Query < 5 caracteres → botón deshabilitado
- 0 resultados de búsqueda → `GapResult` con score 1.0, categoría `critica`, listas vacías

---

## 8. Tests (Vitest)

| Archivo | Cobertura |
|---------|-----------|
| `scoreService.test.ts` | score en los 3 rangos, categorías, agendas |
| `qualityService.test.ts` | S1–S4 con inputs extremos, clasificación final |
| `searchService.test.ts` | query relevante retorna hits con `similitud > 0`; query sin match retorna `[]` |
| `useMotorBrechas.test.ts` | mock de searchService + supabase; `insertPregunta` se llama al buscar |

No se testea la UI de `MonitorBrechas.tsx` directamente.

---

## 9. Dependencias nuevas

```
minisearch      ^7.x   (producción)
fuse.js         ^7.x   (producción)
```
