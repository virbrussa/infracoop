# Arquitectura Completa — Infra.Coop Motor de Brechas

> Documento de referencia para desarrolladores. Explica qué hace cada archivo, por qué existe y cuándo debes tocarlo.

---

## 1. ¿Qué es este proyecto?

**Infra.Coop Motor de Brechas** es una aplicación web de análisis de datos para movimientos feministas, cooperativos y de derechos digitales en América Latina. Permite a usuarias hacer preguntas en lenguaje natural ("¿qué datos existen sobre violencia obstétrica en Ecuador?") y el sistema responde con:

- Un **puntaje de brecha** (0–100) que indica qué tan mal cubierto está ese tema
- Los **datasets** y **normativas** más relevantes del corpus
- Un **informe de incidencia** descargable en PDF con marcos de referencia por lens de advocacy

El proyecto corre completamente en el cliente (SPA) salvo la base de datos. No hay backend propio: usa **Supabase** (PostgreSQL + pgvector) para persistencia y un **Web Worker** con un modelo ONNX de HuggingFace para embeddings semánticos locales.

---

## 2. Mapa de la arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│  Navegador del usuario                                          │
│                                                                 │
│  ┌──────────────┐    ┌──────────────────────────────────────┐   │
│  │  App.tsx     │    │  embedder.worker.ts (Web Worker)     │   │
│  │              │    │  Modelo HuggingFace paraphrase-mul…  │   │
│  │  Providers:  │◄──►│  ~330 MB ONNX, cacheado en browser   │   │
│  │  Auth        │    └──────────────────────────────────────┘   │
│  │  SearchIndex │                                               │
│  │  Embedder    │    ┌──────────────────────────────────────┐   │
│  │              │◄──►│  Supabase                            │   │
│  │  Router SPA  │    │  PostgreSQL 15 + pgvector            │   │
│  └──────────────┘    │  datasets, normativas, preguntas     │   │
│                      │  formularios_en_revision             │   │
│                      │  RLS + realtime subscriptions        │   │
│                      └──────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo de datos principal (ruta `/brechas`)

```
Usuario escribe pregunta
        │
        ▼
EmbedderContext.embed(texto)
  → Web Worker → Float32Array[768]
        │
        ▼
useMotorBrechas.buscar(query)
  → semanticSearch (cosine sim contra todos los embeddings)
  → si sim < 0.05: fallback a MiniSearch + Fuse.js
        │
        ▼
scoreService.calcularScore(datasets, normativas)
  → score = 0.6×(1 - max_sim_dataset) + 0.4×(1 - max_sim_normativa)
        │
        ▼
dataService.insertPregunta(texto, score, datasets)
        │
        ▼
Renderiza ScorePanel + ResultsColumns
        │
        ▼ (opcional)
React Router state → /diagnostico → window.print()
```

---

## 3. Jerarquía de providers (src/App.tsx)

```
AuthProvider
  └── SearchIndexProvider
        └── EmbedderProvider
              └── BrowserRouter (rutas)
```

El orden importa: `SearchIndexProvider` usa `AuthContext` para verificar si puede leer datos. `EmbedderProvider` es independiente pero se monta dentro para tener acceso al mismo árbol de contexto.

---

## 4. Archivos de configuración raíz

### `package.json`
Define los comandos del proyecto. Los más importantes:

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo con HMR en puerto 5173 |
| `npm run build` | `tsc -b && vite build` → genera `/dist` para deploy |
| `npm test` | Vitest en modo watch |
| `npm test -- --run` | Vitest pasada única (CI) |
| `npm run embed` | Genera embeddings en lote para el corpus (requiere `SUPABASE_SERVICE_ROLE_KEY`) |

**¿Cuándo lo cambias?** Si agregas una dependencia (`npm install X`), si renombras un script, o si necesitas ajustar el comando de build para, por ejemplo, generar tipos Supabase automáticamente.

---

