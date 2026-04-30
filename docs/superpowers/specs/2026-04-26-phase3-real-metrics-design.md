# Phase 3 — Real Metrics Design
**Date:** 2026-04-26  
**Scope:** Replace all hardcoded/simulated data in MonitorColectivo and DatosQueremos with live computations derived from the Supabase corpus and the existing in-memory search index.

---

## Conceptual Framing

The two visualization pages answer distinct questions:

| Page | Question | Primary lens |
|------|----------|--------------|
| MonitorColectivo | ¿Qué tenemos? | Supply — what datasets and normativas exist and how well they cover each topic |
| DatosQueremos | ¿Qué queremos? | Demand — what people are searching for and how much of that demand is unmet |

The gap score appears on both pages but is framed differently:
- MonitorColectivo: "este tópico tiene X% de cobertura"
- DatosQueremos: "este tópico tiene X% de demanda insatisfecha"

Same formula, two lenses. This is honest because the formula measures coverage deficit either way.

**Important:** more preguntas on a topic ≠ bigger brecha. A topic with 5 preguntas and zero dataset coverage is a worse brecha than one with 100 preguntas and 15 datasets covering it. Gap SCORE is the primary metric everywhere. Volume is secondary context.

---

## Architecture

### Data sources (no new infrastructure needed)

```
SearchIndexContext (loaded at app startup — free)
  ├── datasetsMap: Map<id, Dataset>     ← 42 real + 150 synthetic
  ├── normativasMap: Map<id, Normativa> ← 35 real + 15 synthetic
  ├── miniDatasets / fuseDatasets       ← MiniSearch + Fuse indexes
  └── miniNormativas / fuseNormativas

getPreguntas() → Supabase
  └── Pregunta[]: id, texto, fecha, agenda_clasificada,
                  resultado_score, datasets_encontrados[], es_sintetico
```

Both new hooks consume these two sources only. No new Supabase tables or functions.

### Hooks

| Hook | Feeds | Inputs |
|------|-------|--------|
| `useMonitorStats()` | MonitorColectivo | `useSearchIndex()` + `getPreguntas()` |
| `useEvolucionStats()` | DatosQueremos | `getPreguntas()` only |

### Files deleted (replaced)
- `src/data/monitorData.ts`
- `src/data/evolucionData.ts`
- `src/test/monitorData.test.ts`
- `src/hooks/useMonitorData.ts`
- `src/test/useMonitorData.test.ts`

---

## useMonitorStats — "¿Qué tenemos?"

### Agenda cards (3: tecnologica, datos, genero)

Computed from `preguntas[]`:
- `total` — count where `agenda_clasificada` matches the agenda key
- `criticas` — count where `resultado_score >= 0.65`
- `parciales` — count where `0.35 <= resultado_score < 0.65`
- `cubiertas` — count where `resultado_score < 0.35`
- `top_subtemas` — from `datasets_encontrados[]`: look up each ID in `datasetsMap`, get `subtema`, count occurrences, return top 3

Computed from the index (supply side):
- `datasets_en_agenda` — count of datasets tagged with this agenda in `datasetsMap`
- `calidad_dist` — distribution of `calidad` values (Completa / Parcial / Nula) among those datasets

### Topic cards (5 canonical topics)

For each topic, run `search(topicQuery, index)` → `calcularScore(datasets, normativas)`:

```typescript
const TOPIC_QUERIES = [
  { id: 'salud-reproductiva',  label: 'Salud reproductiva',  query: 'salud reproductiva maternidad mortalidad' },
  { id: 'violencia-genero',    label: 'Violencia de género',  query: 'violencia género femicidio agresión' },
  { id: 'justicia-litigios',   label: 'Justicia y litigios',  query: 'justicia litigios denuncias tribunales' },
  { id: 'interseccionalidad',  label: 'Interseccionalidad',   query: 'interseccionalidad etnia raza indígena' },
  { id: 'tecnologias-datos',   label: 'Tecnologías y datos',  query: 'tecnología datos digitales acceso internet' },
]
```

