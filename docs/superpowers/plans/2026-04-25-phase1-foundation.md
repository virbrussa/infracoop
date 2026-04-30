# Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Working React + TypeScript app scaffolded in the existing repo on `dev` branch, connected to Supabase with real data from `infracoop_bd.xlsx`, and all base UI components matching the prototype's visual design.

**Architecture:** Vite React app at repo root. Global CSS (no CSS Modules) to preserve prototype class names. Supabase JS client as singleton service. Data layer via typed service functions + React hooks. Python scripts run offline to seed Supabase.

**Tech Stack:** React 18, TypeScript 5, Vite, React Router 6, @supabase/supabase-js, Vitest + React Testing Library (frontend), pytest + openpyxl + requests (Python scripts)

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/main.tsx` | App entry, imports global CSS |
| `src/App.tsx` | Router setup, 4 routes |
| `src/types/index.ts` | Dataset, Normativa, Pregunta, Formulario TS interfaces |
| `src/styles/tokens.css` | All CSS custom properties + base reset + shared classes |
| `src/styles/app.css` | Global layout styles (body, container, header, nav) |
| `src/services/supabase.ts` | Supabase client singleton |
| `src/services/dataService.ts` | getDatasets, getNormativas, getPreguntas, insertPregunta, submitFormulario |
| `src/hooks/useDatasets.ts` | useDatasets() hook with loading/error state |
| `src/hooks/useNormativas.ts` | useNormativas() hook |
| `src/hooks/usePreguntas.ts` | usePreguntas() hook |
| `src/components/Button.tsx` | Button (primary/ghost variants) |
| `src/components/Card.tsx` | Card wrapper |
| `src/components/Badge.tsx` | Badge (gap-category-badge, agenda badge) |
| `src/components/Header.tsx` | Logo + nav pills |
| `src/components/Layout.tsx` | max-width container |
| `src/pages/Landing.tsx` | Stub page |
| `src/pages/MonitorBrechas.tsx` | Stub page |
| `src/pages/MonitorColectivo.tsx` | Stub page |
| `src/pages/DatosQueremos.tsx` | Stub page |
| `scripts/import/import_xlsx.py` | Reads infracoop_bd.xlsx → SQL INSERT statements |
| `scripts/seed/generate_synthetic.py` | Generates ~665 synthetic records |
| `scripts/seed/README.md` | How to run scripts |
| `.env.example` | Template for env vars |
| `vitest.config.ts` | Vitest + jsdom setup |

---

## Task 0: Prepare repo for Vite scaffold

**Files:**
- Move: `index.html` → `archive/prototype-v4.html`
- Modify: `.gitignore`

- [ ] **Step 1: Switch to dev branch**

```bash
git checkout -b dev
```

Expected: `Switched to a new branch 'dev'`

- [ ] **Step 2: Move prototype HTML to archive**

```bash
mv index.html archive/prototype-v4.html
```

- [ ] **Step 3: Update .gitignore**

Open `.gitignore` and add these lines at the end:

```
# Node
node_modules/
dist/
.env
.env.local

# Python
__pycache__/
*.pyc
scripts/import/import_log.json
scripts/seed/output/
```

- [ ] **Step 4: Commit**

```bash
git add archive/prototype-v4.html .gitignore
git commit -m "chore: move prototype to archive, prepare for Vite scaffold"
```

---

## Task 1: Scaffold Vite + React + TypeScript

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `vitest.config.ts`

- [ ] **Step 1: Scaffold Vite project at repo root**

```bash
npm create vite@latest . -- --template react-ts
```

When prompted "Current directory is not empty. Remove existing files and continue?" → type `y` and press Enter.

- [ ] **Step 2: Install base dependencies**

```bash
npm install
npm install react-router-dom @supabase/supabase-js
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts` at repo root:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 4: Create test setup file**

Create `src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Add test script to package.json**

Open `package.json` and update the `scripts` section to add:

```json
"test": "vitest",
"test:ui": "vitest --ui"
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: Server starts at `http://localhost:5173`. Browser shows default Vite + React page.

Press Ctrl+C to stop.

- [ ] **Step 7: Verify tests run**

```bash
npm test
```

Expected: `No test files found` (no tests yet). Exit with Ctrl+C.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite React TypeScript app with Vitest"
```

---

## Task 2: TypeScript types

**Files:**
- Create: `src/types/index.ts`
- Create: `src/test/types.test.ts`

- [ ] **Step 1: Write the failing type test**

Create `src/test/types.test.ts`:

```typescript
import { describe, it, expectTypeOf } from 'vitest'
import type { Dataset, Normativa, Pregunta, DatasetFilters } from '../types'

describe('Dataset type', () => {
  it('has required fields', () => {
    const d: Dataset = {
      id: 'DS-001',
      titulo: 'Test',
      fuente_organismo: null,
      pais_iso3: 'MEX',
      anio_publicacion: 2024,
      subtema: null,
      agendas: ['Ag. Género'],
      calidad: 'Completa',
      frecuencia: null,
      desagregacion_geo: null,
      accesibilidad_formato: null,
      url_descarga: null,
      url_valida: true,
      descripcion_notas: null,
      es_sintetico: false,
      created_at: '2024-01-01T00:00:00Z',
    }
    expectTypeOf(d.id).toBeString()
    expectTypeOf(d.agendas).toEqualTypeOf<string[]>()
  })
})

