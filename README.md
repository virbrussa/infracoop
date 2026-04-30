# Infra.Coop — Motor de Brechas v0.4

**Data Cooperativas Latinas · Mozilla Fellowship 2024–2026**

Infra.Coop es una plataforma web para analizar brechas de datos de género en América Latina. Contrasta preguntas de la comunidad contra un corpus de datasets y marcos normativos, calcula un score de brecha semántica, y visualiza la evolución colectiva de la demanda de datos.

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Base de datos | Supabase (PostgreSQL 15 + pgvector) |
| Búsqueda semántica | Transformers.js (`paraphrase-multilingual-mpnet-base-v2`) via Web Worker |
| Búsqueda de texto | MiniSearch v7 (BM25) + Fuse.js v7 (fuzzy) |
| Autenticación | Supabase Auth + tabla `profiles` |
| Tests | Vitest + @testing-library/react |

---

## Estructura del proyecto

```
InfraCoopDashboard/
├── index.html                    ← Entry point Vite
├── src/
│   ├── main.tsx                  ← Monta <App /> en #root
│   ├── App.tsx                   ← Router, providers, rutas
│   ├── types/index.ts            ← Todos los tipos TypeScript
│   ├── context/
│   │   ├── AuthContext.tsx       ← Sesión de usuario
│   │   ├── SearchIndexContext.tsx← Índice de búsqueda cargado al inicio
│   │   └── EmbedderContext.tsx   ← Web Worker del modelo de embeddings
│   ├── hooks/
│   │   ├── useMotorBrechas.ts    ← Lógica principal del motor de búsqueda
│   │   ├── useMonitorStats.ts    ← Métricas del Monitor Colectivo
│   │   ├── useEvolucionStats.ts  ← Métricas de evolución semanal
│   │   └── useRevisionQueue.ts   ← Cola de revisión curatorial
│   ├── services/
│   │   ├── supabase.ts           ← Cliente Supabase
│   │   ├── dataService.ts        ← CRUD: datasets, normativas, preguntas, formularios
│   │   ├── searchService.ts      ← buildIndex(), search() con MiniSearch + Fuse
│   │   ├── semanticSearch.ts     ← cosineSimilarity(), semanticSearch()
│   │   └── scoreService.ts       ← calcularScore(), calcularAgendas(), generarTitulo()
│   ├── workers/
│   │   └── embedder.worker.ts    ← Web Worker: carga modelo ONNX, genera embeddings
│   ├── pages/
│   │   ├── Landing.tsx           ← / — ¿Qué es Infra.Coop?
│   │   ├── MonitorBrechas.tsx    ← /brechas — Motor de búsqueda principal
│   │   ├── MonitorColectivo.tsx  ← /colectivo — Mapa colectivo de brechas
│   │   ├── DatosQueremos.tsx     ← /datos — Evolución semanal de la demanda
│   │   ├── IngresoForm.tsx       ← /ingresar — Formulario público de ingreso
│   │   ├── Revisar.tsx           ← /revisar — Panel curatorial (solo admin)
│   │   ├── Diagnostico.tsx       ← /diagnostico — Vista de impresión del resultado
│   │   └── Login.tsx             ← /login — Autenticación de curadores
│   ├── components/
│   │   ├── Layout.tsx            ← Wrapper con Header + fondo de página
│   │   ├── Header.tsx            ← Navegación principal + estado de sesión
│   │   └── ProtectedRoute.tsx    ← Redirige a /login si no hay sesión
│   └── styles/
│       └── app.css               ← Sistema de diseño completo
├── db/
│   ├── schema.sql                ← Esquema PostgreSQL inicial (correr primero)
│   ├── metrics.sql               ← Triggers de auditoría + función de snapshot diario
│   ├── migration-v0.7-auth.sql   ← Tabla profiles + RLS + trigger on_auth_user_created
│   └── migration-v0.8-revision-rls.sql ← Tabla normativas_en_revision + RLS
├── scripts/
│   └── embed-corpus.ts           ← Genera embeddings del corpus (npm run embed)
└── docs/
    └── superpowers/              ← Planes e implementaciones por fase
```

---

## Rutas de la aplicación