Each topic card exposes:
- `gap_score` — PRIMARY: from `calcularScore()`, 0.0–1.0
- `categoria` — crítica / parcial / cubierta
- `datasets_cubriendo` — count of dataset SearchHits returned
- `normativas_cubriendo` — count of normativa SearchHits returned
- `preguntas_relacionadas` — count of preguntas whose `datasets_encontrados` intersects with the IDs returned by this topic's search

### Return shape

```typescript
interface MonitorStats {
  agendas: AgendaStat[]      // 3 items
  topics: TopicStat[]        // 5 items
  totalPreguntas: number
  totalDatasets: number
  totalNormativas: number
  isReady: boolean
  error: string | null
}
```

---

## useEvolucionStats — "¿Qué queremos?"

### Weekly grouping

Group all preguntas by ISO week derived from `fecha`. Each `SemanaStats`:

```typescript
interface SemanaStats {
  isoWeek: string            // e.g. "2026-W15"
  label: string              // e.g. "Semana 15 · abr 2026"
  nuevas: number             // preguntas added this week
  acumuladas: number         // cumulative total up to this week
  score_promedio: number     // avg resultado_score this week
  criticas: number           // resultado_score >= 0.65
  parciales: number          // 0.35 <= score < 0.65
  cubiertas: number          // score < 0.35
  por_agenda: {
    tecnologica: { nuevas: number; score_avg: number }
    datos:       { nuevas: number; score_avg: number }
    genero:      { nuevas: number; score_avg: number }
  }
}
```

### Baseline ("estado inicial")

Week 0 = the state of the corpus BEFORE any preguntas. Computed by running each topic's canonical query against the index and averaging the gap scores. This is the real, static baseline that does not change as preguntas accumulate.

### Most demanded topics

From all `datasets_encontrados[]` across all preguntas: count how many times each dataset ID appears → look up `subtema` → aggregate by subtema → top 5 most demanded subtemas.

### Trend interpretation

A note rendered in the UI: rising críticas in early weeks is expected and positive — it means the tool is revealing real gaps, not that things are getting worse.

### Return shape

```typescript
interface EvolucionStats {
  semanas: SemanaStats[]
  topTemas: { subtema: string; count: number }[]  // top 5
  baseline: { score: number; criticas: number; parciales: number; cubiertas: number }
  isReady: boolean
  error: string | null
}
```

---

## UI framing per page

### MonitorColectivo — "¿Qué tenemos?"

- Hero subtitle: "X datasets · Y normativas · cobertura real por agenda y tópico"
- Agenda cards: lead with `datasets_en_agenda` and quality distribution; preguntas count shown as "X preguntas han explorado esta agenda"
- Topic cards: lead with gap_score (large number, colored by categoria); secondary = dataset/normativa count; tertiary = preguntas relacionadas

### DatosQueremos — "¿Qué queremos?"

- Hero subtitle: "X preguntas ingresadas · demanda semanal de datos"
- Week tabs: navigate between ISO weeks
- Left column: baseline (estado inicial del corpus)
- Right column: selected week's demand metrics
- Chart: bar chart showing nuevas preguntas per week, colored by gap category
- Bottom: top 5 temas más demandados (from datasets_encontrados aggregation)
- Agenda cards: demand volume per agenda by week, with gap trend

---

## Testing

- `useMonitorStats.test.ts` — mock `useSearchIndex` + mock `getPreguntas`, assert: 3 agendas, 5 topics, all scores in [0,1], categories valid
- `useEvolucionStats.test.ts` — mock preguntas with known dates and scores, assert: correct week grouping, correct critica/parcial/cubierta counts, top temas correct
- MonitorData static test deleted (was testing fake data)

---

## What does NOT change

- `searchService.ts` — untouched
- `scoreService.ts` — untouched  
- `qualityService.ts` — untouched
- `SearchIndexContext.tsx` — untouched
- `dataService.ts` — untouched
- `MonitorBrechas.tsx` — untouched
- All 55 existing tests — must continue to pass