describe('Normativa type', () => {
  it('has required fields', () => {
    const n: Normativa = {
      id: 'NM-001',
      nombre: 'CEDAW',
      organismo_emisor: null,
      tipo: null,
      pais_alcance: 'Internacional',
      anio_adopcion: 1979,
      articulo_numeral: null,
      obligacion_datos: null,
      agendas: ['Ag. Género'],
      url_texto_oficial: null,
      descripcion_notas: null,
      es_sintetico: false,
      created_at: '2024-01-01T00:00:00Z',
    }
    expectTypeOf(n.id).toBeString()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../types'`

- [ ] **Step 3: Create types**

Create `src/types/index.ts`:

```typescript
export interface Dataset {
  id: string
  titulo: string
  fuente_organismo: string | null
  pais_iso3: string | null
  anio_publicacion: number | null
  subtema: string | null
  agendas: string[]
  calidad: 'Completa' | 'Parcial' | 'Nula' | null
  frecuencia: string | null
  desagregacion_geo: string | null
  accesibilidad_formato: string | null
  url_descarga: string | null
  url_valida: boolean
  descripcion_notas: string | null
  es_sintetico: boolean
  created_at: string
}

export interface Normativa {
  id: string
  nombre: string
  organismo_emisor: string | null
  tipo: string | null
  pais_alcance: string | null
  anio_adopcion: number | null
  articulo_numeral: string | null
  obligacion_datos: string | null
  agendas: string[]
  url_texto_oficial: string | null
  descripcion_notas: string | null
  es_sintetico: boolean
  created_at: string
}

export interface Pregunta {
  id: string
  texto: string
  fecha: string
  agenda_clasificada: string | null
  resultado_score: number | null
  datasets_encontrados: string[]
  es_sintetico: boolean
}

export interface FormularioData {
  titulo: string
  fuente_organismo: string
  pais_iso3: string
  anio_publicacion: number | null
  subtema: string
  agendas: string[]
  frecuencia: string
  desagregacion_geo: string
  accesibilidad_formato: string
  url_descarga: string
  descripcion_notas: string
  ingresado_por: string
}

export interface DatasetFilters {
  agenda?: string
  pais?: string
  calidad?: 'Completa' | 'Parcial' | 'Nula'
  sintetico?: boolean
}

export interface NormativaFilters {
  agenda?: string
  pais_alcance?: string
  sintetico?: boolean
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test
```

Expected: PASS — 2 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/test/types.test.ts src/test/setup.ts vitest.config.ts
git commit -m "feat: add TypeScript types for Dataset, Normativa, Pregunta"
```

---

## Task 3: CSS design system

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/app.css`
- Modify: `index.html` (add Google Fonts)
- Modify: `src/main.tsx` (import CSS)

- [ ] **Step 1: Create tokens.css**

Create `src/styles/tokens.css`:

```css
:root {
  --ink: #1a1916;
  --ink-mid: #4a4844;
  --ink-light: #8a8880;
  --ink-faint: #d4d2cc;
  --paper: #f5f3ee;
  --paper-warm: #ece9e2;
  --surface: #fff;
  --accent: #534AB7;
  --accent-bg: #EEEDFE;
  --ok: #1d6e4a;
  --ok-bg: #e8f5ef;
  --warn: #7a4f10;
  --warn-bg: #fdf3e3;
  --gap-crit: #534AB7;
  --gap-part: #7F77DD;
  --gap-cov: #1d6e4a;
  --agenda-tec: #0C447C;
  --agenda-tec-bg: #E6F1FB;
  --agenda-datos: #3C3489;
  --agenda-datos-bg: #EEEDFE;
  --agenda-genero: #72243E;
  --agenda-genero-bg: #FBEAF0;
  --serif: 'DM Serif Display', Georgia, serif;
  --sans: 'Instrument Sans', system-ui, sans-serif;
  --mono: 'DM Mono', 'Courier New', monospace;
  --r: 6px;
  --r-lg: 12px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--sans);
  background: var(--paper);
  color: var(--ink);
  min-height: 100vh;
  line-height: 1.6;
}

/* Buttons */
.btn-primary {
  background: var(--ink);
  color: var(--paper);
  border: none;
  border-radius: var(--r);
  padding: 9px 20px;
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s, transform .1s;
  display: flex;
  align-items: center;
  gap: 6px;
  letter-spacing: .01em;
}
.btn-primary:hover { background: #2e2d2a; }
.btn-primary:active { transform: scale(.98); }
.btn-primary:disabled { background: var(--ink-faint); cursor: not-allowed; }

.btn-ghost {
  background: transparent;
  color: var(--ink-mid);
  border: 1px solid var(--ink-faint);
  border-radius: var(--r);
  padding: 8px 14px;
  font-family: var(--sans);
  font-size: 13px;
  cursor: pointer;
  transition: background .15s, border-color .15s;
}
.btn-ghost:hover { background: var(--paper-warm); border-color: var(--ink-mid); }

/* Cards */
.card {
  background: var(--surface);
  border: 1px solid var(--ink-faint);
  border-radius: var(--r-lg);
  padding: 1.5rem;
}

/* Badges */
.gap-category-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  font-family: var(--mono);
}
.gap-category-badge.critica  { background: var(--accent-bg); color: var(--gap-crit); }
.gap-category-badge.parcial  { background: #f0efff; color: var(--gap-part); }
.gap-category-badge.cubierta { background: var(--ok-bg); color: var(--gap-cov); }

.agenda-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  font-family: var(--mono);
}
.agenda-badge.tecnologica { background: var(--agenda-tec-bg); color: var(--agenda-tec); }
.agenda-badge.datos       { background: var(--agenda-datos-bg); color: var(--agenda-datos); }
.agenda-badge.genero      { background: var(--agenda-genero-bg); color: var(--agenda-genero); }

/* Typography helpers */
.label-mono {
  font-size: 11px;
  font-family: var(--mono);
  color: var(--ink-light);
  letter-spacing: .08em;
  text-transform: uppercase;
}
```

- [ ] **Step 2: Create app.css**

Create `src/styles/app.css`:

```css
.container {
  max-width: 860px;
  margin: 0 auto;
  padding: 3rem 2rem 6rem;
}

.hero {
  margin-bottom: 3rem;
  padding-bottom: 2.5rem;
  border-bottom: 1px solid var(--ink-faint);
}

.hero-eyebrow {
  font-size: 11px;
  font-family: var(--mono);
  color: var(--ink-light);
  letter-spacing: .1em;
  text-transform: uppercase;
  margin-bottom: 12px;
}

.hero h1 {
  font-family: var(--serif);
  font-size: clamp(2rem, 5vw, 3rem);
  line-height: 1.1;
  letter-spacing: -0.03em;
  color: var(--ink);
  margin-bottom: 12px;
  max-width: 600px;
}

.hero h1 em { font-style: italic; color: var(--accent); }

.hero-sub {
  font-size: 15px;
  color: var(--ink-mid);
  max-width: 520px;
  line-height: 1.65;
}
```

- [ ] **Step 3: Add Google Fonts to index.html**

Open `index.html` and add inside `<head>`, before the closing tag:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet">
```

- [ ] **Step 4: Import CSS in main.tsx**

Replace the contents of `src/main.tsx` with:

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/app.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 5: Verify styles load**

```bash
npm run dev
```

Expected: Browser shows page with `var(--paper)` background (`#f5f3ee` — warm cream). Open DevTools → Elements → `:root` to confirm CSS variables exist.

- [ ] **Step 6: Commit**

```bash
git add src/styles/ src/main.tsx index.html
git commit -m "feat: migrate CSS design system tokens and base styles"
```

---

## Task 4: Supabase client

**Files:**
- Create: `.env.example`
- Create: `src/services/supabase.ts`
- Create: `src/test/supabase.test.ts`

- [ ] **Step 1: Create .env.example**

Create `.env.example`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_USE_SYNTHETIC_DATA=true
VITE_FORM_MODE=review
```

- [ ] **Step 2: Create your .env file**

```bash
cp .env.example .env
```

Then open `.env` and fill in your actual Supabase URL and anon key from the Supabase dashboard (Settings → API).

- [ ] **Step 3: Write the failing test**

Create `src/test/supabase.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: vi.fn() })),
}))

describe('supabase client', () => {
  it('exports a supabase instance', async () => {
    const { supabase } = await import('../services/supabase')
    expect(supabase).toBeDefined()
    expect(typeof supabase.from).toBe('function')
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../services/supabase'`

- [ ] **Step 5: Create Supabase client**

Create `src/services/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 6: Run test to verify it passes**

```bash
npm test
```

Expected: PASS — 1 test passing (types test + supabase test = 3 total).

- [ ] **Step 7: Commit**

```bash
git add src/services/supabase.ts src/test/supabase.test.ts .env.example
git commit -m "feat: add Supabase client singleton"
```

---

## Task 5: dataService

**Files:**
- Create: `src/services/dataService.ts`
- Create: `src/test/dataService.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/test/dataService.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Dataset, Normativa, Pregunta } from '../types'

const mockDatasets: Dataset[] = [
  {
    id: 'DS-001', titulo: 'ENDIREH 2021', fuente_organismo: 'INEGI',
    pais_iso3: 'MEX', anio_publicacion: 2021, subtema: 'violencia',
    agendas: ['Ag. Género', 'Ag. Datos'], calidad: 'Completa',
    frecuencia: 'Quinquenal', desagregacion_geo: 'Municipal',
    accesibilidad_formato: 'CSV', url_descarga: 'https://inegi.org.mx',
    url_valida: true, descripcion_notas: null, es_sintetico: false,
    created_at: '2024-01-01T00:00:00Z',
  },
]

const mockFrom = vi.fn()
vi.mock('../services/supabase', () => ({
  supabase: { from: mockFrom },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getDatasets', () => {
  it('returns datasets array', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockDatasets, error: null }),
      }),
    })
    const { getDatasets } = await import('../services/dataService')
    const result = await getDatasets()
    expect(result).toEqual(mockDatasets)
  })

  it('filters by synthetic flag from env', async () => {
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    })
    mockFrom.mockReturnValue({ select: selectMock })
    const { getDatasets } = await import('../services/dataService')
    await getDatasets()
    expect(mockFrom).toHaveBeenCalledWith('datasets')
  })

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }),
    })
    const { getDatasets } = await import('../services/dataService')
    await expect(getDatasets()).rejects.toThrow('DB error')
  })
})

