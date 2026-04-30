# Phase 2 — Gap Engine: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el Motor de Brechas funcional: búsqueda real con MiniSearch sobre 192+ datasets y 35+ normativas cargados desde Supabase, cálculo de gap score, split view con termómetro animado, y guardado automático de cada pregunta.

**Architecture:** Three separate services (`qualityService`, `scoreService`, `searchService`) + a `SearchIndexContext` que precarga el índice en App startup + un hook `useMotorBrechas` que los orquesta. `MonitorBrechas.tsx` reemplaza el stub con la UI split view V2 (panel de análisis forense).

**Tech Stack:** MiniSearch v7 (búsqueda), Fuse.js v7 (fallback fuzzy), React Context (índice global), Vitest (tests), CSS custom properties del design system existente.

---

## File Map

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `src/types/index.ts` | Modificar | Agregar `SearchHit`, `GapResult`, `AgendaScores` |
| `src/services/qualityService.ts` | Crear | Clasificador de calidad S1–S4 (re-implementación del prototipo) |
| `src/services/scoreService.ts` | Crear | Fórmula gap score, categorías, agendas, título generado |
| `src/services/searchService.ts` | Crear | Índice MiniSearch + Fuse fallback, función `search()` |
| `src/services/dataService.ts` | Modificar | Extender `insertPregunta` con `score` y `datasetsEncontrados` |
| `src/context/SearchIndexContext.tsx` | Crear | Carga Supabase → construye índice → provee vía context |
| `src/hooks/useMotorBrechas.ts` | Crear | Orquesta búsqueda → score → guardado → estado reactivo |
| `src/pages/MonitorBrechas.tsx` | Reemplazar | UI split view (ScorePanel, HitRow, ResultsColumns, SearchBox) |
| `src/styles/app.css` | Modificar | Clases CSS del motor (termómetro, hit rows, split, animaciones) |
| `src/test/qualityService.test.ts` | Crear | Tests S1–S4 y clasificación final |
| `src/test/scoreService.test.ts` | Crear | Tests score formula, categorías, agendas |
| `src/test/searchService.test.ts` | Crear | Tests buildIndex + search con datos reales de MiniSearch |
| `src/test/useMotorBrechas.test.ts` | Crear | Tests con mocks de searchService y dataService |
| `src/App.tsx` | Modificar | Envolver con `SearchIndexProvider` |
| `package.json` | Modificar | Agregar minisearch, fuse.js |

---

### Task 1: Instalar dependencias

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalar minisearch y fuse.js**

```bash
npm install minisearch fuse.js
```

Expected output: `added 2 packages` (approximate)

- [ ] **Step 2: Verificar que el build tipea correctamente**

```bash
npx tsc --noEmit
```

Expected: sin errores (MiniSearch y Fuse.js incluyen sus propios tipos).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add minisearch and fuse.js dependencies"
```

---

### Task 2: Agregar tipos a types/index.ts

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Agregar los tres tipos nuevos al final del archivo**

Abrir `src/types/index.ts` y agregar al final:

```typescript
export interface SearchHit {
  id: string
  titulo: string
  fuente: string | null
  pais: string | null
  anio: number | null
  calidad: string | null
  similitud: number
  tipo: 'dataset' | 'normativa'
  agendas: string[]
}

export interface AgendaScores {
  tecnologica: number
  datos: number
  genero: number
}

export interface GapResult {
  score: number
  categoria: 'critica' | 'parcial' | 'cubierta'
  titulo: string
  datasets: SearchHit[]
  normativas: SearchHit[]
  agendas: AgendaScores
}
```

- [ ] **Step 2: Verificar que compila**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add SearchHit, GapResult, AgendaScores types"
```

---

### Task 3: qualityService.ts (TDD)

**Files:**
- Create: `src/services/qualityService.ts`
- Create: `src/test/qualityService.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/test/qualityService.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calcularCalidadAuto } from '../services/qualityService'

describe('calcularCalidadAuto', () => {
  it('clasifica como completa con todos los criterios óptimos', () => {
    const result = calcularCalidadAuto({
      fuente: 'INEGI',
      metodologia: 'si',
      anio: new Date().getFullYear() - 1,
      desagregacion: 'geografica',
      url: 'https://inegi.org.mx/datos.csv',
      formato: 'csv',
    })
    expect(result.calidad).toBe('completa')
    expect(result.score).toBeGreaterThanOrEqual(70)
    expect(result.confianza).toBe('alta')
  })

  it('clasifica como nula cuando el dataset tiene más de 3 años', () => {
    const result = calcularCalidadAuto({
      fuente: 'INEGI',
      metodologia: 'si',
      anio: new Date().getFullYear() - 5,
      desagregacion: 'geografica',
      url: 'https://example.com/data.csv',
      formato: 'csv',
    })
    expect(result.calidad).toBe('nula')
  })

  it('clasifica como parcial con criterios incompletos', () => {
    const result = calcularCalidadAuto({
      fuente: 'Ministerio',
      metodologia: 'parcial',
      anio: new Date().getFullYear() - 2,
      desagregacion: 'nacional',
      url: 'https://example.com',
      formato: 'pdf-no-legible',
    })
    expect(result.calidad).toBe('parcial')
  })

  it('clasifica como nula sin fuente ni URL', () => {
    const result = calcularCalidadAuto({
      fuente: '',
      metodologia: 'no',
      anio: 0,
      desagregacion: 'sin-dato',
      url: '',
      formato: '',
    })
    expect(result.calidad).toBe('nula')
    expect(result.score).toBeLessThan(35)
  })

  it('retorna las cuatro señales con sus pesos', () => {
    const result = calcularCalidadAuto({ fuente: 'X', metodologia: 'si', anio: 2024, desagregacion: 'geografica', url: 'https://x.com/d.json', formato: 'json' })
    expect(result.senales).toHaveLength(4)
    expect(result.senales.map(s => s.peso)).toEqual(['20%', '30%', '30%', '20%'])
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
npx vitest run src/test/qualityService.test.ts
```