### `vite.config.ts`
Configuración del bundler. Actualmente mínima: solo activa el plugin de React para JSX.

**¿Cuándo lo cambias?** Si necesitas:
- Alias de paths (`@/` → `src/`)
- Configuración del Web Worker (actualmente usa defaults de Vite)
- Separar chunks de código (code splitting manual)
- Variables de entorno adicionales en tiempo de build

---

### `vitest.config.ts`
Configura el entorno de tests: `jsdom` (simula el DOM del navegador), globals habilitados, archivo de setup `src/test/setup.ts`.

**¿Cuándo lo cambias?** Si agregas tests de servidor (necesitarías `node` environment) o si cambias la ubicación de los archivos de test.

---

### `tsconfig.app.json`
TypeScript en modo estricto: `noUnusedLocals`, `noUnusedParameters`. Esto significa que el compilador falla si declaras una variable y no la usas.

**¿Cuándo lo cambias?** Casi nunca. Si necesitas relajar una regla para un caso muy específico, es mejor usar `// @ts-ignore` localmente que cambiar la config global.

---

### `vercel.json`
Una sola regla: reescribe todas las rutas hacia `/index.html`. Esto es lo que permite que React Router funcione en Vercel sin devolver 404 al recargar la página.

**¿Cuándo lo cambias?** Si cambias de Vercel a otro host (Netlify usa `_redirects`, Nginx usa `try_files`). También si en algún momento agregas funciones serverless.

---

### `index.html`
El único HTML del proyecto. Carga las tres fuentes de Google (DM Serif Display, DM Mono, Instrument Sans) y monta React en `<div id="root">`.

**¿Cuándo lo cambias?** Si cambias de fuentes, si agregas meta tags de SEO/OG, o si necesitas precargar assets críticos.

---

## 5. Punto de entrada de la app

### `src/main.tsx`
Importa los CSS globales (`tokens.css`, `app.css`) y monta la aplicación con `createRoot`. No tiene lógica de negocio.

**¿Cuándo lo cambias?** Si necesitas agregar un provider que deba estar por encima de todo (ej. un `ThemeProvider` de una librería de terceros).

---

### `src/App.tsx`
Define el árbol de providers y todas las rutas. Es el "índice" de la aplicación.

**¿Cuándo lo cambias?**
- **Agregar una ruta nueva**: añade un `<Route path="/nueva-ruta" element={<NuevaPagina />} />`
- **Agregar una ruta protegida**: envuelve el elemento en `<ProtectedRoute requiredRole="admin">`
- **Cambiar la nav**: también actualiza `NAV_ITEMS` en `Header.tsx`

```tsx
// Ejemplo: agregar ruta /estadisticas accesible solo para admin
<Route
  path="/estadisticas"
  element={
    <ProtectedRoute requiredRole="admin">
      <Estadisticas />
    </ProtectedRoute>
  }
/>
```

---

## 6. Contextos (estado global)

### `src/context/AuthContext.tsx`
Maneja la sesión de Supabase y el rol del usuario (`admin` | `curadora` | null). Se suscribe a `onAuthStateChange` para mantener la sesión sincronizada.

| Export | Uso |
|--------|-----|
| `useAuth()` | Cualquier componente que necesite saber si hay sesión |
| `AuthProvider` | Envuelve la app en `App.tsx` |

**Estado clave:**
```ts
user: User | null        // objeto Supabase
perfil: { rol } | null   // fila de la tabla profiles
isLoading: boolean       // true mientras verifica sesión inicial
```

**¿Cuándo lo cambias?**
- Si agregas más roles (ej. `editor`)
- Si guardas más datos del perfil (ej. nombre, organización)
- Si cambias la tabla `profiles` en la DB

**Ejemplo de cambio:** Agregar campo `organizacion` al perfil:
```ts
// En loadPerfil(), agrega organizacion al SELECT:
const { data } = await supabase
  .from('profiles')
  .select('rol, organizacion')  // ← agregar
  .eq('id', user.id)
  .single();
```

