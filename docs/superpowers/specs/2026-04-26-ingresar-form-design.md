# Página de Ingreso de Datasets y Normativas
**Date:** 2026-04-26
**Scope:** Nueva página `/ingresar` con formulario para someter datasets o normativas al corpus de Infra.Coop. Dos env vars controlan si se incluyen datos sintéticos y si los envíos pasan por supervisión.

---

## Contexto

El corpus actual (192 entradas) es mayormente sintético por falta de un canal de ingreso para usuarias reales. Esta página abre ese canal. Los envíos van directamente a las tablas de producción o a una cola de revisión según configuración de despliegue.

---

## Variables de entorno

| Variable | Valores | Efecto |
|---|---|---|
| `VITE_USE_SYNTHETIC_DATA` | `true` / `false` | Ya existente — controla si el index carga datos sintéticos |
| `VITE_REQUIRE_SUPERVISION` | `true` / `false` | Nuevo — `true` envía a cola de revisión; `false` inserta directo |

Ambas se leen en build time. Sin valor definido, `VITE_REQUIRE_SUPERVISION` hace fallback a `true` (más seguro).

---

## Ruta y navegación

- Ruta: `/ingresar`
- Enlace en el Header como ítem `05` con label `Ingresar datos`
- Sin autenticación por ahora — el env var de supervisión es el control de calidad

---

## Componente principal: `IngresoForm`

### Selector de tipo

Dos pills/tabs al inicio: **Dataset** | **Normativa**. El estado de selección determina qué campos se renderizan. Por defecto: Dataset.

### Campos — Dataset

Basados en `FormularioData` (ya tipado en `src/types/index.ts`):

| Campo | Tipo | Requerido |
|---|---|---|
| `titulo` | text | sí |
| `fuente_organismo` | text | no |
| `pais_iso3` | text (3 chars) | no |
| `anio_publicacion` | number | no |
| `subtema` | text | no |
| `agendas` | checkboxes: Tecnológica / Datos / Género | no |
| `frecuencia` | text | no |
| `desagregacion_geo` | text | no |
| `accesibilidad_formato` | text | no |
| `url_descarga` | url | no |
| `descripcion_notas` | textarea | no |
| `ingresado_por` | text | no |

### Campos — Normativa

Basados en el tipo `Normativa` de `src/types/index.ts`:

| Campo | Tipo | Requerido |
|---|---|---|
| `nombre` | text | sí |
| `organismo_emisor` | text | no |
| `tipo` | text | no |
| `pais_alcance` | text | no |
| `anio_adopcion` | number | no |
| `articulo_numeral` | text | no |
| `obligacion_datos` | textarea | no |
| `agendas` | checkboxes: Tecnológica / Datos / Género | no |
| `url_texto_oficial` | url | no |
| `descripcion_notas` | textarea | no |

`ingresado_por` aparece en ambos formularios al final.

---

## Lógica de envío

```
const requireSupervision = import.meta.env.VITE_REQUIRE_SUPERVISION !== 'false'
const modo = requireSupervision ? 'revision' : 'directo'
```

- **Dataset:** `submitFormulario(data, modo)` — función ya existente en `dataService.ts`
- **Normativa:** `submitNormativa(data, modo)` — función nueva a agregar en `dataService.ts`

`submitNormativa` sigue el mismo patrón: inserta en `normativas` (directo) o en `normativas_en_revision` (revisión). **Nota:** la tabla `normativas_en_revision` debe existir en Supabase con el mismo schema que `normativas` más un campo `status text default 'pendiente'`. Si no existe, el error se captura y se muestra al usuario.

### Estados de UI

- **idle** — formulario vacío
- **loading** — botón deshabilitado, spinner
- **success** — mensaje de confirmación; el texto refleja el modo (`revision` o `directo`)
- **error** — mensaje del servidor, formulario sigue editable

---

## Footer global

El componente `Layout` (`src/components/Layout.tsx`) recibe un `<footer>` con el texto:

```
Desarrollado por Diversa
```

Sin año, sin links adicionales, sin texto de licencia. Solo esa línea, centrada, en `font-mono text-[10px]` con el color `var(--ink-light)`.

---

## Archivos afectados

| Archivo | Acción |
|---|---|
| `src/pages/IngresoForm.tsx` | Crear |
| `src/services/dataService.ts` | Agregar `submitNormativa()` |
| `src/components/Header.tsx` | Agregar ítem `05 · Ingresar datos` |
| `src/components/Layout.tsx` | Agregar footer con "Desarrollado por Diversa" |
| `src/App.tsx` | Agregar ruta `/ingresar` |
| `.env.example` | Documentar `VITE_REQUIRE_SUPERVISION` |

---

## Lo que NO cambia

- `searchService.ts`, `scoreService.ts`, `qualityService.ts` — sin tocar
- `SearchIndexContext.tsx` — sin tocar
- Las tres páginas de visualización — sin tocar
- Los 58 tests existentes deben seguir pasando
