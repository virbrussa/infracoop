# Ingresar Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `/ingresar` page with a Dataset/Normativa type selector, form fields, submission logic, global footer, and nav link.

**Architecture:** New page `IngresoForm.tsx` uses a controlled form with two modes (Dataset / Normativa) and calls either the existing `submitFormulario` or the new `submitNormativa` service function. `VITE_REQUIRE_SUPERVISION` env var (read at build time) controls whether submissions go to review queue or directly to production tables.

**Tech Stack:** React + TypeScript, Supabase, Vitest + @testing-library/react, React Router v6, CSS custom properties (no Tailwind).

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types/index.ts` | Modify | Add `NormativaFormData` type |
| `src/services/dataService.ts` | Modify | Add `submitNormativa()` |
| `src/test/dataService.test.ts` | Modify | Add tests for `submitNormativa` |
| `src/components/Header.tsx` | Modify | Add nav item `05 · Ingresar datos` |
| `src/test/Header.test.tsx` | Modify | Update test to expect 5 links |
| `src/components/Layout.tsx` | Modify | Add global footer |
| `src/pages/IngresoForm.tsx` | Create | Full page with Dataset/Normativa form |
| `src/App.tsx` | Modify | Add route `/ingresar` |
| `.env.example` | Modify | Document `VITE_REQUIRE_SUPERVISION` |

---

### Task 1: Add `NormativaFormData` type

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add the type after `FormularioData`**

In `src/types/index.ts`, after the closing `}` of `FormularioData` (currently line 59), add:

```typescript
export interface NormativaFormData {
  nombre: string
  organismo_emisor: string
  tipo: string
  pais_alcance: string
  anio_adopcion: number | null
  articulo_numeral: string
  obligacion_datos: string
  agendas: string[]
  url_texto_oficial: string
  descripcion_notas: string
  ingresado_por: string
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/davas/Documents/InfraCoopDashboard && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add NormativaFormData type"
```

---

### Task 2: Add `submitNormativa` to dataService + tests

**Files:**
- Modify: `src/services/dataService.ts`
- Modify: `src/test/dataService.test.ts`

- [ ] **Step 1: Write the failing tests first**

In `src/test/dataService.test.ts`, append after the last `})` (end of `submitFormulario` describe block):

```typescript
describe('submitNormativa', () => {
  it('inserts into normativas when mode is directo', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })
    const { submitNormativa } = await import('../services/dataService')
    const data = {
      nombre: 'Ley 1234', organismo_emisor: 'Congreso', tipo: 'Ley',
      pais_alcance: 'MEX', anio_adopcion: 2020, articulo_numeral: 'Art. 5',
      obligacion_datos: 'Publicar datos desagregados', agendas: ['Ag. Género'],
      url_texto_oficial: 'https://example.com', descripcion_notas: '',
      ingresado_por: 'test',
    }
    await submitNormativa(data, 'directo')
    expect(mockFrom).toHaveBeenCalledWith('normativas')
  })

  it('inserts into normativas_en_revision when mode is revision', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })
    const { submitNormativa } = await import('../services/dataService')
    const data = {
      nombre: 'Ley 1234', organismo_emisor: 'Congreso', tipo: 'Ley',
      pais_alcance: 'MEX', anio_adopcion: 2020, articulo_numeral: 'Art. 5',
      obligacion_datos: 'Publicar datos desagregados', agendas: ['Ag. Género'],
      url_texto_oficial: 'https://example.com', descripcion_notas: '',
      ingresado_por: 'test',
    }
    await submitNormativa(data, 'revision')
    expect(mockFrom).toHaveBeenCalledWith('normativas_en_revision')
  })

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
    })
    const { submitNormativa } = await import('../services/dataService')
    const data = {
      nombre: 'Ley 1234', organismo_emisor: '', tipo: '', pais_alcance: '',
      anio_adopcion: null, articulo_numeral: '', obligacion_datos: '',
      agendas: [], url_texto_oficial: '', descripcion_notas: '', ingresado_por: '',
    }
    await expect(submitNormativa(data, 'directo')).rejects.toThrow('DB error')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd /home/davas/Documents/InfraCoopDashboard && npx vitest run src/test/dataService.test.ts