Expected: FAIL — `Cannot find module '../services/qualityService'`

- [ ] **Step 3: Implementar qualityService.ts**

Crear `src/services/qualityService.ts`:

```typescript
export interface QualityInput {
  fuente?: string
  metodologia?: 'si' | 'parcial' | 'no'
  anio?: number
  desagregacion?: 'geografica' | 'nacional' | 'sin-dato'
  url?: string
  formato?: 'csv' | 'json' | 'xlsx' | 'api' | 'pdf-no-legible' | 'sin-descarga' | ''
}

export interface QualitySignal {
  label: string
  valor: string
  score: number
  peso: string
}

export interface QualityResult {
  calidad: 'completa' | 'parcial' | 'nula'
  score: number
  confianza: 'alta' | 'media' | 'baja'
  senales: QualitySignal[]
}

export function calcularCalidadAuto(datos: QualityInput): QualityResult {
  const anioActual = new Date().getFullYear()
  const anio = datos.anio ?? 0
  const antiguedad = anio > 0 ? anioActual - anio : 99
  const formato = datos.formato ?? ''
  const metodologia = datos.metodologia ?? 'no'
  const desagregacion = datos.desagregacion ?? 'sin-dato'
  const tieneUrl = !!(datos.url && datos.url.trim().length > 4)
  const formatoLegible = (['csv', 'json', 'xlsx', 'api'] as string[]).includes(formato)
  const tieneFuente = !!(datos.fuente && datos.fuente.trim())

  let s1 = 0, razonS1 = ''
  if (tieneFuente && metodologia === 'si') { s1 = 1.0; razonS1 = 'Fuente documentada + metodología publicada' }
  else if (tieneFuente && metodologia === 'parcial') { s1 = 0.6; razonS1 = 'Fuente presente, metodología parcial' }
  else if (tieneFuente) { s1 = 0.3; razonS1 = 'Fuente presente, sin metodología' }
  else { s1 = 0; razonS1 = 'Sin fuente identificada' }

  let s2 = 0, razonS2 = ''
  if (anio === 0) { s2 = 0.1; razonS2 = 'Año desconocido' }
  else if (antiguedad > 3) { s2 = 0; razonS2 = `${antiguedad} años sin actualizar → Nula por frecuencia` }
  else if (antiguedad > 2) { s2 = 0.4; razonS2 = `${antiguedad} años sin actualizar → contribuye a Parcial` }
  else { s2 = 1.0; razonS2 = `Publicado hace ${antiguedad} año${antiguedad !== 1 ? 's' : ''} — frecuencia vigente` }

  let s3 = 0, razonS3 = ''
  if (desagregacion === 'geografica') { s3 = 1.0; razonS3 = 'Distribución geográfica presente' }
  else if (desagregacion === 'nacional') { s3 = 0.3; razonS3 = 'Solo totales nacionales' }
  else { s3 = 0; razonS3 = 'Desagregación geográfica desconocida' }

  let s4 = 0, razonS4 = ''
  if (tieneUrl && formatoLegible) { s4 = 1.0; razonS4 = `URL accesible + formato ${formato.toUpperCase()} legible por máquina` }
  else if (tieneUrl && formato === 'pdf-no-legible') { s4 = 0.25; razonS4 = 'URL presente pero PDF no es legible' }
  else if (tieneUrl && formato === 'sin-descarga') { s4 = 0.1; razonS4 = 'URL presente pero sin descarga' }
  else if (tieneUrl) { s4 = 0.4; razonS4 = 'URL presente, formato no especificado' }
  else { s4 = 0; razonS4 = 'Sin URL de descarga registrada' }

  const scoreRaw = s1 * 0.20 + s2 * 0.30 + s3 * 0.30 + s4 * 0.20

  let calidad: 'completa' | 'parcial' | 'nula'
  if (antiguedad > 3) {
    calidad = 'nula'
  } else if (scoreRaw >= 0.70 && antiguedad <= 2 && s3 >= 0.7 && formatoLegible) {
    calidad = 'completa'
  } else if (scoreRaw >= 0.35) {
    calidad = 'parcial'
  } else {
    calidad = 'nula'
  }

  const confianza: 'alta' | 'media' | 'baja' = scoreRaw >= 0.65 ? 'alta' : scoreRaw >= 0.40 ? 'media' : 'baja'

  return {
    calidad,
    score: Math.round(scoreRaw * 100),
    confianza,
    senales: [
      { label: 'Metadatos', valor: razonS1, score: Math.round(s1 * 100), peso: '20%' },
      { label: 'Frecuencia', valor: razonS2, score: Math.round(s2 * 100), peso: '30%' },
      { label: 'Desagregación', valor: razonS3, score: Math.round(s3 * 100), peso: '30%' },
      { label: 'Accesibilidad', valor: razonS4, score: Math.round(s4 * 100), peso: '20%' },
    ],
  }
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

```bash
npx vitest run src/test/qualityService.test.ts
```

Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/services/qualityService.ts src/test/qualityService.test.ts
git commit -m "feat: add qualityService with S1-S4 weighted classifier"
```

---

### Task 4: scoreService.ts (TDD)