---

### `src/context/SearchIndexContext.tsx`
Carga **una sola vez** al montar la app todos los datasets y normativas de Supabase, construye los índices de búsqueda (MiniSearch + Fuse.js) y las tablas de embeddings. Este índice es compartido por todos los hooks de búsqueda.

**¿Por qué existe?** Para que cada componente no haga su propia consulta a la DB. Toda la búsqueda local es en memoria.

**¿Cuándo lo cambias?**
- Si agregas una nueva colección al corpus (ej. `informes`) necesitas cargarla aquí y pasarla a `buildIndex()`
- Si el corpus crece tanto que la carga inicial es lenta, aquí se implementaría paginación o carga lazy

---

### `src/context/EmbedderContext.tsx`
Gestiona el Web Worker que corre el modelo de embeddings. Comunica el estado de descarga/carga del modelo (~330 MB la primera vez).

**API:**
```ts
const { embed, status, progress } = useEmbedder();
const vector = await embed("¿qué datos hay sobre violencia de género?");
// vector: Float32Array[768]
```

**¿Cuándo lo cambias?**
- Si cambias de modelo (ej. a uno más pequeño o más preciso)
- Si quieres cambiar cómo se cachea el modelo (actualmente usa el cache del navegador via `transformers.js`)
- Si necesitas embeddings en lote (hoy procesa uno a la vez)

---

## 7. Tipos (`src/types/index.ts`)

Define **todas** las interfaces TypeScript del proyecto. Es el contrato de datos entre la DB, los servicios y los componentes.

**Tipos principales:**

| Tipo | Representa |
|------|------------|
| `Dataset` | Fila de la tabla `datasets` |
| `Normativa` | Fila de la tabla `normativas` |
| `Pregunta` | Pregunta de usuaria + metadatos de resultado |
| `SearchHit` | Un resultado de búsqueda normalizado (dataset o normativa) |
| `GapResult` | Resultado completo del motor de brechas |
| `AgendaScores` | Puntaje por agenda `{tecnologica, datos, genero}` |
| `MonitorStats` | Datos del dashboard `/colectivo` |
| `EvolucionStats` | Datos del dashboard `/datos` |

**¿Cuándo lo cambias?**
- Siempre que cambies un campo en la DB y necesites reflejarlo en el frontend
- Si el motor de brechas devuelve un campo nuevo
- Si agregas una nueva colección (ej. `Informe`)

**Ejemplo:** Si agregas campo `licencia` a datasets:
```ts
// En types/index.ts:
export interface Dataset {
  // ... campos existentes ...
  licencia?: string;  // ← agregar
}

// También actualizar db/schema.sql:
ALTER TABLE datasets ADD COLUMN licencia TEXT;
```

---

## 8. Servicios (lógica de negocio pura)

Los servicios son funciones puras o casi-puras que no usan hooks de React. Son la capa entre la DB/modelo y los componentes.

### `src/services/supabase.ts`
Singleton del cliente Supabase. Todos los demás servicios lo importan.

**¿Cuándo lo cambias?** Nunca, salvo que migres a otra versión de la librería de Supabase.

---

### `src/services/dataService.ts`
Todas las operaciones CRUD contra Supabase. Es el único archivo que hace consultas SQL directas.

**Funciones clave:**

| Función | Qué hace |
|---------|----------|
| `getDatasets(filters?)` | SELECT de datasets con filtros opcionales |
| `getNormativas(filters?)` | SELECT de normativas con filtros opcionales |
| `insertPregunta(texto, score, datasets)` | Registra una consulta de usuaria |
| `submitFormulario(data, modo)` | Envía dataset a revisión O directo al corpus |
| `aprobarFormulario(id)` | Mueve de `formularios_en_revision` → `datasets` |
| `updateEmbedding(tabla, id, vector)` | Guarda el embedding en pgvector |

**¿Cuándo lo cambias?**
- Agregar un campo nuevo a un SELECT
- Cambiar la lógica de aprobación (ej. enviar email al aprobador)
- Agregar una nueva tabla al CRUD