```

Expected: `submitNormativa is not a function` or similar import error.

- [ ] **Step 3: Implement `submitNormativa` in dataService.ts**

In `src/services/dataService.ts`, import `NormativaFormData` at the top (update the existing import line):

```typescript
import type { Dataset, Normativa, Pregunta, FormularioData, NormativaFormData, DatasetFilters, NormativaFilters } from '../types'
```

Then append after `submitFormulario`:

```typescript
export async function submitNormativa(
  normativa: NormativaFormData,
  modo: 'directo' | 'revision'
): Promise<void> {
  const tabla = modo === 'directo' ? 'normativas' : 'normativas_en_revision'
  const payload = modo === 'revision'
    ? { ...normativa, status: 'pendiente' }
    : normativa

  const { error } = await supabase.from(tabla).insert(payload)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd /home/davas/Documents/InfraCoopDashboard && npx vitest run src/test/dataService.test.ts
```

Expected: all tests pass (including the 3 new ones).

- [ ] **Step 5: Commit**

```bash
git add src/services/dataService.ts src/test/dataService.test.ts src/types/index.ts
git commit -m "feat: add submitNormativa service function"
```

---

### Task 3: Update Header — add nav item 05

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/test/Header.test.tsx`

- [ ] **Step 1: Write failing test**

In `src/test/Header.test.tsx`, update the existing test `'renders all 4 navigation links'` to become:

```typescript
it('renders all 5 navigation links', () => {
  renderWithRouter(<Header />)
  expect(screen.getByRole('link', { name: /¿Qué es/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Monitor de Brechas/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Monitor Colectivo/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /¿Qué datos/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Ingresar datos/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd /home/davas/Documents/InfraCoopDashboard && npx vitest run src/test/Header.test.tsx
```

Expected: Unable to find element with text /Ingresar datos/i.

- [ ] **Step 3: Add nav item to Header.tsx**

In `src/components/Header.tsx`, update `NAV_ITEMS` array:

```typescript
const NAV_ITEMS = [
  { to: '/',          label: '¿Qué es Infra.Coop?',  num: '04' },
  { to: '/brechas',   label: 'Monitor de Brechas',    num: '01' },
  { to: '/colectivo', label: 'Monitor Colectivo',     num: '02' },
  { to: '/datos',     label: '¿Qué datos queremos?',  num: '03' },
  { to: '/ingresar',  label: 'Ingresar datos',        num: '05' },
]
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd /home/davas/Documents/InfraCoopDashboard && npx vitest run src/test/Header.test.tsx
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/Header.tsx src/test/Header.test.tsx
git commit -m "feat: add Ingresar datos nav link"
```

---

### Task 4: Add global footer to Layout

**Files:**
- Modify: `src/components/Layout.tsx`

There is no dedicated test for Layout — the existing component tests cover Layout indirectly via renders. No new test needed.

- [ ] **Step 1: Update Layout.tsx**

Replace the full content of `src/components/Layout.tsx` with:

```typescript
interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <>
      <main className="container">{children}</main>
      <footer style={{
        textAlign: 'center',
        padding: '2rem 0 1.5rem',
        fontFamily: 'var(--mono)',
        fontSize: '10px',
        color: 'var(--ink-light)',
        letterSpacing: '0.08em',
      }}>
        Desarrollado por Diversa
      </footer>
    </>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
cd /home/davas/Documents/InfraCoopDashboard && npx vitest run
```

Expected: all 58 existing tests pass, no regressions.

- [ ] **Step 3: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat: add Desarrollado por Diversa footer to Layout"
```

---

### Task 5: Create `IngresoForm.tsx` page

**Files:**
- Create: `src/pages/IngresoForm.tsx`

This task has no unit tests — the form submission is covered by dataService tests. The component itself is primarily UI state logic.

- [ ] **Step 1: Create the page**

Create `src/pages/IngresoForm.tsx` with the following content:

```typescript
import { useState } from 'react'
import { Layout } from '../components/Layout'
import { submitFormulario } from '../services/dataService'
import { submitNormativa } from '../services/dataService'
import type { FormularioData, NormativaFormData } from '../types'

type TipoIngreso = 'dataset' | 'normativa'
type FormStatus = 'idle' | 'loading' | 'success' | 'error'

const requireSupervision = import.meta.env.VITE_REQUIRE_SUPERVISION !== 'false'
const modo: 'directo' | 'revision' = requireSupervision ? 'revision' : 'directo'

const AGENDAS = ['Ag. Tecnológica', 'Ag. Datos', 'Ag. Género']

const EMPTY_DATASET: FormularioData = {
  titulo: '', fuente_organismo: '', pais_iso3: '', anio_publicacion: null,
  subtema: '', agendas: [], frecuencia: '', desagregacion_geo: '',
  accesibilidad_formato: '', url_descarga: '', descripcion_notas: '', ingresado_por: '',
}

const EMPTY_NORMATIVA: NormativaFormData = {
  nombre: '', organismo_emisor: '', tipo: '', pais_alcance: '', anio_adopcion: null,
  articulo_numeral: '', obligacion_datos: '', agendas: [],
  url_texto_oficial: '', descripcion_notas: '', ingresado_por: '',
}

export function IngresoForm() {
  const [tipo, setTipo] = useState<TipoIngreso>('dataset')
  const [datasetData, setDatasetData] = useState<FormularioData>(EMPTY_DATASET)
  const [normativaData, setNormativaData] = useState<NormativaFormData>(EMPTY_NORMATIVA)
  const [status, setStatus] = useState<FormStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleAgendasChange(agenda: string, checked: boolean, isDataset: boolean) {
    if (isDataset) {
      setDatasetData(prev => ({
        ...prev,
        agendas: checked ? [...prev.agendas, agenda] : prev.agendas.filter(a => a !== agenda),
      }))
    } else {
      setNormativaData(prev => ({
        ...prev,
        agendas: checked ? [...prev.agendas, agenda] : prev.agendas.filter(a => a !== agenda),
      }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    try {
      if (tipo === 'dataset') {
        await submitFormulario(datasetData, modo)
      } else {
        await submitNormativa(normativaData, modo)
      }
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  function handleReset() {
    setDatasetData(EMPTY_DATASET)
    setNormativaData(EMPTY_NORMATIVA)
    setStatus('idle')
    setErrorMsg('')
  }

  const currentAgendas = tipo === 'dataset' ? datasetData.agendas : normativaData.agendas

  return (
    <Layout>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1rem' }}>
        <div className="section-label" style={{ marginBottom: '1.5rem' }}>
          <span>05 · Ingresar datos</span>
        </div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: '2rem', marginBottom: '0.5rem' }}>
          Someter al corpus
        </h1>
        <p style={{ color: 'var(--ink-mid)', fontSize: '14px', marginBottom: '2rem' }}>
          {modo === 'revision'
            ? 'Los envíos pasarán por revisión antes de publicarse.'
            : 'Los envíos se publican directamente en el corpus.'}
        </p>

        {/* Type selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '2rem' }}>
          {(['dataset', 'normativa'] as TipoIngreso[]).map(t => (
            <button
              key={t}
              type="button"
              className={tipo === t ? 'btn-primary' : 'btn-ghost'}
              onClick={() => { setTipo(t); setStatus('idle'); setErrorMsg('') }}
              style={{ textTransform: 'capitalize' }}
            >
              {t === 'dataset' ? 'Dataset' : 'Normativa'}
            </button>
          ))}
        </div>

        {status === 'success' ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✓</div>
            <p style={{ fontFamily: 'var(--serif)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              {tipo === 'dataset' ? 'Dataset' : 'Normativa'} recibido
            </p>
            <p style={{ color: 'var(--ink-mid)', fontSize: '14px', marginBottom: '1.5rem' }}>
              {modo === 'revision'
                ? 'Está en cola de revisión. El equipo curatorial lo evaluará pronto.'
                : 'Se publicó directamente en el corpus.'}
            </p>
            <button className="btn-ghost" onClick={handleReset}>Ingresar otro</button>
          </div>
        ) : (
          <form className="card" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {tipo === 'dataset' ? (
              <DatasetFields data={datasetData} onChange={setDatasetData} agendas={currentAgendas} onAgendasChange={(a, c) => handleAgendasChange(a, c, true)} />
            ) : (
              <NormativaFields data={normativaData} onChange={setNormativaData} agendas={currentAgendas} onAgendasChange={(a, c) => handleAgendasChange(a, c, false)} />
            )}

            {/* ingresado_por — shared */}
            <Field label="Ingresado por">
              <input
                type="text"
                value={tipo === 'dataset' ? datasetData.ingresado_por : normativaData.ingresado_por}
                onChange={e => tipo === 'dataset'
                  ? setDatasetData(prev => ({ ...prev, ingresado_por: e.target.value }))
                  : setNormativaData(prev => ({ ...prev, ingresado_por: e.target.value }))}
              />
            </Field>

            {status === 'error' && (
              <p style={{ color: 'var(--gap-crit)', fontSize: '13px', fontFamily: 'var(--mono)' }}>
                Error: {errorMsg}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-primary" disabled={status === 'loading'}>
                {status === 'loading' ? 'Enviando…' : 'Enviar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface FieldProps {
  label: string
  required?: boolean
  children: React.ReactNode
}

function Field({ label, required, children }: FieldProps) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--ink-mid)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}{required && <span style={{ color: 'var(--gap-crit)' }}> *</span>}
      </span>
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: '14px',
  background: 'var(--paper-warm)',
  border: '1px solid var(--ink-faint)',
  borderRadius: 'var(--r)',
  padding: '8px 12px',
  color: 'var(--ink)',
  width: '100%',
}

interface DatasetFieldsProps {
  data: FormularioData
  onChange: React.Dispatch<React.SetStateAction<FormularioData>>
  agendas: string[]
  onAgendasChange: (agenda: string, checked: boolean) => void
}

function DatasetFields({ data, onChange, agendas, onAgendasChange }: DatasetFieldsProps) {
  function set(field: keyof FormularioData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(prev => ({ ...prev, [field]: e.target.value }))
  }

  return (
    <>
      <Field label="Título" required>
        <input style={inputStyle} type="text" value={data.titulo} onChange={set('titulo')} required />
      </Field>
      <Field label="Fuente / Organismo">
        <input style={inputStyle} type="text" value={data.fuente_organismo} onChange={set('fuente_organismo')} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field label="País (ISO3)">
          <input style={inputStyle} type="text" maxLength={3} value={data.pais_iso3} onChange={set('pais_iso3')} />
        </Field>
        <Field label="Año publicación">
          <input style={inputStyle} type="number" min={1900} max={2100}
            value={data.anio_publicacion ?? ''}
            onChange={e => onChange(prev => ({ ...prev, anio_publicacion: e.target.value ? parseInt(e.target.value) : null }))} />
        </Field>
      </div>
      <Field label="Subtema">
        <input style={inputStyle} type="text" value={data.subtema} onChange={set('subtema')} />
      </Field>
      <AgendasCheckboxes selected={agendas} onChange={onAgendasChange} />
      <Field label="Frecuencia">
        <input style={inputStyle} type="text" value={data.frecuencia} onChange={set('frecuencia')} />
      </Field>
      <Field label="Desagregación geográfica">
        <input style={inputStyle} type="text" value={data.desagregacion_geo} onChange={set('desagregacion_geo')} />
      </Field>
      <Field label="Accesibilidad / Formato">
        <input style={inputStyle} type="text" value={data.accesibilidad_formato} onChange={set('accesibilidad_formato')} />
      </Field>
      <Field label="URL de descarga">
        <input style={inputStyle} type="url" value={data.url_descarga} onChange={set('url_descarga')} />
      </Field>
      <Field label="Descripción / Notas">
        <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={data.descripcion_notas} onChange={set('descripcion_notas')} />
      </Field>
    </>
  )
}

interface NormativaFieldsProps {
  data: NormativaFormData
  onChange: React.Dispatch<React.SetStateAction<NormativaFormData>>
  agendas: string[]
  onAgendasChange: (agenda: string, checked: boolean) => void
}

function NormativaFields({ data, onChange, agendas, onAgendasChange }: NormativaFieldsProps) {
  function set(field: keyof NormativaFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(prev => ({ ...prev, [field]: e.target.value }))
  }

  return (
    <>
      <Field label="Nombre" required>
        <input style={inputStyle} type="text" value={data.nombre} onChange={set('nombre')} required />
      </Field>
      <Field label="Organismo emisor">
        <input style={inputStyle} type="text" value={data.organismo_emisor} onChange={set('organismo_emisor')} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field label="Tipo">
          <input style={inputStyle} type="text" value={data.tipo} onChange={set('tipo')} />
        </Field>
        <Field label="País de alcance">
          <input style={inputStyle} type="text" value={data.pais_alcance} onChange={set('pais_alcance')} />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field label="Año adopción">
          <input style={inputStyle} type="number" min={1900} max={2100}
            value={data.anio_adopcion ?? ''}
            onChange={e => onChange(prev => ({ ...prev, anio_adopcion: e.target.value ? parseInt(e.target.value) : null }))} />
        </Field>
        <Field label="Artículo / Numeral">
          <input style={inputStyle} type="text" value={data.articulo_numeral} onChange={set('articulo_numeral')} />
        </Field>
      </div>
      <Field label="Obligación de datos">
        <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={data.obligacion_datos} onChange={set('obligacion_datos')} />
      </Field>
      <AgendasCheckboxes selected={agendas} onChange={onAgendasChange} />
      <Field label="URL texto oficial">
        <input style={inputStyle} type="url" value={data.url_texto_oficial} onChange={set('url_texto_oficial')} />
      </Field>
      <Field label="Descripción / Notas">
        <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={data.descripcion_notas} onChange={set('descripcion_notas')} />
      </Field>
    </>
  )
}

interface AgendasCheckboxesProps {
  selected: string[]
  onChange: (agenda: string, checked: boolean) => void
}

function AgendasCheckboxes({ selected, onChange }: AgendasCheckboxesProps) {
  return (
    <Field label="Agendas">
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', paddingTop: 4 }}>
        {AGENDAS.map(ag => (
          <label key={ag} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={selected.includes(ag)}
              onChange={e => onChange(ag, e.target.checked)}
            />
            {ag}
          </label>
        ))}
      </div>
    </Field>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd /home/davas/Documents/InfraCoopDashboard && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/IngresoForm.tsx
git commit -m "feat: add IngresoForm page with Dataset/Normativa selector"
```

---

### Task 6: Wire the route in App.tsx and update .env.example

**Files:**
- Modify: `src/App.tsx`
- Modify: `.env.example`

- [ ] **Step 1: Add route to App.tsx**

In `src/App.tsx`, add the import and route:

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Header } from './components/Header'
import { Landing } from './pages/Landing'
import { MonitorBrechas } from './pages/MonitorBrechas'
import { MonitorColectivo } from './pages/MonitorColectivo'
import { DatosQueremos } from './pages/DatosQueremos'
import { IngresoForm } from './pages/IngresoForm'
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
          <Route path="/ingresar" element={<IngresoForm />} />
        </Routes>
      </BrowserRouter>
    </SearchIndexProvider>
  )
}
```

- [ ] **Step 2: Update .env.example**

Replace the full content of `.env.example` with:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_USE_SYNTHETIC_DATA=true
VITE_REQUIRE_SUPERVISION=true
```

(Removes the old `VITE_FORM_MODE` which was replaced by `VITE_REQUIRE_SUPERVISION`.)

- [ ] **Step 3: Run full test suite**

```bash
cd /home/davas/Documents/InfraCoopDashboard && npx vitest run
```

Expected: all tests pass (58 existing + 3 new submitNormativa tests = 61).

- [ ] **Step 4: TypeScript check**

```bash
cd /home/davas/Documents/InfraCoopDashboard && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx .env.example
git commit -m "feat: add /ingresar route and document VITE_REQUIRE_SUPERVISION"
```

---

## Spec Coverage Check

| Spec requirement | Covered by |
|-----------------|------------|
| `VITE_REQUIRE_SUPERVISION` env var | Task 6 (.env.example), Task 5 (IngresoForm reads it) |
| Ruta `/ingresar` | Task 6 (App.tsx) |
| Nav item `05 · Ingresar datos` | Task 3 (Header.tsx) |
| Dataset / Normativa selector (pills) | Task 5 (IngresoForm) |
| Dataset campos completos | Task 5 (DatasetFields) |
| Normativa campos completos | Task 5 (NormativaFields) |
| `submitNormativa()` service | Task 2 (dataService.ts) |
| `NormativaFormData` type | Task 1 (types/index.ts) |
| Estados idle/loading/success/error | Task 5 (IngresoForm state machine) |
| Mensaje de success refleja modo | Task 5 (revision vs directo text) |
| Footer "Desarrollado por Diversa" | Task 4 (Layout.tsx) |
| 58 tests deben seguir pasando | Checked in Task 4 Step 2 and Task 6 Step 3 |