**Files:**
- Create: `src/services/scoreService.ts`
- Create: `src/test/scoreService.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/test/scoreService.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calcularScore, calcularAgendas, generarTitulo } from '../services/scoreService'
import type { SearchHit } from '../types'

const makeHit = (similitud: number, tipo: 'dataset' | 'normativa', agendas: string[] = []): SearchHit => ({
  id: 'test', titulo: 'Dataset de prueba', fuente: 'INEGI', pais: 'MEX',
  anio: 2023, calidad: 'Completa', similitud, tipo, agendas,
})

describe('calcularScore', () => {
  it('retorna score 1.0 y categoría crítica cuando no hay hits', () => {
    const { score, categoria } = calcularScore([], [])
    expect(score).toBe(1.0)
    expect(categoria).toBe('critica')
  })

  it('retorna categoría crítica cuando score >= 0.65', () => {
    const { categoria } = calcularScore([makeHit(0.1, 'dataset')], [makeHit(0.1, 'normativa')])
    expect(categoria).toBe('critica')
  })

  it('retorna categoría cubierta cuando datasets tienen alta similitud y hay normativa', () => {
    const { score, categoria } = calcularScore(
      [makeHit(0.95, 'dataset')],
      [makeHit(0.95, 'normativa')]
    )
    expect(score).toBeLessThan(0.35)
    expect(categoria).toBe('cubierta')
  })

  it('retorna categoría parcial para scores intermedios', () => {
    const { categoria } = calcularScore([makeHit(0.5, 'dataset')], [makeHit(0.5, 'normativa')])
    expect(categoria).toBe('parcial')
  })

  it('aplica la fórmula: (1 - maxSimDs) * 0.6 + (1 - maxSimNm) * 0.4', () => {
    const maxSimDs = 0.8
    const maxSimNm = 0.6
    const expected = (1 - maxSimDs) * 0.6 + (1 - maxSimNm) * 0.4
    const { score } = calcularScore([makeHit(maxSimDs, 'dataset')], [makeHit(maxSimNm, 'normativa')])
    expect(score).toBeCloseTo(expected, 2)
  })
})

describe('calcularAgendas', () => {
  it('usa scoreGlobal cuando no hay hits con agenda específica', () => {
    const scores = calcularAgendas([], [], 0.8)
    expect(scores.tecnologica).toBe(80)
    expect(scores.datos).toBe(80)
    expect(scores.genero).toBe(80)
  })

  it('calcula score de género a partir de hits con "género" en agendas', () => {
    const hitGenero = makeHit(0.9, 'dataset', ['Ag. de Género'])
    const scores = calcularAgendas([hitGenero], [], 0.5)
    expect(scores.genero).toBeLessThan(50)
  })
})

describe('generarTitulo', () => {
  it('retorna "Brecha crítica detectada" con hit de dataset', () => {
    const hit = makeHit(0.8, 'dataset')
    hit.titulo = 'ENDIREH 2021'
    const titulo = generarTitulo('critica', [hit], [])
    expect(titulo).toContain('Brecha crítica')
    expect(titulo).toContain('ENDIREH 2021')
  })

  it('retorna mensaje de sin datos cuando no hay hits', () => {
    const titulo = generarTitulo('critica', [], [])
    expect(titulo).toContain('sin datos')
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
npx vitest run src/test/scoreService.test.ts
```

Expected: FAIL — `Cannot find module '../services/scoreService'`

- [ ] **Step 3: Implementar scoreService.ts**

Crear `src/services/scoreService.ts`:

```typescript
import type { SearchHit, GapResult, AgendaScores } from '../types'

export function calcularScore(
  datasets: SearchHit[],
  normativas: SearchHit[]
): Pick<GapResult, 'score' | 'categoria'> {
  if (datasets.length === 0 && normativas.length === 0) {
    return { score: 1.0, categoria: 'critica' }
  }

  const maxSimDs = datasets.length > 0 ? Math.max(...datasets.map(h => h.similitud)) : 0
  const maxSimNm = normativas.length > 0 ? Math.max(...normativas.map(h => h.similitud)) : 0
  const score = Math.round(((1 - maxSimDs) * 0.6 + (1 - maxSimNm) * 0.4) * 100) / 100

  let categoria: 'critica' | 'parcial' | 'cubierta'
  if (score >= 0.65) categoria = 'critica'
  else if (score >= 0.35) categoria = 'parcial'
  else categoria = 'cubierta'

  return { score, categoria }
}

export function calcularAgendas(
  datasets: SearchHit[],
  normativas: SearchHit[],
  scoreGlobal: number
): AgendaScores {
  const agendaGap = (pattern: RegExp): number => {
    const dsA = datasets.filter(h => h.agendas.some(a => pattern.test(a)))
    const nmA = normativas.filter(h => h.agendas.some(a => pattern.test(a)))
    if (dsA.length === 0 && nmA.length === 0) return Math.round(scoreGlobal * 100)
    const maxDs = dsA.length > 0 ? Math.max(...dsA.map(h => h.similitud)) : 0
    const maxNm = nmA.length > 0 ? Math.max(...nmA.map(h => h.similitud)) : 0
    return Math.round(((1 - maxDs) * 0.6 + (1 - maxNm) * 0.4) * 100)
  }

  return {
    tecnologica: agendaGap(/tecnol/i),
    datos: agendaGap(/dato/i),
    genero: agendaGap(/g[eé]nero/i),
  }
}

export function generarTitulo(
  categoria: 'critica' | 'parcial' | 'cubierta',
  datasets: SearchHit[],
  normativas: SearchHit[]
): string {
  const labels = { critica: 'Brecha crítica', parcial: 'Brecha parcial', cubierta: 'Datos disponibles' }
  const top = datasets[0] ?? normativas[0]
  if (!top) return `${labels[categoria]}: sin datos relacionados`
  const nombre = top.titulo.length > 55 ? top.titulo.slice(0, 55) + '…' : top.titulo
  return `${labels[categoria]} detectada — ${nombre}`
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

```bash
npx vitest run src/test/scoreService.test.ts
```

Expected: PASS — 8 tests

- [ ] **Step 5: Commit**

```bash
git add src/services/scoreService.ts src/test/scoreService.test.ts
git commit -m "feat: add scoreService with gap formula, agenda scores, and title generation"
```

---

### Task 5: searchService.ts (TDD)

**Files:**
- Create: `src/services/searchService.ts`
- Create: `src/test/searchService.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/test/searchService.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildIndex, search } from '../services/searchService'
import type { Dataset, Normativa } from '../types'