**Ejemplo:** Si quieres filtrar datasets por año:
```ts
export async function getDatasets(filters?: DatasetFilters & { anioDesde?: number }) {
  let query = supabase.from('datasets').select('*');
  if (filters?.anioDesde) {
    query = query.gte('anio_publicacion', filters.anioDesde);
  }
  // ...
}
```

---

### `src/services/searchService.ts`
Construye y ejecuta el índice de búsqueda de texto. Usa **MiniSearch** (BM25, búsqueda exacta y por prefijo) y **Fuse.js** (búsqueda difusa/fuzzy) como fallback.

**Función central:**
```ts
buildIndex(datasets, normativas) → SearchIndex
search(query, index, limit) → { datasets: SearchHit[], normativas: SearchHit[] }
```

**¿Cuándo lo cambias?**
- Si agregas campos al índice (ej. indexar también `descripcion_notas`)
- Si ajustas los pesos de relevancia de MiniSearch
- Si agregas una nueva colección al corpus (necesita su propio índice Fuse/MiniSearch)

**Ejemplo:** Agregar `descripcion_notas` al índice de búsqueda:
```ts
miniDatasets.addAllAsync(datasets.map(d => ({
  id: d.id,
  titulo: d.titulo,
  subtema: d.subtema ?? '',
  descripcion: d.descripcion_notas ?? '',  // ← agregar
})));
// Y en el objeto MiniSearch:
fields: ['titulo', 'subtema', 'descripcion'],  // ← agregar
```

---

### `src/services/semanticSearch.ts`
Búsqueda semántica usando embeddings vectoriales. Computa similitud coseno entre el vector de la pregunta y todos los embeddings del corpus.

```ts
cosineSimilarity(a: Float32Array, b: Float32Array) → number  // [-1, 1]
semanticSearch(queryVector, index, limit) → { datasets, normativas }
```

**¿Cuándo lo cambias?**
- Si cambias la métrica de similitud (ej. producto punto en lugar de coseno)
- Si ajustas el umbral de corte (actualmente `SEMANTIC_MIN_SIM = 0.05` en `useMotorBrechas`)
- Si el modelo cambia de dimensión (actualmente 768 dims)

---

### `src/services/scoreService.ts`
La fórmula central del motor de brechas. Convierte los resultados de búsqueda en un puntaje interpretable.

**Fórmula:**
```
score = 0.6 × (1 - max_similitud_dataset) + 0.4 × (1 - max_similitud_normativa)
```

- Si no hay resultados: `score = 1.0` (brecha crítica)
- `score ≥ 0.65` → crítica
- `score ≥ 0.35` → parcial
- `score < 0.35` → cubierta

**¿Cuándo lo cambias?**
- Si ajustas los pesos (actualmente 60% datasets / 40% normativas)
- Si cambias los umbrales de categorización
- Si agregas una nueva agenda (hay que actualizar `calcularAgendas()`)

**Ejemplo:** Cambiar pesos a 50/50:
```ts
// En calcularScore():
const score = 0.5 * (1 - maxDataset) + 0.5 * (1 - maxNormativa);
```

---

### `src/services/qualityService.ts`
Calcula automáticamente la calidad de un dataset en 4 dimensiones:

| Señal | Peso | Criterio |
|-------|------|---------|
| Metadatos (S1) | 20% | Tiene fuente + metodología |
| Actualidad (S2) | 30% | Antigüedad del año de publicación |
| Desagregación (S3) | 30% | Nivel geográfico |
| Accesibilidad (S4) | 20% | URL válida + formato legible por máquina |

**¿Cuándo lo cambias?**
- Si agregas una nueva señal de calidad
- Si cambias los pesos entre señales
- Si ajustas qué formatos se consideran "legibles por máquina"

---

## 9. Hooks (lógica de React)

Los hooks conectan los servicios con los componentes. Manejan estado de carga, efectos secundarios y subscripciones.

