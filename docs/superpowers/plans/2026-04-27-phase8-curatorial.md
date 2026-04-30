# Phase 8 — Panel Curatorial

**Prerequisito:** Phase 7 (auth) completa.

**Goal:** Página `/revisar` protegida que lista los formularios en revisión (`formularios_en_revision`) y normativas en revisión (`normativas_en_revision`). Cada ítem tiene botones Aprobar y Rechazar. Solo visible para rol `admin`.

**Architecture:** `useRevisionQueue` hook → fetch de ambas tablas. `aprobar()` mueve el registro a su tabla definitiva (`formularios_publicados` / `normativas`) y lo borra de la cola. `rechazar()` actualiza `status = 'rechazado'` y lo oculta. Todo con RLS — solo admin puede operar.

---

## File Map

| Acción | Archivo | Propósito |
|--------|---------|-----------|
| Create | `db/migration-v0.8-revision-rls.sql` | RLS en tablas de revisión |
| Create | `src/hooks/useRevisionQueue.ts` | Fetch cola + aprobar/rechazar |
| Create | `src/pages/Revisar.tsx` | UI del panel curatorial |
| Create | `src/test/useRevisionQueue.test.ts` | Tests del hook |
| Modify | `src/App.tsx` | Agregar ruta `/revisar` con ProtectedRoute |
| Modify | `src/components/Header.tsx` | Link "Revisar" visible solo para admin |
| Modify | `src/services/dataService.ts` | Agregar `aprobarFormulario`, `rechazarFormulario`, `aprobarNormativa`, `rechazarNormativa` |

---

## Task 1: Migración RLS

- [ ] Crear `db/migration-v0.8-revision-rls.sql`:

```sql
-- RLS en tablas de revisión: solo admin puede leer/modificar

ALTER TABLE formularios_en_revision ENABLE ROW LEVEL SECURITY;
ALTER TABLE normativas_en_revision  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only formularios_revision" ON formularios_en_revision
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "Admin only normativas_revision" ON normativas_en_revision
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );
```

- [ ] Ejecutar en Supabase
- [ ] Commit

---

## Task 2: dataService — aprobar/rechazar

- [ ] Agregar a `src/services/dataService.ts`:

```typescript
export async function aprobarFormulario(id: string): Promise<void> {
  // Leer el registro
  const { data, error: readErr } = await supabase
    .from('formularios_en_revision').select('*').eq('id', id).single()
  if (readErr || !data) throw new Error(readErr?.message ?? 'No encontrado')

  // Insertar en publicados (sin status)
  const { status: _s, ...payload } = data as Record<string, unknown>
  const { error: insErr } = await supabase.from('formularios_publicados').insert(payload)
  if (insErr) throw new Error(insErr.message)

  // Borrar de revisión
  await supabase.from('formularios_en_revision').delete().eq('id', id)
}

export async function rechazarFormulario(id: string): Promise<void> {
  const { error } = await supabase
    .from('formularios_en_revision').update({ status: 'rechazado' }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function aprobarNormativa(id: string): Promise<void> {
  const { data, error: readErr } = await supabase
    .from('normativas_en_revision').select('*').eq('id', id).single()
  if (readErr || !data) throw new Error(readErr?.message ?? 'No encontrado')

  const { status: _s, ...payload } = data as Record<string, unknown>
  const { error: insErr } = await supabase.from('normativas').insert(payload)
  if (insErr) throw new Error(insErr.message)

  await supabase.from('normativas_en_revision').delete().eq('id', id)
}

export async function rechazarNormativa(id: string): Promise<void> {
  const { error } = await supabase
    .from('normativas_en_revision').update({ status: 'rechazado' }).eq('id', id)
  if (error) throw new Error(error.message)
}
```

- [ ] Tests en `src/test/dataService.test.ts` — agregar mocks para las 4 funciones nuevas
- [ ] `npm test -- --run` → todos pasan
- [ ] Commit

---

## Task 3: useRevisionQueue