| Ruta | Página | Acceso |
|------|--------|--------|
| `/` | Landing — ¿Qué es Infra.Coop? | Público |
| `/brechas` | Monitor de Brechas | Público |
| `/colectivo` | Monitor Colectivo | Público |
| `/datos` | ¿Qué datos queremos? | Público |
| `/ingresar` | Ingresar datos al corpus | Público |
| `/login` | Login de curadores | Público |
| `/revisar` | Cola de revisión curatorial | Solo `admin` |
| `/diagnostico` | Vista de impresión del diagnóstico | Público (acceso vía navegación interna) |

---

## Páginas — funcionamiento detallado

### `/` — Landing

Página editorial estática. Explica qué es Infra.Coop y describe cada sección del Monitor (Brechas, Colectivo, ¿Qué datos queremos?). Lista las capas futuras previstas: Capa federada de nodos, Capa de datos cooperativos, Protocolo de gobernanza.

No tiene lógica dinámica.

---

### `/brechas` — Monitor de Brechas

**El núcleo de la plataforma.** El usuario escribe una pregunta sobre datos de género; el sistema busca en el corpus y calcula qué tan grande es la brecha de datos.

#### Flujo completo

```
Usuario escribe pregunta (mín. 5 caracteres)
  → embed(pregunta) → Float32Array[768] via Web Worker
  → semanticSearch(vector, índice) → top 5 datasets + top 5 normativas
      [si max similitud < 0.05: fallback a MiniSearch/Fuse textual]
  → calcularScore(datasets, normativas) → { score: 0–1, categoria }
  → calcularAgendas(datasets, normativas) → { tecnologica, datos, genero }
  → generarTitulo(categoria, datasets, normativas) → string
  → Guardar pregunta en Supabase (insertPregunta) — sin bloquear UI
  → Renderizar resultado
```

#### Score de brecha

```
score = (1 - max_sim_dataset) × 0.6 + (1 - max_sim_normativa) × 0.4
```

- `0.0` → dato completamente cubierto en el corpus
- `1.0` → brecha crítica, ningún dato relacionado
- `≥ 0.65` → **crítica** (púrpura `#534AB7`)
- `0.35–0.65` → **parcial** (lila `#7F77DD`)
- `< 0.35` → **cubierta** (verde `#1d6e4a`)

#### Búsqueda semántica con fallback híbrido

1. El Web Worker carga el modelo ONNX `paraphrase-multilingual-mpnet-base-v2` desde HuggingFace la primera vez (~330MB, se cachea en el navegador con `env.useBrowserCache = true`).
2. Para cada búsqueda genera un vector 768-dimensional normalizado de la pregunta.
3. Calcula similitud coseno contra todos los embeddings del corpus almacenados en Supabase.
4. **Si el máximo de similitud es < 0.05** (modelo en carga, corpus sin embeddings, o mismatch de versión ONNX entre Node.js y browser), hace fallback automático a búsqueda BM25 (MiniSearch) + fuzzy (Fuse.js). Esto garantiza resultados siempre.

#### Barras de relevancia

Las barras muestran relevancia **relativa**: el resultado más relevante siempre obtiene barra completa (100%). La etiqueta muestra "alta / media / baja" para no confundir con porcentajes absolutos de similitud coseno (que suelen ser bajos para el corpus actual). El valor exacto de similitud coseno está disponible en el tooltip.

#### Chips de agenda de incidencia

Después de obtener resultados aparece una barra con 4 chips seleccionables (selección múltiple). Son etiquetas de dirección de incidencia — permiten indicar en qué marco político enmarcar la brecha:

- **Gobierno Abierto**
- **DDHH**
- **Cooperación Digital**
- **Gobernanza Cooperativa**

Al hacer clic en "Descargar diagnóstico →" el sistema navega a `/diagnostico` pasando el resultado + chips seleccionados via React Router `state`.

---

### `/diagnostico` — Vista de impresión

Página limpia sin navegación. Solo accesible desde el botón "Descargar diagnóstico →" en `/brechas`.

Muestra:
- Logo Infra.Coop + subtítulo
- La pregunta original (cursiva con borde izquierdo púrpura)
- Score de brecha (número grande) + badge de categoría + scores por agenda
- Chips seleccionados como píldoras púrpuras bajo el título "Agenda de incidencia"
- Lista de datasets encontrados (título + fuente · país · año)
- Lista de normativas encontradas (título + fuente · país)
- Footer con créditos

`window.print()` se dispara automáticamente 600ms después de cargar. El botón "← Volver al motor" se oculta en impresión vía `@media print`.