### `src/hooks/useMotorBrechas.ts`
Orquesta el flujo completo de análisis de brecha: embed → buscar → puntuar → registrar.

```ts
const { buscar, limpiar, resultado, isLoading, error } = useMotorBrechas();
```

**¿Cuándo lo cambias?**
- Si cambias el umbral `SEMANTIC_MIN_SIM` para el fallback a búsqueda de texto
- Si quieres que el hook no inserte la pregunta automáticamente
- Si agregas una nueva fuente de búsqueda (ej. un tercer tipo de recurso)

---

### `src/hooks/useMonitorStats.ts`
Computa todas las métricas del dashboard `/colectivo`. Hace búsquedas Fuse.js contra el corpus para cada topic predefinido.

**`TOPIC_QUERIES`**: Array de 5 queries de referencia codificadas. Cada una representa un tema crítico.

**¿Cuándo lo cambias?**
- Para agregar un nuevo topic al dashboard: añade una entrada a `TOPIC_QUERIES`
- Para cambiar los colores o labels de una agenda: edita `AGENDA_CONFIG`
- Si los filtros del dashboard necesitan un nuevo campo (ej. `anio`)

---

### `src/hooks/useEvolucionStats.ts`
Agrega preguntas por semana ISO y calcula estadísticas de evolución de demanda.

**`BASELINE_QUERIES`**: 5 queries fijas que se corren contra el corpus para calcular la brecha de referencia (antes de que las usuarias pregunten nada).

**¿Cuándo lo cambias?**
- Para cambiar la granularidad temporal (ej. agregación mensual en lugar de semanal)
- Si quieres más o diferentes baseline queries
- Para agregar nuevas métricas por semana

---

### `src/hooks/useRevisionQueue.ts`
Maneja la cola de revisión de envíos pendientes. Se suscribe a cambios en tiempo real via Supabase.

**¿Cuándo lo cambias?**
- Si agregas un estado nuevo a la revisión (ej. `en_espera`)
- Si necesitas filtrar la cola por tipo (datasets vs normativas por separado)
- Si agregas lógica de notificación al aprobar/rechazar

---

### `src/hooks/useLandingStats.ts`
Carga en paralelo los conteos de datasets, normativas y preguntas para la landing page. Se actualiza en tiempo real.

**¿Cuándo lo cambias?** Si agregas una cuarta métrica a la landing (ej. número de países cubiertos).

---

### `src/hooks/useDatasets.ts`, `useNormativas.ts`, `usePreguntas.ts`
Hooks genéricos de fetching con filtros, loading state y función `refetch`. Son usados por componentes específicos que necesitan subconjuntos del corpus.

**¿Cuándo los cambias?** Si necesitas un hook que combine datos de dos tablas o que aplique transformaciones adicionales.

---

## 10. Workers

### `src/workers/embedder.worker.ts`
Corre el modelo de HuggingFace (`paraphrase-multilingual-mpnet-base-v2`) en un hilo separado para no bloquear la UI. La primera carga descarga ~330 MB desde HuggingFace y los cachea en el navegador.

**Protocolo de mensajes:**

```
Componente                    Worker
    │                           │
    │──{type:'embed', text}─────►│
    │◄─{type:'progress', %}──────│  (durante la carga inicial del modelo)
    │◄─{type:'ready'}────────────│  (modelo listo)
    │◄─{type:'result', vector}───│  (embedding listo)
    │◄─{type:'error', msg}───────│  (si algo falla)
```

**¿Cuándo lo cambias?**
- Si cambias de modelo de embeddings
- Si necesitas soporte para embeddings en lote (hoy es uno a la vez)
- Si quieres cambiar la estrategia de pooling (actualmente `mean`)

---

## 11. Páginas

### `src/pages/Landing.tsx` → `/`
Presentación del proyecto con estadísticas en vivo. Usa `useLandingStats()`.

