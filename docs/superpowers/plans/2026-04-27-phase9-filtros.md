# Phase 9 — Filtros en Monitor Colectivo

**Goal:** Conectar los filtros de Agenda, País y Calidad en `/colectivo`. Hoy son decorativos. Con esta fase filtran los datasets que alimentan las tarjetas de agenda y tópico.

**Architecture:** `useMonitorStats` recibe un objeto `filtros: ColectivoFiltros` con `agenda`, `pais`, `calidad`. El hook aplica los filtros sobre el `datasetsMap` antes de calcular métricas. El componente `MonitorColectivo` mantiene el estado de filtros y los pasa al hook. Los valores de País se derivan dinámicamente del índice.

---

## File Map

| Acción | Archivo | Propósito |
|--------|---------|-----------|
| Modify | `src/hooks/useMonitorStats.ts` | Aceptar filtros, aplicarlos sobre datasetsMap |
| Modify | `src/pages/MonitorColectivo.tsx` | Estado de filtros, UI de selects, pasar filtros al hook |
| Modify | `src/styles/app.css` | Estilos del panel de filtros |
| Modify | `src/test/useMonitorStats.test.ts` | Tests con filtros activos |

---

## Types

Agregar a `src/types/index.ts`:

```typescript
export interface ColectivoFiltros {
  agenda: 'todas' | 'tecnologica' | 'datos' | 'genero'
  pais: string       // 'todos' o código ISO3 ej: 'MEX'
  calidad: 'todas' | 'Completa' | 'Parcial' | 'Nula'
}
```

---

## Task 1: Actualizar useMonitorStats

- [ ] Escribir tests primero en `src/test/useMonitorStats.test.ts`:
  - filtro agenda='genero' → solo datasets con agenda de género
  - filtro calidad='Completa' → solo datasets completos
  - filtro pais='MEX' → solo datasets de México
  - filtros combinados funcionan correctamente

- [ ] Modificar `src/hooks/useMonitorStats.ts`:

```typescript
// 1. Cambiar firma:
export function useMonitorStats(filtros: ColectivoFiltros): MonitorStats

// 2. Dentro de compute(), antes del AGENDA_CONFIG.map():
const AGENDA_PATTERNS = {
  tecnologica: /tecnol/i,
  datos: /dato/i,
  genero: /g[eé]nero/i,
}

function datasetPasaFiltros(ds: Dataset): boolean {
  if (filtros.agenda !== 'todas') {
    const pattern = AGENDA_PATTERNS[filtros.agenda]
    if (!ds.agendas.some(a => pattern.test(a))) return false
  }
  if (filtros.pais !== 'todos' && ds.pais_iso3 !== filtros.pais) return false
  if (filtros.calidad !== 'todas' && ds.calidad !== filtros.calidad) return false
  return true
}

const filteredDatasets = [...idx.datasetsMap.values()].filter(datasetPasaFiltros)
const filteredMap = new Map(filteredDatasets.map(d => [d.id, d]))
```

  - Usar `filteredMap` en lugar de `idx.datasetsMap` para calcular agendas, tópicos, totales
  - Agregar `filtros` como dependencia del useEffect

- [ ] `npm test -- --run` → todos pasan
- [ ] Commit

---

## Task 2: UI de filtros en MonitorColectivo

- [ ] Modificar `src/pages/MonitorColectivo.tsx`:

```typescript
// Estado inicial:
const [filtros, setFiltros] = useState<ColectivoFiltros>({
  agenda: 'todas', pais: 'todos', calidad: 'todas'
})

// Derivar países disponibles del índice:
const { agendas, topics, ..., index } = useMonitorStats(filtros)
// (useMonitorStats también expone el SearchIndex para derivar países)
```

  - Agregar panel de filtros encima de la banda de métricas:

```tsx
<div className="colectivo-filtros">
  <select value={filtros.agenda} onChange={e => setFiltros(f => ({ ...f, agenda: e.target.value as ColectivoFiltros['agenda'] }))}>
    <option value="todas">Todas las agendas</option>
    <option value="tecnologica">Ag. Tecnológica</option>
    <option value="datos">Ag. de Datos</option>
    <option value="genero">Ag. de Género</option>
  </select>

  <select value={filtros.pais} onChange={e => setFiltros(f => ({ ...f, pais: e.target.value }))}>
    <option value="todos">Todos los países</option>
    {paises.map(p => <option key={p} value={p}>{p}</option>)}
  </select>

  <select value={filtros.calidad} onChange={e => setFiltros(f => ({ ...f, calidad: e.target.value as ColectivoFiltros['calidad'] }))}>
    <option value="todas">Toda calidad</option>
    <option value="Completa">Completa</option>
    <option value="Parcial">Parcial</option>
    <option value="Nula">Nula</option>
  </select>

  {(filtros.agenda !== 'todas' || filtros.pais !== 'todos' || filtros.calidad !== 'todas') && (
    <button className="btn-ghost" style={{ fontSize: 11 }}
      onClick={() => setFiltros({ agenda: 'todas', pais: 'todos', calidad: 'todas' })}>
      Limpiar filtros
    </button>
  )}
</div>
```

- [ ] CSS en `src/styles/app.css`:

```css
.colectivo-filtros {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  margin-bottom: 1.5rem;
  align-items: center;
}

.colectivo-filtros select {
  font-family: var(--mono);
  font-size: 11px;
  padding: 5px 10px;
  border: 1px solid var(--ink-faint);
  border-radius: 9999px;
  background: white;
  color: var(--ink);
  cursor: pointer;
}

.colectivo-filtros select:focus {
  outline: 2px solid var(--accent);
  border-color: var(--accent);
}
```

- [ ] Exponer lista de países desde `useMonitorStats`: agregar campo `paises: string[]` al return, derivado de los datasets en el índice (sin filtrar por país para que siempre se listen todos).

- [ ] `npm test -- --run` → todos pasan
- [ ] Commit: `feat: Phase 9 filtros colectivo complete`