Si se accede directamente a la URL sin estado de navegación, muestra un mensaje de error con link de vuelta.

---

### `/colectivo` — Monitor Colectivo

Visualiza el estado del corpus completo. Los datos provienen de `useMonitorStats(filtros)` que computa sobre el índice cargado al inicio de la app.

#### Filtros

Panel de 3 selects en pill style encima de las métricas:
- **Agenda**: filtra datasets cuya lista `agendas[]` contenga un match (`/tecnol/i`, `/dato/i`, `/g[eé]nero/i`)
- **País**: filtra por `pais_iso3`
- **Calidad**: filtra por campo `calidad` (Completa / Parcial / Nula)

Los filtros se aplican sobre el `datasetsMap` antes de calcular todas las métricas. El dropdown de País siempre lista todos los países del corpus sin filtrar, para que no desaparezca una opción al filtrar por otro campo. Aparece un botón "Limpiar filtros" cuando hay algún filtro activo.

#### Banda de métricas (MetricsBand)

4 tarjetas:
1. **Total entradas** — datasets + normativas en el corpus filtrado
2. **Agendas activas** — siempre 3
3. **Tópicos críticos** — tópicos con score ≥ 0.65
4. **Cobertura media** — `(1 - mean_gap_score) × 100`

#### Tarjetas de agenda (AgendaCard)

Una por agenda (Tecnológica, Datos, Género). Muestra número de datasets, barra de calidad (Completa/Parcial/Nula), top 3 subtemas frecuentes, y número de preguntas que exploró la agenda.

#### Tarjetas de tópico (TopicCard)

Cinco tópicos predefinidos: `salud-reproductiva`, `violencia-genero`, `justicia-litigios`, `interseccionalidad`, `tecnologias-datos`. El gap score se calcula con Fuse.js sobre una query predefinida por tópico. Score alto = poca cobertura.

---

### `/datos` — ¿Qué datos queremos?

Evolución semanal de las preguntas ingresadas. Datos desde `useEvolucionStats`.

#### RangoSelector

Selects Desde/Hasta con año y semana ISO. Los valores disponibles se derivan de las semanas con preguntas en la base de datos. El gráfico muestra siempre las últimas 24 semanas del rango. Cuando hay más de 16 barras, las etiquetas se muestran cada 4 semanas (siempre mostrando la semana seleccionada para no perder el contexto).

#### Gráfico de barras apiladas

Cada columna = una semana. Segmentos apilados: verde (cubierta, score < 0.35), lila (parcial, 0.35–0.65), púrpura (crítica, ≥ 0.65). Altura proporcional al máximo de preguntas en el rango.

#### Tarjetas de agenda

Compara cobertura inicial del corpus (baseline) vs demanda observada en la semana seleccionada, con mini-barras de porcentaje.

---

### `/ingresar` — Ingresar datos

Formulario público para contribuir datasets o normativas. **No requiere login**.

#### Modos de envío

- **Sin sesión / rol `curadora`**: el formulario va a `formularios_en_revision` / `normativas_en_revision` con `status = 'pendiente'`. Requiere aprobación curatorial.
- **Rol `admin`**: va directamente a `datasets` / `normativas`. Además genera embedding automáticamente si el modelo está listo.

Si el usuario es admin, aparece un botón flotante "Cola de revisión →" en la esquina inferior derecha que navega a `/revisar`.

---

### `/revisar` — Panel curatorial

Solo accesible para `rol = 'admin'`. Lista todos los formularios y normativas pendientes (status ≠ 'rechazado') ordenados por fecha de creación.

- **Rechazar**: actualiza `status = 'rechazado'` y oculta el ítem
- **Aprobar**: copia el registro a su tabla definitiva, elimina de la cola

Durante la acción, los botones del ítem se deshabilitan para evitar doble click.

---

### `/login` — Autenticación

Formulario email + contraseña. Usa `supabase.auth.signInWithPassword`. Al autenticarse carga el perfil desde `profiles`. El estado persiste entre recargas via `onAuthStateChange`.

---

## Base de datos

### Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `datasets` | Corpus de datasets. `embedding vector(768)` para búsqueda semántica. |
| `normativas` | Corpus de marcos normativos. `embedding vector(768)`. |
| `preguntas` | Registro de cada búsqueda (texto, score, datasets encontrados). |
| `formularios_publicados` | Datasets aprobados accesibles en el motor. |
| `formularios_en_revision` | Datasets enviados por la comunidad pendientes de revisión. |
| `normativas_en_revision` | Normativas enviadas pendientes de revisión. |
| `profiles` | Perfiles de usuario: `id`, `email`, `rol` (admin / curadora). |
| `audit_eventos` | Log de eventos (producción). |
| `metricas_snapshot` | Snapshots diarios agregados (producción). |

### Setup Supabase

```bash
# En orden:
psql < db/schema.sql
psql < db/metrics.sql
psql < db/migration-v0.7-auth.sql
psql < db/migration-v0.8-revision-rls.sql

# Generar embeddings del corpus:
npm run embed
```

### Variables de entorno (`.env.local`)

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # solo para npm run embed
VITE_USE_SYNTHETIC_DATA=true       # incluye datos sintéticos en el índice
VITE_REQUIRE_SUPERVISION=true      # fuerza modo revisión en /ingresar
```

---

## Modelo de embeddings

El corpus usa `paraphrase-multilingual-mpnet-base-v2` (768 dimensiones, multilingüe).

- **Offline** (`npm run embed`): procesa todos los registros con `embedding IS NULL` en batches de 10. Guarda el vector en la columna `embedding vector(768)`.
- **Online** (admin en `/ingresar`): el Web Worker del navegador genera el embedding del nuevo registro y lo guarda via `updateEmbedding()`.

---

## Sistema de diseño

Tokens definidos como CSS custom properties en `:root` (`app.css`):

### Tipografías
| Token | Fuente | Uso |
|-------|--------|-----|
| `--serif` | DM Serif Display | Headings, números grandes, citas |
| `--sans` | Instrument Sans | Cuerpo, botones, labels |
| `--mono` | DM Mono | Metadata, etiquetas de datos, código |

### Colores de brecha
| Token | Valor | Uso |
|-------|-------|-----|
| `--gap-crit` | `#534AB7` | Brecha crítica |
| `--gap-part` | `#7F77DD` | Brecha parcial |
| `--gap-cov` | `#1d6e4a` | Dato cubierto |

### Colores de agenda
| Agenda | Color texto | Fondo | Token texto | Token fondo |
|--------|------------|-------|-------------|-------------|
| Tecnológica | `#0C447C` | `#E6F1FB` | `--agenda-tec` | `--agenda-tec-bg` |
| Datos | `#3C3489` | `#EEEDFE` | `--agenda-datos` | `--agenda-datos-bg` |
| Género | `#72243E` | `#FBEAF0` | `--agenda-genero` | `--agenda-genero-bg` |

**Regla**: nunca hardcodear valores hex en componentes — usar siempre los tokens.

---

## Desarrollo local

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build de producción en /dist
npm test           # Vitest (106 tests)
npm run embed      # generar embeddings del corpus
```

---

## Tests

106 tests en 18 archivos. Cubren score, búsqueda, hooks de datos, componentes UI, autenticación y cola de revisión.

```bash
npm test -- --run     # una sola pasada
npm test -- --watch   # modo watch
```

---

## Roles de usuario

| Rol | Acceso |
|-----|--------|
| Sin cuenta | Todas las páginas públicas + `/ingresar` (modo revisión) |
| `curadora` | Igual que sin cuenta + sesión iniciada |
| `admin` | Todo lo anterior + `/revisar` + `/ingresar` modo directo + FAB de cola |

Los admins se crean insertando en `profiles` con `rol = 'admin'` desde el dashboard de Supabase.

---

## Arquitectura de contextos React

```
<AuthProvider>                    ← sesión de usuario global
  <SearchIndexProvider>           ← índice de búsqueda (carga una vez al inicio)
    <EmbedderProvider>            ← Web Worker del modelo ONNX
      <BrowserRouter>
        <Header />
        <Routes>...</Routes>
      </BrowserRouter>
    </EmbedderProvider>
  </SearchIndexProvider>
</AuthProvider>
```

`SearchIndexProvider` carga todos los datasets y normativas de Supabase al montar la app, construye el índice MiniSearch + Fuse.js + Maps de embeddings, y lo expone via `useSearchIndex()`. La búsqueda es instantánea una vez cargado el índice inicial.

`EmbedderProvider` lanza el Web Worker con el modelo ONNX. La primera carga descarga ~330MB desde HuggingFace y los cachea en el navegador. Las búsquedas posteriores son instantáneas.

---
 