**¿Cuándo la cambias?** Para actualizar el copy, cambiar las secciones del explainer, o agregar nuevas métricas al `StatsStrip`.

---

### `src/pages/MonitorBrechas.tsx` → `/brechas`
La página central del producto. Contiene toda la UI del motor de brechas.

**Componentes internos:**
- `SearchBox`: área de texto con indicadores de progreso del embedder
- `ScorePanel`: gauge de arco + distribución por agenda
- `ResultadoMetaBand`: conteo de resultados encontrados
- `ResultsColumns`: dos columnas (datasets / normativas) con barras de calidad
- `ChipsBar`: selector de lens de advocacy
- `ExampleQuestions`: preguntas de ejemplo precargadas

**¿Cuándo la cambias?**
- Para cambiar las preguntas de ejemplo: edita el array `EXAMPLE_QUESTIONS`
- Para cambiar cómo se muestran los resultados: edita `ResultsColumns`
- Para agregar un nuevo lens de advocacy: edita `CHIPS` y el objeto de textos en `Diagnostico.tsx`

---

### `src/pages/MonitorColectivo.tsx` → `/colectivo`
Dashboard del estado actual del corpus. Usa `useMonitorStats()`.

**¿Cuándo la cambias?**
- Para agregar un nuevo topic de seguimiento: edita `TOPIC_QUERIES` en `useMonitorStats`
- Para cambiar los filtros disponibles: edita el estado `filtros` y el componente de filtros
- Para agregar una nueva visualización de calidad

---

### `src/pages/DatosQueremos.tsx` → `/datos`
Evolución temporal de la demanda. Usa `useEvolucionStats()` y Recharts para las gráficas.

**¿Cuándo la cambias?**
- Para cambiar la granularidad (mes vs semana): los helpers `parseIsoWeek` y `filterSemanasByMes` son el punto de entrada
- Para agregar una nueva gráfica de tendencia
- Para cambiar las consultas de baseline

---

### `src/pages/IngresoForm.tsx` → `/ingresar`
Formulario de contribución de datos. Lógica dual: modo directo (admin) vs revisión (público).

**¿Cuándo la cambias?**
- Para agregar un campo nuevo al formulario: agrégalo en el componente de campos, en el tipo `FormularioData` y en la migración SQL correspondiente
- Para cambiar la validación de un campo existente
- Para agregar un tercer tipo de recurso (ej. "informe")

**Flujo de envío:**
```
Usuario envía formulario
        │
        ├── si admin → dataService.submitFormulario(data, 'directo')
        │                  → INSERT en datasets
        │                  → autoEmbed si embedder listo
        │
        └── si público → dataService.submitFormulario(data, 'revision')
                          → INSERT en formularios_en_revision
```

---

### `src/pages/Revisar.tsx` → `/revisar` (solo admin)
Cola de revisión de envíos pendientes. Protegida por `ProtectedRoute requiredRole="admin"`.

**¿Cuándo la cambias?**
- Para cambiar la UI de cada card de revisión: edita `RevisionCard`
- Para agregar campos de detalle visibles al revisar
- Para agregar lógica de moderación (ej. bloqueo de usuaria)

---

### `src/pages/Diagnostico.tsx` → `/diagnostico`
Genera el informe de incidencia. Recibe datos via `location.state` de React Router (no hay URL params).

**Contenido del informe por lens:**

| Lens | Marcos de referencia incluidos |
|------|-------------------------------|
| Gobierno Abierto | OGP, Carta Internacional de Datos Abiertos, ODS 16 |
| DDHH | CEDAW, Belém do Pará, Agenda 2030 |
| Cooperación Digital | WSIS, UN Tech Envoy, UNCTAD |
| Gobernanza Cooperativa | Principios ACI, Declaración de Identidad Cooperativa |

**¿Cuándo lo cambias?**
- Para agregar un nuevo lens: agrega el chip en `MonitorBrechas.tsx` y el bloque de marcos en `Diagnostico.tsx`
- Para cambiar los marcos de referencia de un lens existente: edita el objeto `MARCOS_POR_CHIP`
- Para cambiar el layout del PDF: edita los estilos `@media print`