const mockDatasets: Dataset[] = [
  {
    id: 'DS-001', titulo: 'Estadísticas de feminicidio por estado',
    fuente_organismo: 'SESNSP', pais_iso3: 'MEX', anio_publicacion: 2024,
    subtema: 'violencia-genero', agendas: ['Ag. de Género'],
    calidad: 'Completa', frecuencia: 'Mensual', desagregacion_geo: 'Estatal',
    accesibilidad_formato: 'CSV', url_descarga: 'https://example.com',
    url_valida: true, descripcion_notas: 'Registro mensual de feminicidios por entidad federativa',
    es_sintetico: false, created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'DS-002', titulo: 'Encuesta Nacional de Salud Reproductiva',
    fuente_organismo: 'INEGI', pais_iso3: 'MEX', anio_publicacion: 2023,
    subtema: 'salud-reproductiva', agendas: ['Ag. de Género', 'Ag. de Datos'],
    calidad: 'Completa', frecuencia: 'Quinquenal', desagregacion_geo: 'Municipal',
    accesibilidad_formato: 'CSV', url_descarga: 'https://example.com',
    url_valida: true, descripcion_notas: 'Estadísticas de salud reproductiva a nivel municipal',
    es_sintetico: false, created_at: '2024-01-01T00:00:00Z',
  },
]

const mockNormativas: Normativa[] = [
  {
    id: 'NM-001', nombre: 'NOM-046-SSA2-2005 Violencia familiar y sexual',
    organismo_emisor: 'Secretaría de Salud', tipo: 'norma_oficial',
    pais_alcance: 'MEX', anio_adopcion: 2005,
    articulo_numeral: 'Numeral 6.4',
    obligacion_datos: 'Registro y reporte de casos de violencia sexual con desagregación territorial',
    agendas: ['Ag. de Género'], url_texto_oficial: null,
    descripcion_notas: null, es_sintetico: false, created_at: '2024-01-01T00:00:00Z',
  },
]

describe('buildIndex', () => {
  it('construye un índice sin errores', () => {
    expect(() => buildIndex(mockDatasets, mockNormativas)).not.toThrow()
  })

  it('retorna un índice con las colecciones indexadas', () => {
    const index = buildIndex(mockDatasets, mockNormativas)
    expect(index).toHaveProperty('miniDatasets')
    expect(index).toHaveProperty('miniNormativas')
    expect(index).toHaveProperty('fuseDatasets')
    expect(index).toHaveProperty('fuseNormativas')
    expect(index.datasetsMap.size).toBe(mockDatasets.length)
    expect(index.normativasMap.size).toBe(mockNormativas.length)
  })
})