describe('insertPregunta', () => {
  it('inserts and returns the pregunta', async () => {
    const mockPregunta: Pregunta = {
      id: 'uuid-1', texto: 'datos feminicidio', fecha: '2026-01-01T00:00:00Z',
      agenda_clasificada: null, resultado_score: null, datasets_encontrados: [],
      es_sintetico: false,
    }
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockPregunta, error: null }),
        }),
      }),
    })
    const { insertPregunta } = await import('../services/dataService')
    const result = await insertPregunta('datos feminicidio')
    expect(result.texto).toBe('datos feminicidio')
  })
})

describe('submitFormulario', () => {
  it('inserts into formularios_publicados when mode is directo', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })
    const { submitFormulario } = await import('../services/dataService')
    const data = { titulo: 'Test', fuente_organismo: 'INEGI', pais_iso3: 'MEX',
      anio_publicacion: 2024, subtema: 'test', agendas: [], frecuencia: 'Anual',
      desagregacion_geo: 'Nacional', accesibilidad_formato: 'CSV',
      url_descarga: 'https://example.com', descripcion_notas: '', ingresado_por: 'test' }
    await submitFormulario(data, 'directo')
    expect(mockFrom).toHaveBeenCalledWith('formularios_publicados')
  })

  it('inserts into formularios_en_revision when mode is revision', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })
    const { submitFormulario } = await import('../services/dataService')
    const data = { titulo: 'Test', fuente_organismo: 'INEGI', pais_iso3: 'MEX',
      anio_publicacion: 2024, subtema: 'test', agendas: [], frecuencia: 'Anual',
      desagregacion_geo: 'Nacional', accesibilidad_formato: 'CSV',
      url_descarga: 'https://example.com', descripcion_notas: '', ingresado_por: 'test' }
    await submitFormulario(data, 'revision')
    expect(mockFrom).toHaveBeenCalledWith('formularios_en_revision')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../services/dataService'`

- [ ] **Step 3: Create dataService**

Create `src/services/dataService.ts`:

```typescript
import { supabase } from './supabase'
import type { Dataset, Normativa, Pregunta, FormularioData, DatasetFilters, NormativaFilters } from '../types'

const useSynthetic = import.meta.env.VITE_USE_SYNTHETIC_DATA === 'true'

export async function getDatasets(filters?: DatasetFilters): Promise<Dataset[]> {
  let query = supabase.from('datasets').select('*')

  if (!useSynthetic) {
    query = query.eq('es_sintetico', false)
  }
  if (filters?.agenda) {
    query = query.contains('agendas', [filters.agenda])
  }
  if (filters?.pais) {
    query = query.eq('pais_iso3', filters.pais)
  }
  if (filters?.calidad) {
    query = query.eq('calidad', filters.calidad)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as Dataset[]) ?? []
}

export async function getNormativas(filters?: NormativaFilters): Promise<Normativa[]> {
  let query = supabase.from('normativas').select('*')

  if (!useSynthetic) {
    query = query.eq('es_sintetico', false)
  }
  if (filters?.agenda) {
    query = query.contains('agendas', [filters.agenda])
  }
  if (filters?.pais_alcance) {
    query = query.eq('pais_alcance', filters.pais_alcance)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as Normativa[]) ?? []
}

export async function getPreguntas(desde?: string): Promise<Pregunta[]> {
  let query = supabase.from('preguntas').select('*').order('fecha', { ascending: false })

  if (desde) {
    query = query.gte('fecha', desde)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as Pregunta[]) ?? []
}

export async function insertPregunta(texto: string): Promise<Pregunta> {
  const { data, error } = await supabase
    .from('preguntas')
    .insert({ texto })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Pregunta
}

export async function submitFormulario(
  formulario: FormularioData,
  modo: 'directo' | 'revision'
): Promise<void> {
  const tabla = modo === 'directo' ? 'formularios_publicados' : 'formularios_en_revision'
  const payload = modo === 'revision'
    ? { ...formulario, status: 'pendiente' }
    : formulario

  const { error } = await supabase.from(tabla).insert(payload)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: PASS — all tests passing (types + supabase + dataService).

- [ ] **Step 5: Commit**

```bash
git add src/services/dataService.ts src/test/dataService.test.ts
git commit -m "feat: add dataService with getDatasets, getNormativas, insertPregunta, submitFormulario"
```

---

## Task 6: React hooks

**Files:**
- Create: `src/hooks/useDatasets.ts`
- Create: `src/hooks/useNormativas.ts`
- Create: `src/hooks/usePreguntas.ts`
- Create: `src/test/hooks.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/test/hooks.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { Dataset } from '../types'

const mockDatasets: Dataset[] = [
  { id: 'DS-001', titulo: 'ENDIREH 2021', fuente_organismo: 'INEGI',
    pais_iso3: 'MEX', anio_publicacion: 2021, subtema: null,
    agendas: ['Ag. Género'], calidad: 'Completa', frecuencia: null,
    desagregacion_geo: null, accesibilidad_formato: null, url_descarga: null,
    url_valida: true, descripcion_notas: null, es_sintetico: false,
    created_at: '2024-01-01T00:00:00Z' },
]

vi.mock('../services/dataService', () => ({
  getDatasets: vi.fn().mockResolvedValue(mockDatasets),
  getNormativas: vi.fn().mockResolvedValue([]),
  getPreguntas: vi.fn().mockResolvedValue([]),
}))

describe('useDatasets', () => {
  it('returns loading true initially, then data', async () => {
    const { useDatasets } = await import('../hooks/useDatasets')
    const { result } = renderHook(() => useDatasets())

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.datasets).toEqual(mockDatasets)
    expect(result.current.error).toBeNull()
  })
})