---

## 12. Componentes reutilizables

### `src/components/Header.tsx`
Navegación sticky con soporte mobile (drawer). Define `NAV_ITEMS`.

**¿Cuándo lo cambias?** Si agregas una ruta nueva al nav, también debes agregarla aquí. Si cambias el logo.

---

### `src/components/ProtectedRoute.tsx`
Guarda de rutas. Redirige a `/login` si no hay sesión, a `/` si el rol no coincide.

```tsx
<ProtectedRoute requiredRole="admin">
  <MiPaginaAdmin />
</ProtectedRoute>
```

**¿Cuándo lo cambias?** Si agregas un nuevo rol, o si cambias el comportamiento de redirección.

---

### `src/components/Skeleton.tsx`
Placeholders de carga. Evita los saltos de layout mientras los datos llegan.

**¿Cuándo lo cambias?** Si agregas una nueva sección al dashboard que necesite su propio skeleton.

---

### `src/components/Tooltip.tsx`
Burbuja de ayuda contextual. Usa posicionamiento `fixed` para no quedar recortada por `overflow: hidden` de los contenedores padres.

**¿Cuándo lo cambias?** Si necesitas tooltips con contenido HTML (actualmente solo texto plano).

---

## 13. Estilos

### `src/styles/tokens.css`
El sistema de diseño completo como CSS custom properties. **Nunca uses valores hex directos en componentes.**

**Tokens importantes:**

```css
/* Puntajes de brecha */
--gap-crit: #534AB7;   /* crítica */
--gap-part: #7F77DD;   /* parcial */
--gap-cov:  #1d6e4a;   /* cubierta */

/* Tipografía */
--serif: 'DM Serif Display', serif;
--sans:  'Instrument Sans', sans-serif;
--mono:  'DM Mono', monospace;

/* Agendas */
--agenda-tec:       /* tecnológica */
--agenda-datos:     /* datos */
--agenda-genero:    /* género */
```

**¿Cuándo lo cambias?**
- Para agregar un nuevo color de agenda
- Para cambiar la paleta general de la app
- Si agregas una nueva categoría de brecha

---

### `src/styles/app.css`
Estilos de componentes específicos de esta app. Importa `tokens.css`.

**¿Cuándo lo cambias?** Cuando necesitas estilar un componente nuevo o ajustar la layout de una sección existente. Para estilos de print (informe PDF), los selectores están bajo `@media print`.

---

## 14. Base de datos (`/db/`)

### `db/schema.sql`
Schema principal. Define todas las tablas, índices y políticas RLS.

**Tablas clave:**

| Tabla | Propósito |
|-------|-----------|
| `datasets` | Corpus de conjuntos de datos |
| `normativas` | Corpus de marcos normativos |
| `preguntas` | Log de consultas de usuarias |
| `formularios_en_revision` | Cola de datasets pendientes |
| `normativas_en_revision` | Cola de normativas pendientes |
| `profiles` | Roles de usuarios (admin/curadora) |

**¿Cuándo lo cambias?** Si agregas una tabla nueva. Los cambios a tablas existentes van en un archivo de migración nuevo (ver patrón de archivos `migration-v*.sql`).

---

### Migraciones (`migration-v*.sql`)
Cada migración modifica el schema de forma incremental. Ejecutar en orden:

```bash
psql < db/schema.sql
psql < db/metrics.sql
psql < db/migration-v0.7-auth.sql
psql < db/migration-v0.8-revision-rls.sql
psql < db/migration-v0.9-admin-insert.sql
psql < db/migration-v1.0-real-data.sql
```

**¿Cuándo creas una migración nueva?** Cada vez que cambias la estructura de la DB en producción. Nunca modifiques `schema.sql` para cambios retroactivos.

---

## 15. Scripts de utilidad