- [ ] Crear `src/hooks/useRevisionQueue.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { aprobarFormulario, rechazarFormulario, aprobarNormativa, rechazarNormativa } from '../services/dataService'

export interface ItemRevision {
  id: string
  tipo: 'dataset' | 'normativa'
  titulo: string
  fuente: string | null
  pais: string | null
  status: string
  created_at: string
}

interface RevisionQueue {
  items: ItemRevision[]
  isLoading: boolean
  error: string | null
  aprobar: (item: ItemRevision) => Promise<void>
  rechazar: (item: ItemRevision) => Promise<void>
}

export function useRevisionQueue(): RevisionQueue {
  const [items, setItems]     = useState<ItemRevision[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  async function fetchQueue() {
    setLoading(true)
    try {
      const [{ data: ds }, { data: nm }] = await Promise.all([
        supabase.from('formularios_en_revision')
          .select('id, titulo, fuente_organismo, pais_iso3, status, created_at')
          .neq('status', 'rechazado').order('created_at'),
        supabase.from('normativas_en_revision')
          .select('id, nombre, organismo_emisor, pais_alcance, status, created_at')
          .neq('status', 'rechazado').order('created_at'),
      ])
      const mapped: ItemRevision[] = [
        ...(ds ?? []).map(r => ({
          id: r.id, tipo: 'dataset' as const,
          titulo: r.titulo, fuente: r.fuente_organismo,
          pais: r.pais_iso3, status: r.status, created_at: r.created_at,
        })),
        ...(nm ?? []).map(r => ({
          id: r.id, tipo: 'normativa' as const,
          titulo: r.nombre, fuente: r.organismo_emisor,
          pais: r.pais_alcance, status: r.status, created_at: r.created_at,
        })),
      ]
      setItems(mapped.sort((a, b) => a.created_at.localeCompare(b.created_at)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando cola')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchQueue() }, [])

  const aprobar = useCallback(async (item: ItemRevision) => {
    if (item.tipo === 'dataset') await aprobarFormulario(item.id)
    else await aprobarNormativa(item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
  }, [])

  const rechazar = useCallback(async (item: ItemRevision) => {
    if (item.tipo === 'dataset') await rechazarFormulario(item.id)
    else await rechazarNormativa(item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
  }, [])

  return { items, isLoading, error, aprobar, rechazar }
}
```

- [ ] Crear `src/test/useRevisionQueue.test.ts` con mocks de supabase y dataService
- [ ] `npm test -- --run` → todos pasan
- [ ] Commit

---

## Task 4: Revisar.tsx

- [ ] Crear `src/pages/Revisar.tsx`:

```typescript
import { Layout } from '../components/Layout'
import { useRevisionQueue } from '../hooks/useRevisionQueue'
import { useState } from 'react'
import type { ItemRevision } from '../hooks/useRevisionQueue'

export function Revisar() {
  const { items, isLoading, error, aprobar, rechazar } = useRevisionQueue()
  const [actionItem, setActionItem] = useState<string | null>(null)

  async function handleAprobar(item: ItemRevision) {
    setActionItem(item.id)
    await aprobar(item).catch(() => {})
    setActionItem(null)
  }

  async function handleRechazar(item: ItemRevision) {
    setActionItem(item.id)
    await rechazar(item).catch(() => {})
    setActionItem(null)
  }

  return (
    <Layout>
      <main className="container" style={{ paddingTop: '2rem' }}>
        <div className="hero">
          <p className="hero-eyebrow">Panel curatorial</p>
          <h1>Cola de <em>revisión</em></h1>
          <p className="hero-sub">
            {isLoading ? 'Cargando…' : `${items.length} ítems pendientes`}
          </p>
        </div>

        {error && <p style={{ color: 'var(--warn)', fontFamily: 'var(--mono)', fontSize: 12 }}>{error}</p>}

        {items.length === 0 && !isLoading && (
          <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-light)' }}>
            — Cola vacía —
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
          {items.map(item => (
            <div key={item.id} style={{
              background: 'var(--surface)',
              border: '1px solid var(--ink-faint)',
              borderRadius: 'var(--r)',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase',
                color: item.tipo === 'dataset' ? 'var(--accent)' : 'var(--agenda-genero)',
                flexShrink: 0,
              }}>{item.tipo}</span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, marginBottom: 2 }}>{item.titulo}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-light)' }}>
                  {[item.fuente, item.pais].filter(Boolean).join(' · ')}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button
                  className="btn-ghost"
                  style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }}
                  disabled={actionItem === item.id}
                  onClick={() => handleRechazar(item)}
                >Rechazar</button>
                <button
                  className="btn-primary"
                  disabled={actionItem === item.id}
                  onClick={() => handleAprobar(item)}
                >Aprobar</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </Layout>
  )
}
```

- [ ] Modificar `src/App.tsx`: agregar `<Route path="/revisar" element={<ProtectedRoute><Revisar /></ProtectedRoute>} />`
- [ ] Modificar `src/components/Header.tsx`: si `perfil?.rol === 'admin'` mostrar link "Revisar" en el nav
- [ ] `npm test -- --run` → todos pasan
- [ ] Commit: `feat: Phase 8 panel curatorial complete`