describe('search', () => {
  it('retorna hits de datasets con similitud > 0 para query relevante', () => {
    const index = buildIndex(mockDatasets, mockNormativas)
    const { datasets } = search('feminicidio estadísticas', index)
    expect(datasets.length).toBeGreaterThan(0)
    expect(datasets[0].similitud).toBeGreaterThan(0)
    expect(datasets[0].tipo).toBe('dataset')
  })

  it('retorna hits de normativas con similitud > 0 para query relevante', () => {
    const index = buildIndex(mockDatasets, mockNormativas)
    const { normativas } = search('violencia sexual registro', index)
    expect(normativas.length).toBeGreaterThan(0)
    expect(normativas[0].similitud).toBeGreaterThan(0)
    expect(normativas[0].tipo).toBe('normativa')
  })

  it('el hit más relevante tiene similitud 1.0 (normalizado)', () => {
    const index = buildIndex(mockDatasets, mockNormativas)
    const { datasets } = search('feminicidio', index)
    expect(datasets[0].similitud).toBe(1.0)
  })

  it('los hits incluyen agendas del documento original', () => {
    const index = buildIndex(mockDatasets, mockNormativas)
    const { datasets } = search('salud reproductiva', index)
    expect(datasets[0].agendas).toContain('Ag. de Género')
  })

  it('respeta el límite de resultados (default 5)', () => {
    const index = buildIndex(mockDatasets, mockNormativas)
    const { datasets } = search('estadísticas datos', index)
    expect(datasets.length).toBeLessThanOrEqual(5)
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
npx vitest run src/test/searchService.test.ts
```

Expected: FAIL — `Cannot find module '../services/searchService'`

- [ ] **Step 3: Implementar searchService.ts**

Crear `src/services/searchService.ts`:

```typescript
import MiniSearch from 'minisearch'
import Fuse from 'fuse.js'
import type { Dataset, Normativa, SearchHit } from '../types'

export interface SearchIndex {
  miniDatasets: MiniSearch
  miniNormativas: MiniSearch
  fuseDatasets: Fuse<Dataset>
  fuseNormativas: Fuse<Normativa>
  datasetsMap: Map<string, Dataset>
  normativasMap: Map<string, Normativa>
}

export function buildIndex(datasets: Dataset[], normativas: Normativa[]): SearchIndex {
  const miniDatasets = new MiniSearch({
    idField: 'id',
    fields: ['titulo', 'descripcion_notas', 'subtema'],
    searchOptions: { boost: { titulo: 2 }, fuzzy: 0.2, prefix: true },
  })
  miniDatasets.addAll(datasets.map(d => ({
    id: d.id,
    titulo: d.titulo,
    descripcion_notas: d.descripcion_notas ?? '',
    subtema: d.subtema ?? '',
  })))

  const miniNormativas = new MiniSearch({
    idField: 'id',
    fields: ['nombre', 'obligacion_datos', 'descripcion_notas'],
    storeFields: ['nombre', 'organismo_emisor', 'pais_alcance', 'anio_adopcion', 'agendas'],
    searchOptions: { boost: { nombre: 2 }, fuzzy: 0.2, prefix: true },
  })
  miniNormativas.addAll(normativas.map(n => ({
    id: n.id,
    nombre: n.nombre,
    obligacion_datos: n.obligacion_datos ?? '',
    descripcion_notas: n.descripcion_notas ?? '',
  })))

  const fuseDatasets = new Fuse(datasets, {
    keys: [{ name: 'titulo', weight: 2 }, 'descripcion_notas', 'subtema'],
    includeScore: true, threshold: 0.6,
  })
  const fuseNormativas = new Fuse(normativas, {
    keys: [{ name: 'nombre', weight: 2 }, 'obligacion_datos', 'descripcion_notas'],
    includeScore: true, threshold: 0.6,
  })

  return {
    miniDatasets, miniNormativas, fuseDatasets, fuseNormativas,
    datasetsMap: new Map(datasets.map(d => [d.id, d])),
    normativasMap: new Map(normativas.map(n => [n.id, n])),
  }
}

function normalize(score: number, max: number): number {
  if (max === 0) return 0
  return Math.round((score / max) * 100) / 100
}

export function search(
  query: string,
  index: SearchIndex,
  limit = 5
): { datasets: SearchHit[]; normativas: SearchHit[] } {
  // Datasets: lookup original data via Map (evita casteos de storeFields)
  const dsRaw = index.miniDatasets.search(query).slice(0, limit)
  let datasets: SearchHit[]

  if (dsRaw.length > 0) {
    const maxScore = Math.max(...dsRaw.map(r => r.score))
    datasets = dsRaw
      .map(r => {
        const doc = index.datasetsMap.get(String(r.id))
        if (!doc) return null
        return {
          id: doc.id, titulo: doc.titulo, fuente: doc.fuente_organismo,
          pais: doc.pais_iso3, anio: doc.anio_publicacion, calidad: doc.calidad,
          similitud: normalize(r.score, maxScore), tipo: 'dataset' as const,
          agendas: doc.agendas ?? [],
        }
      })
      .filter((h): h is SearchHit => h !== null)
  } else {
    datasets = index.fuseDatasets.search(query, { limit }).map(r => ({
      id: r.item.id, titulo: r.item.titulo, fuente: r.item.fuente_organismo,
      pais: r.item.pais_iso3, anio: r.item.anio_publicacion, calidad: r.item.calidad,
      similitud: Math.round((1 - (r.score ?? 1)) * 100) / 100, tipo: 'dataset' as const,
      agendas: r.item.agendas ?? [],
    }))
  }

  // Normativas: lookup original data via Map
  const nmRaw = index.miniNormativas.search(query).slice(0, limit)
  let normativas: SearchHit[]

  if (nmRaw.length > 0) {
    const maxScore = Math.max(...nmRaw.map(r => r.score))
    normativas = nmRaw
      .map(r => {
        const doc = index.normativasMap.get(String(r.id))
        if (!doc) return null
        return {
          id: doc.id, titulo: doc.nombre, fuente: doc.organismo_emisor,
          pais: doc.pais_alcance, anio: doc.anio_adopcion, calidad: null,
          similitud: normalize(r.score, maxScore), tipo: 'normativa' as const,
          agendas: doc.agendas ?? [],
        }
      })
      .filter((h): h is SearchHit => h !== null)
  } else {
    normativas = index.fuseNormativas.search(query, { limit }).map(r => ({
      id: r.item.id, titulo: r.item.nombre, fuente: r.item.organismo_emisor,
      pais: r.item.pais_alcance, anio: r.item.anio_adopcion, calidad: null,
      similitud: Math.round((1 - (r.score ?? 1)) * 100) / 100, tipo: 'normativa' as const,
      agendas: r.item.agendas ?? [],
    }))
  }

  return { datasets, normativas }
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

```bash
npx vitest run src/test/searchService.test.ts
```

Expected: PASS — 7 tests

- [ ] **Step 5: Commit**

```bash
git add src/services/searchService.ts src/test/searchService.test.ts
git commit -m "feat: add searchService with MiniSearch index and Fuse.js fallback"
```

---

### Task 6: Actualizar dataService.insertPregunta

**Files:**
- Modify: `src/services/dataService.ts`

- [ ] **Step 1: Extender la firma de insertPregunta**

En `src/services/dataService.ts`, reemplazar la función `insertPregunta` existente:

```typescript
export async function insertPregunta(
  texto: string,
  score?: number,
  datasetsEncontrados?: string[]
): Promise<Pregunta> {
  const { data, error } = await supabase
    .from('preguntas')
    .insert({
      texto,
      ...(score != null && { resultado_score: score }),
      ...(datasetsEncontrados?.length && { datasets_encontrados: datasetsEncontrados }),
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Pregunta
}
```

- [ ] **Step 2: Verificar que los tests existentes siguen pasando**

```bash
npx vitest run src/test/dataService.test.ts
```

Expected: PASS — los tests existentes usan `insertPregunta('texto')` con un argumento, que sigue funcionando con los nuevos parámetros opcionales.

- [ ] **Step 3: Verificar que compila**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/services/dataService.ts
git commit -m "feat: extend insertPregunta to store score and dataset IDs"
```

---

### Task 7: SearchIndexContext.tsx + App.tsx

**Files:**
- Create: `src/context/SearchIndexContext.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Crear el directorio y el contexto**

Crear `src/context/SearchIndexContext.tsx`:

```typescript
import { createContext, useContext, useEffect, useState } from 'react'
import { buildIndex, type SearchIndex } from '../services/searchService'
import { getDatasets, getNormativas } from '../services/dataService'

interface SearchIndexContextType {
  index: SearchIndex | null
  isReady: boolean
  error: string | null
}

const SearchIndexContext = createContext<SearchIndexContextType>({
  index: null,
  isReady: false,
  error: null,
})

export function useSearchIndex() {
  return useContext(SearchIndexContext)
}

export function SearchIndexProvider({ children }: { children: React.ReactNode }) {
  const [index, setIndex] = useState<SearchIndex | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [datasets, normativas] = await Promise.all([getDatasets(), getNormativas()])
        if (cancelled) return
        setIndex(buildIndex(datasets, normativas))
        setIsReady(true)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error al cargar el motor')
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return (
    <SearchIndexContext.Provider value={{ index, isReady, error }}>
      {children}
    </SearchIndexContext.Provider>
  )
}
```

- [ ] **Step 2: Envolver App.tsx con SearchIndexProvider**

Reemplazar el contenido de `src/App.tsx`:

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Header } from './components/Header'
import { Landing } from './pages/Landing'
import { MonitorBrechas } from './pages/MonitorBrechas'
import { MonitorColectivo } from './pages/MonitorColectivo'
import { DatosQueremos } from './pages/DatosQueremos'
import { SearchIndexProvider } from './context/SearchIndexContext'

export default function App() {
  return (
    <SearchIndexProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/brechas" element={<MonitorBrechas />} />
          <Route path="/colectivo" element={<MonitorColectivo />} />
          <Route path="/datos" element={<DatosQueremos />} />
        </Routes>
      </BrowserRouter>
    </SearchIndexProvider>
  )
}
```

- [ ] **Step 3: Verificar que compila**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/context/SearchIndexContext.tsx src/App.tsx
git commit -m "feat: add SearchIndexProvider that preloads MiniSearch index at app startup"
```

---

### Task 8: useMotorBrechas.ts (TDD)

**Files:**
- Create: `src/hooks/useMotorBrechas.ts`
- Create: `src/test/useMotorBrechas.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/test/useMotorBrechas.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMotorBrechas } from '../hooks/useMotorBrechas'
import { SearchIndexProvider } from '../context/SearchIndexContext'
import type { SearchHit } from '../types'

const mockHits: SearchHit[] = [
  { id: 'DS-001', titulo: 'ENDIREH 2021', fuente: 'INEGI', pais: 'MEX', anio: 2021,
    calidad: 'Completa', similitud: 0.85, tipo: 'dataset', agendas: ['Ag. de Género'] },
]

vi.mock('../services/searchService', () => ({
  buildIndex: vi.fn().mockReturnValue({}),
  search: vi.fn().mockReturnValue({ datasets: mockHits, normativas: [] }),
}))

vi.mock('../services/dataService', () => ({
  getDatasets: vi.fn().mockResolvedValue([]),
  getNormativas: vi.fn().mockResolvedValue([]),
  insertPregunta: vi.fn().mockResolvedValue({
    id: 'pq-1', texto: 'test', fecha: '2026-01-01T00:00:00Z',
    agenda_clasificada: null, resultado_score: null, datasets_encontrados: [],
    es_sintetico: false,
  }),
}))

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SearchIndexProvider>{children}</SearchIndexProvider>
)

beforeEach(() => { vi.clearAllMocks() })

// Flush el useEffect de SearchIndexProvider (getDatasets/getNormativas son promesas resueltas)
async function flushContext() {
  await act(async () => { await Promise.resolve() })
}

describe('useMotorBrechas', () => {
  it('empieza en estado idle', () => {
    const { result } = renderHook(() => useMotorBrechas(), { wrapper })
    expect(result.current.resultado).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('retorna GapResult después de buscar', async () => {
    const { result } = renderHook(() => useMotorBrechas(), { wrapper })
    await flushContext()
    await act(async () => { await result.current.buscar('feminicidio datos') })
    expect(result.current.resultado).not.toBeNull()
    expect(result.current.resultado?.score).toBeGreaterThan(0)
    expect(result.current.resultado?.datasets).toHaveLength(1)
  })

  it('isLoading es false después de completar la búsqueda', async () => {
    const { result } = renderHook(() => useMotorBrechas(), { wrapper })
    await flushContext()
    await act(async () => { await result.current.buscar('datos feminicidio') })
    expect(result.current.isLoading).toBe(false)
  })

  it('llama insertPregunta automáticamente al buscar', async () => {
    const { insertPregunta } = await import('../services/dataService')
    const { result } = renderHook(() => useMotorBrechas(), { wrapper })
    await flushContext()
    await act(async () => { await result.current.buscar('datos feminicidio') })
    expect(insertPregunta).toHaveBeenCalledWith(
      'datos feminicidio',
      expect.any(Number),
      expect.any(Array)
    )
  })

  it('limpiar resetea el resultado', async () => {
    const { result } = renderHook(() => useMotorBrechas(), { wrapper })
    await flushContext()
    await act(async () => { await result.current.buscar('feminicidio') })
    act(() => { result.current.limpiar() })
    expect(result.current.resultado).toBeNull()
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
npx vitest run src/test/useMotorBrechas.test.ts
```

Expected: FAIL — `Cannot find module '../hooks/useMotorBrechas'`

- [ ] **Step 3: Implementar useMotorBrechas.ts**

Crear `src/hooks/useMotorBrechas.ts`:

```typescript
import { useState, useCallback } from 'react'
import { useSearchIndex } from '../context/SearchIndexContext'
import { search } from '../services/searchService'
import { calcularScore, calcularAgendas, generarTitulo } from '../services/scoreService'
import { insertPregunta } from '../services/dataService'
import type { GapResult } from '../types'

interface MotorState {
  resultado: GapResult | null
  isLoading: boolean
  error: string | null
}

export function useMotorBrechas() {
  const { index } = useSearchIndex()
  const [state, setState] = useState<MotorState>({
    resultado: null,
    isLoading: false,
    error: null,
  })

  const buscar = useCallback(async (query: string) => {
    if (!index) return
    setState(s => ({ ...s, isLoading: true, error: null }))

    try {
      const hits = search(query, index)
      const { score, categoria } = calcularScore(hits.datasets, hits.normativas)
      const agendas = calcularAgendas(hits.datasets, hits.normativas, score)
      const titulo = generarTitulo(categoria, hits.datasets, hits.normativas)

      const resultado: GapResult = {
        score, categoria, titulo, agendas,
        datasets: hits.datasets,
        normativas: hits.normativas,
      }

      setState({ resultado, isLoading: false, error: null })

      insertPregunta(query, score, hits.datasets.map(h => h.id)).catch(() => {
        // fire-and-forget: no bloquea la UX
      })
    } catch (err) {
      setState({
        resultado: null,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Error al buscar',
      })
    }
  }, [index])

  const limpiar = useCallback(() => {
    setState({ resultado: null, isLoading: false, error: null })
  }, [])

  return { ...state, buscar, limpiar }
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

```bash
npx vitest run src/test/useMotorBrechas.test.ts
```

Expected: PASS — 5 tests

- [ ] **Step 5: Ejecutar todos los tests para verificar que no hay regresiones**

```bash
npx vitest run
```

Expected: todos los tests pasan (22 anteriores + los nuevos).

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useMotorBrechas.ts src/test/useMotorBrechas.test.ts
git commit -m "feat: add useMotorBrechas hook with search, scoring, and auto-save"
```

---

### Task 9: MonitorBrechas.tsx + estilos CSS

**Files:**
- Modify: `src/styles/app.css`
- Modify: `src/pages/MonitorBrechas.tsx`

- [ ] **Step 1: Agregar clases CSS del motor a app.css**

Abrir `src/styles/app.css` y agregar al final:

```css
/* ═══ Motor de Brechas ═══ */

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.motor-page { min-height: 100vh; }

.motor-search {
  padding-bottom: 0;
  padding-top: 0;
}

/* Fondo de cuadrícula sutil en la sección de resultados */
.motor-results {
  background-image:
    linear-gradient(to right,  rgba(83, 74, 183, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(83, 74, 183, 0.05) 1px, transparent 1px);
  background-size: 40px 40px;
  padding: 2rem 2rem 4rem;
  animation: fadeUp 0.3s ease both;
}

.motor-results-inner {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 272px 1fr;
  gap: 1.5rem;
  align-items: start;
}

/* Score Panel */
.score-panel {
  background: var(--surface);
  border: 1px solid var(--ink-faint);
  border-radius: var(--r-lg);
  padding: 1.5rem;
  position: sticky;
  top: 72px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.score-number {
  font-family: var(--serif);
  font-size: 88px;
  line-height: 1;
  letter-spacing: -0.04em;
}

.score-label {
  margin-top: -0.5rem;
}

/* Termómetro vertical */
.termometro-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}

.termometro-track {
  width: 10px;
  height: 88px;
  border-radius: 5px;
  background: var(--gap-cov);
  position: relative;
  overflow: hidden;
}

.termometro-level {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, var(--gap-part), var(--gap-crit));
  border-radius: 5px;
  transition: height 0.9s cubic-bezier(0.4, 0, 0.2, 1);
}

.termometro-pct {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-light);
}

/* Agenda score pills */
.agenda-score-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.agenda-score-pill {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 9px;
  border-radius: var(--r);
}

.agenda-score-pill.tecnologica { background: var(--agenda-tec-bg); color: var(--agenda-tec); }
.agenda-score-pill.datos       { background: var(--agenda-datos-bg); color: var(--agenda-datos); }
.agenda-score-pill.genero      { background: var(--agenda-genero-bg); color: var(--agenda-genero); }

.agenda-score-num {
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 500;
}

.score-sintesis {
  font-size: 12px;
  color: var(--ink-mid);
  line-height: 1.55;
  border-top: 1px solid var(--ink-faint);
  padding-top: 0.75rem;
}

/* Results split */
.results-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: start;
}

.results-col {
  background: var(--surface);
  border: 1px solid var(--ink-faint);
  border-radius: var(--r-lg);
  overflow: hidden;
}

.results-col-header {
  padding: 10px 14px;
  border-bottom: 1px solid var(--ink-faint);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.results-col-count {
  background: var(--accent-bg);
  color: var(--accent);
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-family: var(--mono);
}

.results-empty {
  padding: 1.5rem 1rem;
  color: var(--ink-light);
  font-size: 12px;
  font-family: var(--mono);
  text-align: center;
}

/* Hit rows */
.hit-row {
  padding: 10px 14px;
  border-bottom: 1px solid var(--ink-faint);
  animation: fadeUp 0.25s ease calc(var(--row-delay, 0ms)) both;
}
.hit-row:last-child { border-bottom: none; }

.hit-titulo {
  font-size: 12px;
  font-weight: 500;
  color: var(--ink);
  line-height: 1.45;
  display: block;
  margin-bottom: 4px;
}

.hit-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 7px;
  font-size: 10px;
  color: var(--ink-light);
  font-family: var(--mono);
}

.hit-meta-sep { color: var(--ink-faint); }

.hit-sim-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.hit-sim-track {
  flex: 1;
  height: 3px;
  background: var(--ink-faint);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
}

.hit-sim-bar {
  position: absolute;
  left: 0; top: 0;
  height: 100%;
  border-radius: 2px;
}

.hit-sim-pct {
  font-size: 10px;
  color: var(--ink-light);
  font-family: var(--mono);
  min-width: 26px;
  text-align: right;
}

/* Search box */
.search-box {
  background: var(--surface);
  border: 1px solid var(--ink-faint);
  border-radius: var(--r-lg);
  overflow: hidden;
}

.search-textarea {
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  font-family: var(--sans);
  font-size: 15px;
  color: var(--ink);
  background: transparent;
  padding: 1rem 1.25rem 0.5rem;
  line-height: 1.6;
}

.search-textarea::placeholder { color: var(--ink-light); }
.search-textarea:disabled { opacity: 0.6; }

.search-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px 10px;
  border-top: 1px solid var(--ink-faint);
  gap: 8px;
}

.char-count { font-size: 11px; color: var(--ink-light); }

.search-actions { display: flex; gap: 8px; flex-shrink: 0; }

.search-loading-step {
  padding: 8px 16px;
  background: var(--accent-bg);
  color: var(--accent);
  font-size: 12px;
  font-family: var(--mono);
  border-top: 1px solid var(--ink-faint);
}

.search-error {
  padding: 10px 14px;
  background: var(--warn-bg);
  color: var(--warn);
  font-size: 12px;
  font-family: var(--mono);
}

.index-loading-note {
  font-size: 12px;
  font-family: var(--mono);
  color: var(--ink-light);
  padding: 6px 0;
}
```

- [ ] **Step 2: Reemplazar MonitorBrechas.tsx**

Reemplazar el contenido de `src/pages/MonitorBrechas.tsx`:

```typescript
import { useState, useEffect } from 'react'
import { useMotorBrechas } from '../hooks/useMotorBrechas'
import { useSearchIndex } from '../context/SearchIndexContext'
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

// ── SearchBox ──────────────────────────────────────────────────────────────

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

// ── HitRow ─────────────────────────────────────────────────────────────────

function HitRow({ hit, index }: { hit: SearchHit; index: number }) {
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
              width: animated ? `${hit.similitud * 100}%` : '0%',
              background: barColor,
              transition: `width 0.6s cubic-bezier(0.4,0,0.2,1) ${index * 60}ms`,
            }}
          />
        </div>
        <span className="hit-sim-pct">{Math.round(hit.similitud * 100)}%</span>
      </div>
    </div>
  )
}

// ── ScorePanel ─────────────────────────────────────────────────────────────

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
        <div className="score-label label-mono">score brecha</div>
      </div>
      <span className={`gap-category-badge ${resultado.categoria}`}>
        ● {resultado.categoria}
      </span>

      <div className="termometro-wrap">
        <div className="termometro-track">
          <div className="termometro-level" style={{ height: `${pct}%` }} />
        </div>
        <span className="termometro-pct label-mono">{pct}%</span>
      </div>

      <div className="agenda-score-list">
        {[
          { tipo: 'tecnologica', label: 'Ag. Tecnológica', val: resultado.agendas.tecnologica },
          { tipo: 'datos',       label: 'Ag. de Datos',    val: resultado.agendas.datos },
          { tipo: 'genero',      label: 'Ag. de Género',   val: resultado.agendas.genero },
        ].map(a => (
          <div key={a.tipo} className={`agenda-score-pill ${a.tipo}`}>
            <span className="label-mono" style={{ fontSize: 10 }}>{a.label}</span>
            <span className="agenda-score-num">{a.val}</span>
          </div>
        ))}
      </div>

      <p className="score-sintesis">{resultado.titulo}</p>
    </div>
  )
}

// ── ResultsColumns ─────────────────────────────────────────────────────────

function ResultsColumns({ resultado }: { resultado: GapResult }) {
  return (
    <div className="results-columns">
      <div className="results-col">
        <div className="results-col-header">
          <span className="label-mono">Datasets</span>
          <span className="results-col-count">{resultado.datasets.length}</span>
        </div>
        {resultado.datasets.length === 0
          ? <p className="results-empty">Sin datasets relacionados</p>
          : resultado.datasets.map((hit, i) => <HitRow key={hit.id} hit={hit} index={i} />)
        }
      </div>
      <div className="results-col">
        <div className="results-col-header">
          <span className="label-mono">Normativas</span>
          <span className="results-col-count">{resultado.normativas.length}</span>
        </div>
        {resultado.normativas.length === 0
          ? <p className="results-empty">Sin normativas relacionadas</p>
          : resultado.normativas.map((hit, i) => <HitRow key={hit.id} hit={hit} index={i} />)
        }
      </div>
    </div>
  )
}

// ── MonitorBrechas (página principal) ─────────────────────────────────────

export function MonitorBrechas() {
  const { isReady, error: indexError } = useSearchIndex()
  const { resultado, isLoading, error: searchError, buscar, limpiar } = useMotorBrechas()
  const [query, setQuery] = useState('')

  const handleBuscar = () => {
    if (query.trim().length >= 5) buscar(query.trim())
  }

  const handleLimpiar = () => {
    limpiar()
    setQuery('')
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

- [ ] **Step 3: Verificar que compila**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Ejecutar todos los tests**

```bash
npx vitest run
```

Expected: todos los tests pasan.

- [ ] **Step 5: Iniciar el servidor de desarrollo y verificar manualmente**

```bash
npm run dev
```

Navegar a `http://localhost:5173/brechas` y verificar:
- La página carga con el hero y el search box
- El botón "Buscar brecha →" está deshabilitado hasta escribir 5+ caracteres
- Al escribir y buscar, aparece el ScorePanel con el número grande y el termómetro
- El split view muestra datasets y normativas con barras de similitud animadas
- Las pastillas de agenda muestran valores numéricos

- [ ] **Step 6: Commit final**

```bash
git add src/pages/MonitorBrechas.tsx src/styles/app.css
git commit -m "feat: implement MonitorBrechas with split view, score panel, and animated thermometer"
```