### `scripts/embed-corpus.ts`
Genera embeddings en lote para todos los datasets y normativas del corpus. Se corre una vez cuando se sube datos nuevos al corpus sin embedding.

```bash
SUPABASE_SERVICE_ROLE_KEY=xxx npm run embed
```

**¿Cuándo lo usas?** Después de una importación masiva de datos. Los envíos individuales desde `/ingresar` se auto-embeben si el modelo está cargado.

**¿Cuándo lo cambias?** Si cambias el modelo de embeddings (debe coincidir con el modelo en `embedder.worker.ts`).

---

## 16. Tests (`src/test/`)

El proyecto usa Vitest + React Testing Library. Los tests cubren principalmente servicios y hooks.

**¿Cuándo los cambias?**
- Al agregar una función nueva a un servicio: agrega tests para los casos base y edge cases
- Al cambiar la fórmula de `calcularScore()`: actualiza los valores esperados en `scoreService.test.ts`
- Al agregar un campo nuevo a los tipos: puede requerir actualizar fixtures de test

---

## 17. Guía rápida de cambios comunes

### Quiero agregar un campo nuevo a datasets

1. `db/migration-vX.Y-nombre.sql` — `ALTER TABLE datasets ADD COLUMN nuevo_campo TEXT`
2. `src/types/index.ts` — agregar `nuevo_campo?: string` a `Dataset`
3. `src/services/dataService.ts` — incluir el campo en los SELECTs y INSERTs relevantes
4. `src/pages/IngresoForm.tsx` — agregar el campo al formulario
5. `src/services/qualityService.ts` — si el campo afecta la calidad calculada

### Quiero agregar una nueva agenda (ej. "economía social")

1. `src/types/index.ts` — agregar `economia` a `AgendaScores`
2. `src/services/scoreService.ts` — agregar patrón regex en `calcularAgendas()`
3. `src/hooks/useMonitorStats.ts` — agregar entrada en `AGENDA_CONFIG`
4. `src/styles/tokens.css` — agregar `--agenda-economia` y `--agenda-economia-bg`
5. `src/components/Badge.tsx` — agregar variante del badge
6. `src/pages/Diagnostico.tsx` — agregar marcos de referencia para esa agenda

### Quiero agregar un nuevo lens de advocacy al informe

1. `src/pages/MonitorBrechas.tsx` — agregar el chip a `CHIPS`
2. `src/pages/Diagnostico.tsx` — agregar entrada en `MARCOS_POR_CHIP` con principios, citas y acciones recomendadas

### Quiero cambiar el modelo de embeddings

1. `src/workers/embedder.worker.ts` — cambiar el nombre del modelo en `pipeline()`
2. `scripts/embed-corpus.ts` — cambiar el modelo y re-generar todos los embeddings
3. `db/schema.sql` y migración — si el nuevo modelo tiene diferente número de dimensiones (ej. 1024 en lugar de 768), cambiar `vector(768)` a `vector(1024)` en la DB

### Quiero proteger una ruta existente

En `src/App.tsx`:
```tsx
// Antes:
<Route path="/mi-ruta" element={<MiPagina />} />

// Después:
<Route
  path="/mi-ruta"
  element={
    <ProtectedRoute requiredRole="curadora">
      <MiPagina />
    </ProtectedRoute>
  }
/>
```

---

## 18. Variables de entorno

```bash
# Requeridas
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Opcionales
VITE_USE_SYNTHETIC_DATA=true   # Incluye datos sintéticos en las consultas
SUPABASE_SERVICE_ROLE_KEY=xxx  # Solo para npm run embed (no va en el cliente)
```

Las variables con prefijo `VITE_` son inyectadas por Vite en tiempo de build y quedan expuestas en el bundle del cliente. **Nunca pongas claves privadas con prefijo `VITE_`.**

---

*Generado con la arquitectura de InfraCoopDashboard v1.0. Actualizar al agregar nuevas rutas, servicios o cambios de schema.*