describe('useNormativas', () => {
  it('returns loading true initially, then empty array', async () => {
    const { useNormativas } = await import('../hooks/useNormativas')
    const { result } = renderHook(() => useNormativas())

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.normativas).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../hooks/useDatasets'`

- [ ] **Step 3: Create useDatasets hook**

Create `src/hooks/useDatasets.ts`:

```typescript
import { useState, useEffect } from 'react'
import { getDatasets } from '../services/dataService'
import type { Dataset, DatasetFilters } from '../types'

interface UseDatasetsResult {
  datasets: Dataset[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useDatasets(filters?: DatasetFilters): UseDatasetsResult {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getDatasets(filters)
      .then((data) => { if (!cancelled) { setDatasets(data); setLoading(false) } })
      .catch((err) => { if (!cancelled) { setError(err.message); setLoading(false) } })

    return () => { cancelled = true }
  }, [filters?.agenda, filters?.pais, filters?.calidad, tick])

  return { datasets, loading, error, refetch: () => setTick((t) => t + 1) }
}
```

- [ ] **Step 4: Create useNormativas hook**

Create `src/hooks/useNormativas.ts`:

```typescript
import { useState, useEffect } from 'react'
import { getNormativas } from '../services/dataService'
import type { Normativa, NormativaFilters } from '../types'

interface UseNormativasResult {
  normativas: Normativa[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useNormativas(filters?: NormativaFilters): UseNormativasResult {
  const [normativas, setNormativas] = useState<Normativa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getNormativas(filters)
      .then((data) => { if (!cancelled) { setNormativas(data); setLoading(false) } })
      .catch((err) => { if (!cancelled) { setError(err.message); setLoading(false) } })

    return () => { cancelled = true }
  }, [filters?.agenda, filters?.pais_alcance, tick])

  return { normativas, loading, error, refetch: () => setTick((t) => t + 1) }
}
```

- [ ] **Step 5: Create usePreguntas hook**

Create `src/hooks/usePreguntas.ts`:

```typescript
import { useState, useEffect } from 'react'
import { getPreguntas } from '../services/dataService'
import type { Pregunta } from '../types'

interface UsePreguntasResult {
  preguntas: Pregunta[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function usePreguntas(desde?: string): UsePreguntasResult {
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getPreguntas(desde)
      .then((data) => { if (!cancelled) { setPreguntas(data); setLoading(false) } })
      .catch((err) => { if (!cancelled) { setError(err.message); setLoading(false) } })

    return () => { cancelled = true }
  }, [desde, tick])

  return { preguntas, loading, error, refetch: () => setTick((t) => t + 1) }
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test
```

Expected: PASS — all tests passing.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/ src/test/hooks.test.tsx
git commit -m "feat: add useDatasets, useNormativas, usePreguntas hooks"
```

---

## Task 7: Base UI components

**Files:**
- Create: `src/components/Button.tsx`
- Create: `src/components/Card.tsx`
- Create: `src/components/Badge.tsx`
- Create: `src/test/components.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/test/components.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'

describe('Button', () => {
  it('renders primary variant with children', () => {
    render(<Button variant="primary">Buscar brecha</Button>)
    expect(screen.getByRole('button', { name: 'Buscar brecha' })).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveClass('btn-primary')
  })

  it('renders ghost variant', () => {
    render(<Button variant="ghost">Cancelar</Button>)
    expect(screen.getByRole('button')).toHaveClass('btn-ghost')
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Button variant="primary" onClick={onClick}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is disabled when disabled prop is set', () => {
    render(<Button variant="primary" disabled>Buscar</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})

describe('Card', () => {
  it('renders children inside card div', () => {
    render(<Card><p>Contenido</p></Card>)
    expect(screen.getByText('Contenido')).toBeInTheDocument()
  })
})

describe('Badge', () => {
  it('renders critica badge', () => {
    render(<Badge type="gap" variant="critica">Brecha Crítica</Badge>)
    const badge = screen.getByText('Brecha Crítica')
    expect(badge).toHaveClass('gap-category-badge', 'critica')
  })

  it('renders agenda badge for tecnologica', () => {
    render(<Badge type="agenda" variant="tecnologica">Ag. Tecnológica</Badge>)
    const badge = screen.getByText('Ag. Tecnológica')
    expect(badge).toHaveClass('agenda-badge', 'tecnologica')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../components/Button'`

- [ ] **Step 3: Create Button component**

Create `src/components/Button.tsx`:

```typescript
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'ghost'
  children: React.ReactNode
}

export function Button({ variant, children, className = '', ...props }: ButtonProps) {
  const cls = variant === 'primary' ? 'btn-primary' : 'btn-ghost'
  return (
    <button className={`${cls} ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}
```

- [ ] **Step 4: Create Card component**

Create `src/components/Card.tsx`:

```typescript
interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`card ${className}`.trim()}>
      {children}
    </div>
  )
}
```

- [ ] **Step 5: Create Badge component**

Create `src/components/Badge.tsx`:

```typescript
interface GapBadgeProps {
  type: 'gap'
  variant: 'critica' | 'parcial' | 'cubierta'
  children: React.ReactNode
}

interface AgendaBadgeProps {
  type: 'agenda'
  variant: 'tecnologica' | 'datos' | 'genero'
  children: React.ReactNode
}

type BadgeProps = GapBadgeProps | AgendaBadgeProps

export function Badge({ type, variant, children }: BadgeProps) {
  if (type === 'gap') {
    return <span className={`gap-category-badge ${variant}`}>{children}</span>
  }
  return <span className={`agenda-badge ${variant}`}>{children}</span>
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test
```

Expected: PASS — all tests passing.

- [ ] **Step 7: Commit**

```bash
git add src/components/Button.tsx src/components/Card.tsx src/components/Badge.tsx src/test/components.test.tsx
git commit -m "feat: add Button, Card, Badge base components"
```

---

## Task 8: Header, Layout, routing, page stubs

**Files:**
- Create: `src/components/Header.tsx`
- Create: `src/components/Layout.tsx`
- Create: `src/pages/Landing.tsx`
- Create: `src/pages/MonitorBrechas.tsx`
- Create: `src/pages/MonitorColectivo.tsx`
- Create: `src/pages/DatosQueremos.tsx`
- Modify: `src/App.tsx`
- Create: `src/test/Header.test.tsx`

- [ ] **Step 1: Write failing Header test**

Create `src/test/Header.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Header } from '../components/Header'

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('Header', () => {
  it('renders the Infra.Coop logo', () => {
    renderWithRouter(<Header />)
    expect(screen.getByText('Infra.Coop')).toBeInTheDocument()
  })

  it('renders all 4 navigation links', () => {
    renderWithRouter(<Header />)
    expect(screen.getByRole('link', { name: /¿Qué es/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Monitor de Brechas/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Monitor Colectivo/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /¿Qué datos/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../components/Header'`

- [ ] **Step 3: Create Header component**

Create `src/components/Header.tsx`:

```typescript
import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: '¿Qué es Infra.Coop?' },
  { to: '/brechas', label: 'Monitor de Brechas' },
  { to: '/colectivo', label: 'Monitor Colectivo' },
  { to: '/datos', label: '¿Qué datos queremos?' },
]

export function Header() {
  return (
    <header style={{
      borderBottom: '1px solid var(--ink-faint)',
      padding: '0 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '60px',
      background: 'var(--paper)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      gap: '1rem',
    }}>
      <NavLink to="/" className="logo" style={{ display: 'flex', alignItems: 'baseline', gap: '2px', textDecoration: 'none' }}>
        <span className="logo-text" style={{ fontFamily: 'var(--serif)', fontSize: '22px', color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1 }}>
          Infra.Coop
        </span>
        <span className="logo-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', margin: '0 1px 4px' }} />
      </NavLink>

      <nav style={{ display: 'flex', gap: 0, alignItems: 'stretch', overflowX: 'auto' }}>
        {NAV_ITEMS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-pill${isActive ? ' active' : ''}`}
            style={{
              fontSize: '12px',
              fontWeight: 400,
              fontFamily: 'var(--sans)',
              padding: '0 14px',
              height: '60px',
              border: 'none',
              borderBottom: '2px solid transparent',
              cursor: 'pointer',
              background: 'transparent',
              color: 'var(--ink-light)',
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
            }}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <span className="label-mono" style={{ flexShrink: 0 }}>Mozilla Fellowship 2024–26</span>
    </header>
  )
}
```

- [ ] **Step 4: Create Layout component**

Create `src/components/Layout.tsx`:

```typescript
interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return <main className="container">{children}</main>
}
```

- [ ] **Step 5: Create page stubs**

Create `src/pages/Landing.tsx`:

```typescript
import { Layout } from '../components/Layout'

export function Landing() {
  return (
    <Layout>
      <div className="hero">
        <p className="hero-eyebrow">Infra.Coop · Motor de Brechas</p>
        <h1>Datos que <em>faltan</em>, estructuras que importan.</h1>
        <p className="hero-sub">Mapeamos brechas en datos de género en América Latina comparando lo que existe con lo que la normativa exige.</p>
      </div>
    </Layout>
  )
}
```

Create `src/pages/MonitorBrechas.tsx`:

```typescript
import { Layout } from '../components/Layout'

export function MonitorBrechas() {
  return (
    <Layout>
      <div className="hero">
        <p className="hero-eyebrow">Monitor de Brechas</p>
        <h1>¿Qué datos <em>faltan</em>?</h1>
        <p className="hero-sub">Buscá brechas de datos de género en América Latina.</p>
      </div>
      <p style={{ color: 'var(--ink-light)', fontFamily: 'var(--mono)', fontSize: '13px' }}>
        — Motor de búsqueda: próximamente (Épica 2) —
      </p>
    </Layout>
  )
}
```

Create `src/pages/MonitorColectivo.tsx`:

```typescript
import { Layout } from '../components/Layout'

export function MonitorColectivo() {
  return (
    <Layout>
      <div className="hero">
        <p className="hero-eyebrow">Monitor Colectivo</p>
        <h1>El mapa <em>colectivo</em> de brechas</h1>
        <p className="hero-sub">Visualizaciones de brechas por agenda, evolución temporal y distribución geográfica.</p>
      </div>
      <p style={{ color: 'var(--ink-light)', fontFamily: 'var(--mono)', fontSize: '13px' }}>
        — Visualizaciones: próximamente (Épica 3) —
      </p>
    </Layout>
  )
}
```

Create `src/pages/DatosQueremos.tsx`:

```typescript
import { Layout } from '../components/Layout'

export function DatosQueremos() {
  return (
    <Layout>
      <div className="hero">
        <p className="hero-eyebrow">¿Qué datos queremos?</p>
        <h1>Los datos que <em>necesitamos</em></h1>
        <p className="hero-sub">Datos más buscados, brechas por agenda, y datos existentes con calidad insuficiente.</p>
      </div>
      <p style={{ color: 'var(--ink-light)', fontFamily: 'var(--mono)', fontSize: '13px' }}>
        — Análisis de demanda: próximamente (Épica 4) —
      </p>
    </Layout>
  )
}
```

- [ ] **Step 6: Wire up App.tsx with router**

Replace `src/App.tsx` with:

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Header } from './components/Header'
import { Landing } from './pages/Landing'
import { MonitorBrechas } from './pages/MonitorBrechas'
import { MonitorColectivo } from './pages/MonitorColectivo'
import { DatosQueremos } from './pages/DatosQueremos'

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/brechas" element={<MonitorBrechas />} />
        <Route path="/colectivo" element={<MonitorColectivo />} />
        <Route path="/datos" element={<DatosQueremos />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
npm test
```

Expected: PASS — all tests passing.

- [ ] **Step 8: Verify navigation in browser**

```bash
npm run dev
```

Open `http://localhost:5173`. Verify:
- Header shows "Infra.Coop" logo with purple dot
- 4 nav pills visible
- Clicking each pill navigates to the correct stub page
- Active pill highlights in accent purple

- [ ] **Step 9: Commit**

```bash
git add src/components/Header.tsx src/components/Layout.tsx src/pages/ src/App.tsx src/test/Header.test.tsx
git commit -m "feat: add Header, Layout, routing, and 4 page stubs"
```

---

## Task 9: Run schema in Supabase

This task is manual — run in the Supabase SQL Editor.

**Files:**
- Reference: `db/schema.sql` (already written)

- [ ] **Step 1: Open Supabase SQL Editor**

Go to your Supabase project → SQL Editor → New query.

- [ ] **Step 2: Run the schema**

Copy the entire contents of `db/schema.sql` and paste into the SQL Editor. Click "Run".

Expected: All 5 `CREATE TABLE` statements succeed. No errors.

- [ ] **Step 3: Enable RLS**

Run this in a new SQL Editor query:

```sql
ALTER TABLE datasets                ENABLE ROW LEVEL SECURITY;
ALTER TABLE normativas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE preguntas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE formularios_publicados  ENABLE ROW LEVEL SECURITY;
ALTER TABLE formularios_en_revision ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read datasets"    ON datasets    FOR SELECT USING (true);
CREATE POLICY "public read normativas"  ON normativas  FOR SELECT USING (true);
CREATE POLICY "public read preguntas"   ON preguntas   FOR SELECT USING (true);
CREATE POLICY "insert preguntas"        ON preguntas   FOR INSERT WITH CHECK (true);
CREATE POLICY "insert forms pub"        ON formularios_publicados  FOR INSERT WITH CHECK (true);
CREATE POLICY "public read forms pub"   ON formularios_publicados  FOR SELECT USING (true);
CREATE POLICY "insert forms rev"        ON formularios_en_revision FOR INSERT WITH CHECK (true);
```

- [ ] **Step 4: Verify tables exist**

In Supabase → Table Editor, confirm all 5 tables appear: `datasets`, `normativas`, `preguntas`, `formularios_publicados`, `formularios_en_revision`.

- [ ] **Step 5: Test connection from the app**

```bash
npm run dev
```

Open browser DevTools → Console. Add a temporary test in `src/App.tsx` (revert after verification):

```typescript
import { supabase } from './services/supabase'
supabase.from('datasets').select('count').then(console.log)
```

Expected console output: `{ data: [{ count: '0' }], error: null, ... }`

Remove the temporary test line from `App.tsx`.

---

## Task 10: Import real data from Excel

**Files:**
- Create: `scripts/import/import_xlsx.py`
- Create: `scripts/import/requirements.txt`

- [ ] **Step 1: Create Python requirements**

Create `scripts/import/requirements.txt`:

```
openpyxl==3.1.2
requests==2.31.0
supabase==2.4.0
python-dotenv==1.0.0
```

Install:

```bash
cd scripts/import && pip install -r requirements.txt && cd ../..
```

- [ ] **Step 2: Create import script**

Create `scripts/import/import_xlsx.py`:

```python
"""
Imports infracoop_bd.xlsx into Supabase.
Usage: python import_xlsx.py [--validate-urls] [--dry-run]

Reads sheets: Datasets (42 rows), Normativas (35 rows).
Skips sheet: Metodología (documentation only).
"""
import argparse
import json
import os
import sys
from pathlib import Path

import openpyxl
import requests
from dotenv import load_dotenv
from supabase import create_client

# Load env from repo root .env
load_dotenv(Path(__file__).parent.parent.parent / '.env')

SUPABASE_URL = os.environ['VITE_SUPABASE_URL']
SUPABASE_KEY = os.environ['VITE_SUPABASE_ANON_KEY']
XLSX_PATH = Path(__file__).parent.parent.parent / 'data' / 'infracoop_bd.xlsx'

KNOWN_PROBLEMATIC = {
    'DS-006': 'PDF — no machine-readable',
    'DS-012': 'Power BI — not downloadable',
    'DS-021': 'DBF format',
    'DS-022': 'DBF format',
    'DS-023': 'DBF format',
    'DS-029': 'PDF — no machine-readable',
    'DS-030': 'Power BI — not downloadable',
    'DS-031': 'Power BI — not downloadable',
    'DS-035': 'Discontinued July 2023',
}


def parse_agendas(cell_value: str | None) -> list[str]:
    if not cell_value:
        return []
    return [a.strip() for a in str(cell_value).split('·') if a.strip()]


def validate_url(url: str | None, dataset_id: str) -> bool:
    if not url:
        return False
    if dataset_id in KNOWN_PROBLEMATIC:
        return False
    try:
        r = requests.head(url, timeout=8, allow_redirects=True)
        return r.status_code < 400
    except Exception:
        return False


def import_datasets(ws, client, validate_urls: bool, dry_run: bool) -> list[dict]:
    log = []
    # Skip header row
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    for row in rows:
        if not row[0]:  # skip empty rows
            continue
        (ds_id, titulo, fuente, pais, anio, subtema, agendas_raw,
         frecuencia, desagregacion, accesibilidad, url, descripcion) = row[:12]

        url_valida = validate_url(url, str(ds_id)) if validate_urls else True

        record = {
            'id': str(ds_id),
            'titulo': str(titulo) if titulo else '',
            'fuente_organismo': str(fuente) if fuente else None,
            'pais_iso3': str(pais) if pais else None,
            'anio_publicacion': int(anio) if anio else None,
            'subtema': str(subtema) if subtema else None,
            'agendas': parse_agendas(str(agendas_raw) if agendas_raw else ''),
            'frecuencia': str(frecuencia) if frecuencia else None,
            'desagregacion_geo': str(desagregacion) if desagregacion else None,
            'accesibilidad_formato': str(accesibilidad) if accesibilidad else None,
            'url_descarga': str(url) if url else None,
            'url_valida': url_valida,
            'descripcion_notas': str(descripcion) if descripcion else None,
            'es_sintetico': False,
        }

        status = 'skipped (dry-run)' if dry_run else 'ok'
        if not dry_run:
            try:
                client.table('datasets').upsert(record).execute()
            except Exception as e:
                status = f'error: {e}'

        log.append({'id': str(ds_id), 'titulo': str(titulo), 'status': status,
                    'url_valida': url_valida,
                    'nota': KNOWN_PROBLEMATIC.get(str(ds_id), '')})
        print(f"  {'✓' if 'error' not in status else '✗'} {ds_id}: {titulo[:50]}")

    return log


def import_normativas(ws, client, dry_run: bool) -> list[dict]:
    log = []
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    for row in rows:
        if not row[0]:
            continue
        (nm_id, nombre, organismo, tipo, pais_alcance, anio,
         articulo, obligacion, agendas_raw, url, descripcion) = row[:11]

        record = {
            'id': str(nm_id),
            'nombre': str(nombre) if nombre else '',
            'organismo_emisor': str(organismo) if organismo else None,
            'tipo': str(tipo) if tipo else None,
            'pais_alcance': str(pais_alcance) if pais_alcance else None,
            'anio_adopcion': int(anio) if anio else None,
            'articulo_numeral': str(articulo) if articulo else None,
            'obligacion_datos': str(obligacion) if obligacion else None,
            'agendas': parse_agendas(str(agendas_raw) if agendas_raw else ''),
            'url_texto_oficial': str(url) if url else None,
            'descripcion_notas': str(descripcion) if descripcion else None,
            'es_sintetico': False,
        }

        status = 'skipped (dry-run)' if dry_run else 'ok'
        if not dry_run:
            try:
                client.table('normativas').upsert(record).execute()
            except Exception as e:
                status = f'error: {e}'

        log.append({'id': str(nm_id), 'nombre': str(nombre), 'status': status})
        print(f"  {'✓' if 'error' not in status else '✗'} {nm_id}: {nombre[:50]}")

    return log


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--validate-urls', action='store_true',
                        help='Send HTTP HEAD request to validate each dataset URL')
    parser.add_argument('--dry-run', action='store_true',
                        help='Parse Excel without writing to Supabase')
    args = parser.parse_args()

    if not XLSX_PATH.exists():
        print(f'ERROR: {XLSX_PATH} not found', file=sys.stderr)
        sys.exit(1)

    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    wb = openpyxl.load_workbook(XLSX_PATH, data_only=True)

    print('\n=== Importing Datasets ===')
    datasets_log = import_datasets(wb['Datasets'], client, args.validate_urls, args.dry_run)

    print('\n=== Importing Normativas ===')
    normativas_log = import_normativas(wb['Normativas'], client, args.dry_run)

    log = {'datasets': datasets_log, 'normativas': normativas_log}
    log_path = Path(__file__).parent / 'import_log.json'
    log_path.write_text(json.dumps(log, ensure_ascii=False, indent=2))

    ok_d = sum(1 for r in datasets_log if r['status'] == 'ok')
    ok_n = sum(1 for r in normativas_log if r['status'] == 'ok')
    print(f'\n✓ Done. Datasets: {ok_d}/{len(datasets_log)}  Normativas: {ok_n}/{len(normativas_log)}')
    print(f'  Log saved to {log_path}')


if __name__ == '__main__':
    main()
```

- [ ] **Step 3: Dry-run to verify parsing (no Supabase writes)**

```bash
python scripts/import/import_xlsx.py --dry-run
```

Expected: Prints 42 dataset IDs (DS-001 to DS-042) and 35 normativa IDs (NM-001 to NM-035) with checkmarks. Log saved to `scripts/import/import_log.json`.

- [ ] **Step 4: Run the real import**

```bash
python scripts/import/import_xlsx.py
```

Expected: All 42 + 35 records show `✓`. Final line: `Datasets: 42/42  Normativas: 35/35`.

- [ ] **Step 5: Verify in Supabase**

Go to Supabase → Table Editor → `datasets`. Confirm 42 rows with `es_sintetico = false`.

Go to `normativas`. Confirm 35 rows.

- [ ] **Step 6: Commit**

```bash
git add scripts/import/ 
git commit -m "feat: add import_xlsx.py script; imports 42 datasets + 35 normativas"
```

---

## Task 11: Generate synthetic data

**Files:**
- Create: `scripts/seed/generate_synthetic.py`
- Create: `scripts/seed/requirements.txt`
- Create: `scripts/seed/README.md`
- Create: `scripts/seed/output/` (gitignored)

- [ ] **Step 1: Create Python requirements**

Create `scripts/seed/requirements.txt`:

```
faker==24.4.0
python-dotenv==1.0.0
supabase==2.4.0
```

Install:

```bash
cd scripts/seed && pip install -r requirements.txt && cd ../..
```

- [ ] **Step 2: Create the synthetic data generator**

Create `scripts/seed/generate_synthetic.py`:

```python
"""
Generates synthetic data for Infra.Coop.
Usage: python generate_synthetic.py --mode synthetic|real|both [--upload]

Generates:
  - ~150 synthetic datasets (DS-S001+)
  - ~15 synthetic normativas (NM-S001+)
  - ~500 synthetic preguntas (2024-W01 to 2026-W16, trending up)

Output: scripts/seed/output/synthetic_datasets.json
        scripts/seed/output/synthetic_normativas.json
        scripts/seed/output/synthetic_preguntas.json
        scripts/seed/output/seed.sql
"""
import argparse
import json
import os
import random
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent.parent / '.env')

OUTPUT_DIR = Path(__file__).parent / 'output'
OUTPUT_DIR.mkdir(exist_ok=True)

random.seed(42)  # reproducible

# ── Data pools ──────────────────────────────────────────────────────────────

PAISES = ['BRA', 'PER', 'URY', 'BOL', 'PRY', 'MEX', 'ECU', 'ARG', 'COL', 'CHL']
PAISES_SIN_COBERTURA = ['BRA', 'PER', 'URY', 'BOL', 'PRY']

AGENDAS_POOL = ['Ag. Género', 'Ag. Datos', 'Ag. Tecnológica']

SUBTEMAS_NUEVOS = [
    'trabajo no remunerado', 'economía del cuidado', 'migración femenina',
    'datos abiertos gubernamentales', 'trata de personas', 'interseccionalidad',
    'violencia digital', 'brecha salarial', 'mujeres en STEM',
    'participación política', 'salud mental y género', 'femicidio',
]

FUENTES_SINTETICAS = {
    'BRA': ['IBGE', 'Ministério da Mulher', 'DataSUS', 'IPEA'],
    'PER': ['INEI', 'Ministerio de la Mujer Perú', 'MIDIS'],
    'URY': ['INE Uruguay', 'INMUJERES Uruguay', 'OPP'],
    'BOL': ['INE Bolivia', 'Ministerio de Justicia Bolivia', 'UDAPE'],
    'PRY': ['DGEEC', 'Ministerio de la Mujer Paraguay', 'STP'],
    'MEX': ['INEGI', 'CONAPO', 'IMSS', 'INMUJERES'],
    'ECU': ['INEC', 'Consejo Nacional para la Igualdad', 'SENESCYT'],
    'ARG': ['INDEC', 'MMGyD', 'CONICET', 'Ministerio de Salud ARG'],
    'COL': ['DANE', 'Consejería Presidencial para la Equidad de la Mujer'],
    'CHL': ['INE Chile', 'SernamEG', 'Ministerio de Ciencias Chile'],
}

FORMATOS = ['CSV', 'XLSX', 'JSON', 'API', 'GeoJSON', 'CSV y XLSX', 'API REST']
FRECUENCIAS = ['Anual', 'Bienal', 'Quinquenal', 'Mensual', 'Trimestral', 'Irregular']
DESAGREGACIONES = ['Municipal', 'Estatal/Provincial', 'Nacional', 'Sin información', 'Regional']
CALIDADES = ['Completa', 'Parcial', 'Nula']

# Preguntas pool — about the 5 critical gaps and general themes
PREGUNTAS_POOL = [
    # V-01: violencia digital
    'datos sobre violencia digital contra mujeres en plataformas sociales',
    'estadísticas de acoso en línea por género',
    'información sobre ciberviolencia y género {pais}',
    'datos gobierno abierto violencia digital mujeres',
    'registros de grooming y explotación sexual digital niñas',
    # V-02: Ecuador violencia
    'encuesta violencia género ecuador actualizada',
    'datos violencia intrafamiliar ecuador 2023 2024',
    'estadísticas femicidio ecuador por provincia',
    # V-03: Línea 144 Argentina
    'datos línea 144 argentina violencia género',
    'registros llamadas asistencia victimas argentina',
    'estadísticas refugios violencia género argentina',
    # V-04: IA y género
    'regulación inteligencia artificial perspectiva género',
    'datos sesgo algorítmico sistemas IA y mujeres',
    'marcos normativos IA y derechos de las mujeres',
    'ley inteligencia artificial con enfoque género latinoamérica',
    # V-05: brecha digital subnacional
    'brecha digital género por municipio',
    'acceso internet mujeres zonas rurales desagregado',
    'datos conectividad digital femenina nivel provincial',
    # General themes
    'salud reproductiva datos estadísticas',
    'mortalidad materna por región',
    'participación política mujeres datos',
    'femicidio estadísticas por año y país',
    'brecha salarial datos oficiales',
    'trabajo no remunerado encuesta tiempo uso',
    'mujeres ciencia tecnología estadísticas',
    'datos interseccionalidad etnia género',
    'encuesta uso tiempo cuidados no remunerados',
    'datos migrantes mujeres latinoamérica',
    'trata de personas estadísticas régionales',
    'aborto legal datos acceso servicios',
    'violencia obstétrica registros oficiales',
    'datos pobreza jefatura hogar femenina',
    'empleo informal mujeres estadísticas',
    'datos educación género egreso universidad',
]

PAISES_PREGUNTAS = ['MEX', 'ARG', 'ECU', 'BRA', 'PER', 'COL', 'URY', 'CHL', 'BOL']

NORMATIVAS_SINTETICAS = [
    {'id': 'NM-S001', 'nombre': 'Lei Maria da Penha (Lei 11.340/2006)', 'organismo_emisor': 'Congresso Nacional Brasil',
     'tipo': 'Ley nacional', 'pais_alcance': 'Brasil', 'anio_adopcion': 2006,
     'articulo_numeral': 'Art. 26', 'obligacion_datos': 'Obliga al poder público a producir estadísticas sobre violencia doméstica desagregadas por región',
     'agendas': ['Ag. Género', 'Ag. Datos']},
    {'id': 'NM-S002', 'nombre': 'Ley 30364 — Ley para prevenir, sancionar y erradicar la violencia contra las mujeres (Perú)',
     'organismo_emisor': 'Congreso de la República del Perú', 'tipo': 'Ley nacional',
     'pais_alcance': 'Perú', 'anio_adopcion': 2015, 'articulo_numeral': 'Art. 44',
     'obligacion_datos': 'Obliga al MIMP a publicar estadísticas anuales de violencia desagregadas',
     'agendas': ['Ag. Género', 'Ag. Datos']},
    {'id': 'NM-S003', 'nombre': 'Ley 19.580 — Ley de Violencia hacia las Mujeres (Uruguay)',
     'organismo_emisor': 'Parlamento de Uruguay', 'tipo': 'Ley nacional',
     'pais_alcance': 'Uruguay', 'anio_adopcion': 2018, 'articulo_numeral': 'Art. 7',
     'obligacion_datos': 'Obliga al Sistema Nacional de Información sobre Violencia Doméstica a publicar datos abiertos',
     'agendas': ['Ag. Género', 'Ag. Datos']},
    {'id': 'NM-S004', 'nombre': 'Agenda Digital para América Latina y el Caribe (eLAC2024)',
     'organismo_emisor': 'CEPAL', 'tipo': 'Plan regional',
     'pais_alcance': 'ALyC', 'anio_adopcion': 2022, 'articulo_numeral': 'Meta 2.3',
     'obligacion_datos': 'Insta a los países a publicar datos de brecha digital desagregados por género y territorio',
     'agendas': ['Ag. Tecnológica', 'Ag. Datos', 'Ag. Género']},
    {'id': 'NM-S005', 'nombre': 'Declaración de Santiago sobre Inteligencia Artificial e Igualdad de Género',
     'organismo_emisor': 'ONU Mujeres / CEPAL', 'tipo': 'Declaración regional',
     'pais_alcance': 'ALyC', 'anio_adopcion': 2024, 'articulo_numeral': 'Punto 8',
     'obligacion_datos': 'Solicita a los Estados producir datos sobre impacto de sistemas de IA en derechos de las mujeres',
     'agendas': ['Ag. Tecnológica', 'Ag. Género']},
]
# Fill remaining 10 normativas with generic ones
for i in range(6, 16):
    pais = PAISES_SIN_COBERTURA[i % len(PAISES_SIN_COBERTURA)]
    NORMATIVAS_SINTETICAS.append({
        'id': f'NM-S{i:03d}',
        'nombre': f'Plan Nacional de Igualdad de Género {2018 + i} ({pais})',
        'organismo_emisor': f'Ministerio de la Mujer ({pais})',
        'tipo': 'Plan nacional',
        'pais_alcance': pais,
        'anio_adopcion': 2018 + i,
        'articulo_numeral': f'Eje {i}',
        'obligacion_datos': 'Establece metas de datos desagregados por género a nivel subnacional',
        'agendas': ['Ag. Género', 'Ag. Datos'],
    })


def generate_datasets(n: int = 150) -> list[dict]:
    datasets = []
    for i in range(1, n + 1):
        pais = random.choice(PAISES_SIN_COBERTURA if i <= 80 else PAISES)
        subtema = random.choice(SUBTEMAS_NUEVOS)
        fuente = random.choice(FUENTES_SINTETICAS.get(pais, ['Organismo Nacional']))
        anio = random.randint(2019, 2025)
        formato = random.choice(FORMATOS)
        calidad = random.choices(CALIDADES, weights=[0.3, 0.5, 0.2])[0]

        # Ag. Tecnológica is underrepresented in real data — increase here
        n_agendas = random.choices([1, 2, 3], weights=[0.3, 0.5, 0.2])[0]
        agendas = ['Ag. Género']  # always
        pool = ['Ag. Datos', 'Ag. Tecnológica']
        random.shuffle(pool)
        agendas += pool[:n_agendas - 1]

        datasets.append({
            'id': f'DS-S{i:03d}',
            'titulo': f'Encuesta/Registro de {subtema.title()} — {pais} {anio}',
            'fuente_organismo': fuente,
            'pais_iso3': pais,
            'anio_publicacion': anio,
            'subtema': subtema,
            'agendas': list(set(agendas)),
            'calidad': calidad,
            'frecuencia': random.choice(FRECUENCIAS),
            'desagregacion_geo': random.choice(DESAGREGACIONES),
            'accesibilidad_formato': formato,
            'url_descarga': f'https://datos.{pais.lower()}.example.com/ds-s{i:03d}',
            'url_valida': calidad != 'Nula',
            'descripcion_notas': f'Dataset sintético sobre {subtema} en {pais}. Generado para desarrollo y testing.',
            'es_sintetico': True,
        })
    return datasets


def generate_preguntas(n: int = 500) -> list[dict]:
    preguntas = []
    # Start date: 2024-W01 (Jan 1, 2024). End: 2026-W16 (~Apr 2026)
    start_date = datetime(2024, 1, 1)
    end_date = datetime(2026, 4, 20)
    total_days = (end_date - start_date).days

    for i in range(n):
        # Trending up: later weeks have more questions
        # Use a beta distribution biased towards later dates
        t = random.betavariate(2, 1)  # skewed right
        delta = timedelta(days=int(t * total_days))
        fecha = start_date + delta

        pregunta_tpl = random.choice(PREGUNTAS_POOL)
        pais = random.choice(PAISES_PREGUNTAS)
        texto = pregunta_tpl.replace('{pais}', pais.lower())

        preguntas.append({
            'texto': texto,
            'fecha': fecha.isoformat() + 'Z',
            'agenda_clasificada': random.choice(AGENDAS_POOL + [None]),
            'resultado_score': round(random.uniform(0.1, 0.95), 3),
            'datasets_encontrados': [],
            'es_sintetico': True,
        })

    preguntas.sort(key=lambda p: p['fecha'])
    return preguntas


def to_sql_datasets(datasets: list[dict]) -> str:
    lines = ['-- Synthetic datasets', 'INSERT INTO datasets (id, titulo, fuente_organismo, pais_iso3, anio_publicacion, subtema, agendas, calidad, frecuencia, desagregacion_geo, accesibilidad_formato, url_descarga, url_valida, descripcion_notas, es_sintetico) VALUES']
    values = []
    for d in datasets:
        agendas = '{' + ','.join(f'"{a}"' for a in d['agendas']) + '}'
        values.append(
            f"('{d['id']}', '{d['titulo'].replace(chr(39), chr(39)*2)}', '{d['fuente_organismo']}', "
            f"'{d['pais_iso3']}', {d['anio_publicacion']}, '{d['subtema']}', "
            f"'{agendas}', '{d['calidad']}', '{d['frecuencia']}', '{d['desagregacion_geo']}', "
            f"'{d['accesibilidad_formato']}', '{d['url_descarga']}', {str(d['url_valida']).lower()}, "
            f"'{d['descripcion_notas']}', true)"
        )
    lines.append(',\n'.join(values) + ';')
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--mode', choices=['synthetic', 'real', 'both'], default='synthetic')
    parser.add_argument('--upload', action='store_true', help='Upload to Supabase after generating')
    args = parser.parse_args()

    datasets = generate_datasets(150)
    normativas = [dict(n, es_sintetico=True) for n in NORMATIVAS_SINTETICAS]
    preguntas = generate_preguntas(500)

    (OUTPUT_DIR / 'synthetic_datasets.json').write_text(json.dumps(datasets, ensure_ascii=False, indent=2))
    (OUTPUT_DIR / 'synthetic_normativas.json').write_text(json.dumps(normativas, ensure_ascii=False, indent=2))
    (OUTPUT_DIR / 'synthetic_preguntas.json').write_text(json.dumps(preguntas, ensure_ascii=False, indent=2))
    (OUTPUT_DIR / 'seed.sql').write_text(to_sql_datasets(datasets))

    print(f'✓ Generated: {len(datasets)} datasets, {len(normativas)} normativas, {len(preguntas)} preguntas')
    print(f'  Output: {OUTPUT_DIR}')

    if args.upload:
        from supabase import create_client
        client = create_client(os.environ['VITE_SUPABASE_URL'], os.environ['VITE_SUPABASE_ANON_KEY'])
        print('\nUploading datasets...')
        client.table('datasets').upsert(datasets).execute()
        print('Uploading normativas...')
        client.table('normativas').upsert(normativas).execute()
        print('Uploading preguntas...')
        # Upload preguntas in batches of 100
        for i in range(0, len(preguntas), 100):
            client.table('preguntas').insert(preguntas[i:i+100]).execute()
        print(f'✓ Upload complete.')


if __name__ == '__main__':
    main()
```

- [ ] **Step 3: Create README for scripts**

Create `scripts/seed/README.md`:

```markdown
# Scripts de seed y importación — Infra.Coop

## Prerequisitos

Python 3.10+. Desde la raíz del repo:

```bash
pip install -r scripts/import/requirements.txt
pip install -r scripts/seed/requirements.txt
```

## Importar datos reales del Excel

```bash
# Dry-run: verifica parsing sin escribir a Supabase
python scripts/import/import_xlsx.py --dry-run

# Importación real (requiere .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY)
python scripts/import/import_xlsx.py

# Con validación de URLs (hace HTTP HEAD a cada dataset — lento)
python scripts/import/import_xlsx.py --validate-urls
```

Lee: `data/infracoop_bd.xlsx` (hojas: Datasets, Normativas).
Genera log en: `scripts/import/import_log.json`.

## Generar datos sintéticos

```bash
# Solo genera archivos JSON y SQL (no sube a Supabase)
python scripts/seed/generate_synthetic.py

# Genera y sube a Supabase
python scripts/seed/generate_synthetic.py --upload
```

Genera: ~150 datasets (DS-S001+), ~15 normativas (NM-S001+), ~500 preguntas (2024–2026).
Output en: `scripts/seed/output/` (carpeta en .gitignore).

## Control de datos sintéticos en la app

Editar `.env`:

```
VITE_USE_SYNTHETIC_DATA=true   # muestra reales + sintéticos
VITE_USE_SYNTHETIC_DATA=false  # solo muestra los 42+35 reales
```
```

- [ ] **Step 4: Run generator to verify output**

```bash
python scripts/seed/generate_synthetic.py
```

Expected output:
```
✓ Generated: 150 datasets, 15 normativas, 500 preguntas
  Output: scripts/seed/output
```

Verify `scripts/seed/output/synthetic_datasets.json` exists and has 150 items:

```bash
python -c "import json; d=json.load(open('scripts/seed/output/synthetic_datasets.json')); print(len(d), 'datasets')"
```

Expected: `150 datasets`

- [ ] **Step 5: Upload synthetic data to Supabase**

```bash
python scripts/seed/generate_synthetic.py --upload
```

Expected: All 150 + 15 + 500 records uploaded.

Verify in Supabase Table Editor: `datasets` should now show 192 rows (42 real + 150 synthetic).

- [ ] **Step 6: Commit**

```bash
git add scripts/seed/ scripts/import/requirements.txt
git commit -m "feat: add synthetic data generator and seed scripts"
```

---

## Task 12: Verify full data flow end-to-end

This is a manual verification task.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify datasets load in the app**

Open `src/pages/MonitorBrechas.tsx` temporarily and add a data display:

```typescript
import { useDatasets } from '../hooks/useDatasets'
import { Layout } from '../components/Layout'

export function MonitorBrechas() {
  const { datasets, loading, error } = useDatasets()

  return (
    <Layout>
      <div className="hero">
        <p className="hero-eyebrow">Monitor de Brechas</p>
        <h1>¿Qué datos <em>faltan</em>?</h1>
      </div>
      {loading && <p style={{ fontFamily: 'var(--mono)', color: 'var(--ink-light)' }}>Cargando datasets...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {!loading && <p style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: 'var(--ink-mid)' }}>
        {datasets.length} datasets cargados desde Supabase
      </p>}
    </Layout>
  )
}
```

Expected: Page shows `192 datasets cargados desde Supabase` (42 real + 150 synthetic) if `VITE_USE_SYNTHETIC_DATA=true`.

- [ ] **Step 3: Test synthetic data flag**

Change `.env` to `VITE_USE_SYNTHETIC_DATA=false`. Restart dev server (`Ctrl+C` then `npm run dev`).

Expected: Page shows `42 datasets cargados desde Supabase`.

- [ ] **Step 4: Revert MonitorBrechas to stub**

Revert `src/pages/MonitorBrechas.tsx` to the stub version from Task 8.

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 6: Final commit for Phase 1**

```bash
git add -A
git commit -m "feat: complete Phase 1 — foundation, data layer, scripts verified"
```

- [ ] **Step 7: Open PR to main**

```bash
git push origin dev
```

Then on GitHub: open a PR from `dev` → `main` with title "Phase 1: Foundation — React app + Supabase + data scripts".

---

## Phase 1 Acceptance Checklist

- [ ] `npm run dev` starts without errors on `dev` branch
- [ ] Navigation between all 4 routes works
- [ ] Supabase client connects (no console errors)
- [ ] All TypeScript types pass (`npm run tsc --noEmit`)
- [ ] All Vitest tests pass (`npm test`)
- [ ] Button, Card, Badge components match prototype visually
- [ ] 42 real datasets in Supabase with `es_sintetico = false`
- [ ] 35 real normativas in Supabase with `es_sintetico = false`
- [ ] 150 synthetic datasets, 15 synthetic normativas, 500 synthetic preguntas in Supabase
- [ ] `VITE_USE_SYNTHETIC_DATA=false` shows only 42 datasets
- [ ] `VITE_USE_SYNTHETIC_DATA=true` shows 192 datasets
- [ ] `submitFormulario('directo')` inserts into `formularios_publicados`
- [ ] `submitFormulario('revision')` inserts into `formularios_en_revision`

---

*Next: [Phase 2 — Gap Engine](./2026-04-25-phase2-gap-engine.md) — MiniSearch index, scoreService, qualityService, MonitorBrechas UI*
