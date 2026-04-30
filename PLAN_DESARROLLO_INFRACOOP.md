# Plan de Desarrollo Técnico — Infra.Coop v4 Producción

**Proyecto:** Infra.Coop · Motor de Brechas de Datos Cooperativo
**Fecha:** 2026-04-25
**Estado actual:** Prototipo HTML monolítico (1720 líneas, sin backend, datos mock, scores aleatorios)
**Objetivo:** Sistema funcional con datos reales/sintéticos, búsqueda semántica client-side y persistencia en Supabase

---

## Git Workflow

- Todo el desarrollo ocurre en la rama `dev` del repo existente (`InfraCoopDashboard`).
- Cada Épica genera un PR de `dev` a `main` cuando está estable y probada.
- No se hace push directo a `main`.
- La app React se scaffoldea en la raíz del repo (junto a `db/`, `docs/`, `data/`).

---

## Stack Tecnológico Definido

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Frontend | React + TypeScript | Migración desde HTML monolítico |
| Estilos | CSS Modules / Variables CSS | Preservar design system existente (:root tokens) |
| Base de datos | PostgreSQL vía Supabase | API REST automática, sin backend propio |
| NLP / Búsqueda | Librería JS client-side (por evaluar) | Candidatas: Wink NLP, Semantic Finder, Brain.js |
| Datos sintéticos | Script Python (generación offline) | 700-1000 registros con flag on/off |
| Despliegue | HF Spaces (frontend) + Supabase (BDD) | — |
| Control de versiones | GitHub | Branches, PRs, control colaborativo |

---

## Arquitectura General

```
┌─────────────────────────────────┐
│  HF Spaces (Static React App)  │
│  ┌───────────┐  ┌────────────┐ │
│  │ Motor de  │  │ Monitor    │ │
│  │ Brechas   │  │ Colectivo  │ │
│  ├───────────┤  ├────────────┤ │
│  │ NLP JS    │  │ Charts     │ │
│  │ (client)  │  │ (D3/Rech.) │ │
│  └─────┬─────┘  └─────┬──────┘ │
│        │              │        │
│  ┌─────▼──────────────▼──────┐ │
│  │   Supabase JS Client      │ │
│  └─────────────┬─────────────┘ │
└────────────────┼───────────────┘
                 │ REST API
       ┌─────────▼─────────┐
       │  Supabase          │
       │  ┌───────────────┐ │
       │  │  PostgreSQL    │ │
       │  │  - datasets    │ │
       │  │  - normativas  │ │
       │  │  - preguntas   │ │
       │  │  - formularios │ │
       │  │    _revision   │ │
       │  └───────────────┘ │
       │  Row Level Security│
       └───────────────────┘
```

---

## Épicas y Stories

### ÉPICA 0: Fundación del Proyecto
**Objetivo:** Establecer infraestructura base antes de escribir cualquier funcionalidad.
**Prioridad:** Bloqueante — todo depende de esto.

#### Story 0.1: Configuración del repositorio existente
- **Subtask 0.1.1:** Crear rama `dev` desde `main` en el repo existente `InfraCoopDashboard`. Todo el desarrollo ocurre en `dev`; los merges a `main` se hacen via PR al completar cada Épica.
- **Subtask 0.1.2:** Actualizar `.gitignore` para incluir patrones de Node (`node_modules/`, `dist/`, `.env`).
- **Subtask 0.1.3:** Crear estructura de carpetas React en la raíz del repo (junto a `db/`, `docs/`, `data/`):
  ```
  infracoop/
  ├── src/
  │   ├── components/
  │   ├── pages/
  │   ├── services/        ← Supabase client, NLP service
  │   ├── hooks/
  │   ├── types/
  │   ├── utils/
  │   ├── data/             ← Fixtures, mock data preservada
  │   └── styles/
  │       └── tokens.css    ← Variables CSS del prototipo
  ├── scripts/
  │   ├── seed/             ← Generación de datos sintéticos (Python)
  │   └── import/           ← Importación de .xlsx a Supabase
  ├── db/
  │   ├── schema.sql
  │   └── metrics.sql
  ├── public/
  ├── tests/
  ├── docs/
  │   ├── metodologia.pdf
  │   └── workflows/        ← SVGs de pipeline
  ├── .env.example
  ├── package.json
  ├── tsconfig.json
  └── README.md
  ```
- **Subtask 0.1.4:** Inicializar proyecto React + TypeScript (Vite). Instalar dependencias base: `react`, `react-dom`, `typescript`, `@supabase/supabase-js`.
- **Criterio de aceptación:** `npm run dev` levanta la app sin errores. Estructura de carpetas creada. Repo accesible con permisos colaborativos.

#### Story 0.2: Configuración de Supabase
- **Subtask 0.2.1:** Crear proyecto en Supabase. Obtener URL y `anon key`.
- **Subtask 0.2.2:** Crear archivo `.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Documentar en `.env.example`.
- **Subtask 0.2.3:** Crear cliente Supabase en `src/services/supabase.ts` con inicialización singleton.
- **Subtask 0.2.4:** Verificar conexión con un query de prueba (`SELECT 1`).
- **Criterio de aceptación:** La app puede conectarse a Supabase y ejecutar queries desde el browser.

#### Story 0.3: Migración del design system
- **Subtask 0.3.1:** Extraer todas las variables CSS de `:root` del prototipo a `src/styles/tokens.css`.
- **Subtask 0.3.2:** Extraer las fuentes (DM Serif Display, Instrument Sans, DM Mono) y configurar import en el `index.html` de Vite.
- **Subtask 0.3.3:** Crear componentes base reutilizables: `Button`, `Card`, `Badge`, `Select`, `Toast`, `Modal`. Usar las clases CSS existentes (`.btn-primary`, `.btn-ghost`, `.gap-category-badge`, etc.) como referencia.
- **Subtask 0.3.4:** Verificar que los colores, tipografía y componentes se ven idénticos al prototipo.
- **Criterio de aceptación:** Los componentes UI base renderizan igual que en el prototipo. No hay colores hardcodeados en JS — todo viene de CSS variables.

#### Story 0.4: Migración del layout y navegación
- **Subtask 0.4.1:** Crear componente `Header` con logo Infra.Coop y navegación por tabs (pills).
- **Subtask 0.4.2:** Implementar routing con React Router para las 4 pantallas: Landing, Monitor de Brechas, Monitor Colectivo, ¿Qué datos queremos?
- **Subtask 0.4.3:** Implementar componente `Layout` con container (`max-width: 860px`).
- **Criterio de aceptación:** Se puede navegar entre las 4 pantallas. El header con tabs funciona. Layout responsivo.

**Tests Épica 0:**
- [ ] `npm run dev` levanta sin errores
- [ ] Navegación entre 4 rutas funciona
- [ ] Supabase client se conecta y resuelve un query
- [ ] Componentes base renderizan correctamente con tokens CSS

---

### ÉPICA 1: Base de Datos y Datos Sintéticos
**Objetivo:** Esquema de BDD funcional en Supabase con datos sintéticos para desarrollo y testing.
**Prioridad:** Alta — el motor de brechas y las visualizaciones dependen de datos.

#### Story 1.1: Esquema de base de datos en Supabase
- **Subtask 1.1.1:** Crear tabla `datasets` basada en la estructura real del Excel `infracoop_bd.xlsx` (hoja "Datasets", 42 registros reales: DS-001 a DS-042). Columnas:
  - `id` (PK, text, ej: "DS-001")
  - `titulo` (text, NOT NULL)
  - `fuente_organismo` (text)
  - `pais_iso3` (text, ej: "MEX", "ARG", "REG")
  - `anio_publicacion` (integer)
  - `subtema` (text)
  - `agendas` (text[], array — un dataset puede estar en varias: "Ag. Género", "Ag. Datos", "Ag. Tecnológica")
  - `calidad` (text, enum: "Completa" | "Parcial" | "Nula" — calculada por scoreService)
  - `frecuencia` (text, señal S2)
  - `desagregacion_geo` (text, señal S3)
  - `accesibilidad_formato` (text, señal S4)
  - `url_descarga` (text)
  - `url_valida` (boolean, default true)
  - `descripcion_notas` (text)
  - `es_sintetico` (boolean, default false)
  - `created_at` (timestamptz, default now())
- **Subtask 1.1.2:** Crear tabla `normativas` basada en la hoja "Normativas" (35 registros reales: NM-001 a NM-035). Columnas:
  - `id` (PK, text, ej: "NM-001")
  - `nombre` (text, NOT NULL)
  - `organismo_emisor` (text)
  - `tipo` (text, ej: "Convenio internacional", "Recomendación regional", "ODS / Meta")
  - `pais_alcance` (text, ej: "Internacional", "ALyC")
  - `anio_adopcion` (integer)
  - `articulo_numeral` (text)
  - `obligacion_datos` (text — describe qué datos obliga a producir)
  - `agendas` (text[])
  - `url_texto_oficial` (text)
  - `descripcion_notas` (text)
  - `es_sintetico` (boolean, default false)
  - `created_at` (timestamptz, default now())
- **Subtask 1.1.3:** Crear tabla `preguntas` para historial de consultas de usuarios:
  - `id` (PK, uuid, default gen_random_uuid())
  - `texto` (text, NOT NULL)
  - `fecha` (timestamptz, default now())
  - `agenda_clasificada` (text)
  - `resultado_score` (numeric)
  - `datasets_encontrados` (text[] — IDs de datasets relevantes)
  - `es_sintetico` (boolean, default false)
- **Subtask 1.1.4:** Crear tablas de formularios:
  - `formularios_publicados` — misma estructura que `datasets` + campo `ingresado_por` (text).
  - `formularios_en_revision` — misma estructura + `status` (text: "pendiente" | "aprobado" | "rechazado") + `fecha_revision` (timestamptz).
- **Subtask 1.1.5:** Configurar Row Level Security (RLS) en Supabase:
  - Lectura pública para `datasets`, `normativas`, `preguntas`.
  - Escritura a `formularios_publicados` y `formularios_en_revision` controlada por variable de entorno / rol.
- **Subtask 1.1.6:** Ejecutar el schema en Supabase y verificar que las tablas existen.
- **Criterio de aceptación:** Todas las tablas creadas en Supabase con las columnas exactas del Excel. RLS configurado. INSERT y SELECT funcionan desde el dashboard.

#### Story 1.2: Script de generación de datos sintéticos (Python)
- **Subtask 1.2.1:** Crear `scripts/seed/generate_synthetic.py` que genere datos **con la misma estructura de columnas del Excel real** (ver Story 1.1). Los datos sintéticos deben ser indistinguibles en estructura de los reales, marcados con `es_sintetico = true`. Con 42 datasets + 35 normativas reales, la generación sintética complementa para alcanzar 700-1000 totales:
  - **Datasets sintéticos (~150 registros):** IDs DS-S001 en adelante. Variar:
    - Países: ampliar cobertura a Brasil (BRA), Perú (PER), Uruguay (URY), Bolivia (BOL), Paraguay (PRY) — los datos reales ya cubren MEX (18), ECU (8), ARG (8), REG (4), COL (1), CHL (1).
    - Agendas: mantener distribución realista. Aumentar proporción de Ag. Tecnológica (solo 12/42 reales la tienen).
    - Calidad: incluir datasets Nula (0 en los reales) para testear bloqueos del scoring.
    - Años: llenar huecos temporales 2019-2021.
    - Subtemas nuevos: trabajo no remunerado, cuidados, migración, datos abiertos gubernamentales, trata de personas.
    - Formatos: incluir APIs abiertas, JSON, geojson — más variedad que los reales.
  - **Normativas sintéticas (~15 registros):** NM-S001 en adelante. Los 35 reales ya dan buena cobertura. Agregar normativas nacionales de países sin cobertura (BRA, PER, URY).
  - **Preguntas sintéticas (~500 registros):** Texto libre en español simulando consultas reales. **Distribuidas en rangos temporales**: 2024-W01 a 2026-W16, con tendencia creciente. Incluir preguntas sobre los 5 vacíos críticos identificados en la Metodología (V-01 a V-05) para que el motor de brechas demuestre su capacidad de detectarlos.
- **Subtask 1.2.2:** Implementar flag de control:
  - CLI: `python generate_synthetic.py --mode synthetic|real|both`
  - App React: `VITE_USE_SYNTHETIC_DATA=true|false` — cuando `false`, el servicio de datos filtra por `es_sintetico = false` (solo los 42+35 reales).
- **Subtask 1.2.3:** Generar output en formato SQL (INSERT statements) compatible con Supabase, y JSON como respaldo.
- **Subtask 1.2.4:** Documentar el script en `scripts/seed/README.md`.
- **Criterio de aceptación:** Script genera ~665 registros sintéticos (150 datasets + 15 normativas + 500 preguntas). Total con reales: ~742 registros. El flag on/off filtra correctamente.

#### Story 1.3: Importación del Excel real (`infracoop_bd.xlsx`)

**Nota:** En `data/` coexisten dos archivos Excel:
- `infracoop_bd.xlsx` — archivo principal de seed (42 datasets + 35 normativas). **Este es el que importa el script.**
- `datasets-normativas.xlsx` — versión anterior, conservada como referencia. No importar.

- **Subtask 1.3.1:** Crear `scripts/import/import_xlsx.py` que lea las 3 hojas del Excel:
  - **Hoja "Datasets"** (42 registros reales, DS-001 a DS-042): Mapear cada columna del Excel a la tabla `datasets` en Supabase. Columna "Agendas" se parsea como array (separador: " · "). Nota: la columna "Metadatos" fue removida en v0.4, la calidad se calcula con las señales S2-S4 presentes + verificación de fuente/metodología.
  - **Hoja "Normativas"** (35 registros reales, NM-001 a NM-035): Mapear a tabla `normativas`. Columna "Agendas" se parsea como array. Nota: la columna se renombró a "Artículo" (sin "Numeral").
  - **Hoja "Metodología"**: No se importa como datos — contiene reglas de scoring, definición de vacíos críticos y créditos. Guardar como documentación.
- **Subtask 1.3.2:** Validar URLs de los 42 datasets (HTTP HEAD request). Marcar `url_valida = true/false`. Casos conocidos problemáticos:
  - PDF (no legible por máquina): DS-006, DS-029.
  - Power BI / visualizador web (no descargable): DS-012, DS-030, DS-031.
  - Formatos especiales: DS-021, DS-022, DS-023 (DBF).
  - Dataset discontinuado: DS-035 (Línea 144, julio 2023).
- **Subtask 1.3.3:** Marcar todos los registros del Excel como `es_sintetico = false`.
- **Subtask 1.3.4:** Generar log de importación con estado de cada registro.
- **Criterio de aceptación:** Los 42 datasets y 35 normativas reales están en Supabase con `es_sintetico = false`. Log de importación generado. URLs validadas.

#### Story 1.4: Servicio de datos en el frontend
- **Subtask 1.4.1:** Crear `src/services/dataService.ts` con funciones:
  - `getDatasets(filters?)` — query con filtros opcionales por agenda, país, calidad.
  - `getNormativas(filters?)` — query con filtros.
  - `getPreguntas(rango_temporal?)` — historial de preguntas.
  - `insertPregunta(texto)` — guardar pregunta del usuario.
  - `submitFormulario(data, modo: 'directo' | 'revision')` — insertar en `formularios_publicados` o `formularios_en_revision` según la variable de entorno / configuración.
- **Subtask 1.4.2:** Implementar lógica de modo de inserción:
  - **Modo directo:** INSERT a `formularios_publicados` con control de calidad básico (campos requeridos no vacíos).
  - **Modo revisión:** INSERT a `formularios_en_revision` con status `pendiente`.
- **Subtask 1.4.3:** Crear hook `useDatasets()`, `useNormativas()`, `usePreguntas()` con loading states y error handling.
- **Criterio de aceptación:** Desde la app se puede leer datasets, normativas, preguntas. Se pueden insertar formularios en ambos modos. Loading y error states funcionan.

**Tests Épica 1:**
- [ ] Query a `datasets` devuelve registros (sintéticos o reales)
- [ ] Insertar una pregunta la persiste en Supabase
- [ ] Flag `VITE_USE_SYNTHETIC_DATA` controla qué datos se muestran
- [ ] `submitFormulario` en modo `revision` inserta en `formularios_en_revision`
- [ ] `submitFormulario` en modo `directo` inserta en `formularios_publicados`

---

### ÉPICA 2: Motor de Brechas (Búsqueda + Score)
**Objetivo:** Reemplazar la simulación actual (matchQuery + setTimeout + Math.random) por un motor funcional con búsqueda semántica client-side y cálculo de score determinista.
**Prioridad:** Máxima — es el core del producto.

#### Story 2.2: Implementación del servicio de búsqueda

**Librería seleccionada (decisión fija, no re-evaluar):**
- **MiniSearch** — full-text search client-side, ~7KB, soporte nativo de español, ponderación de campos. Indexa `titulo`, `descripcion_notas`, `subtema`, `obligacion_datos`.
- **Fuse.js** — fuzzy search como fallback para queries cortas (< 3 palabras) o con errores ortográficos.

- **Subtask 2.2.1:** Instalar `minisearch` y `fuse.js`. Crear `src/services/searchService.ts` que:
  1. Al cargar la app, construya un índice MiniSearch con los datasets y normativas de Supabase.
  2. Reciba una pregunta del usuario y devuelva los datasets y normativas más relevantes rankeados por score de similitud.
  3. Use Fuse.js como fallback si la query tiene menos de 3 palabras o MiniSearch devuelve 0 resultados.
- **Subtask 2.2.2:** Implementar pre-procesamiento de la consulta del usuario:
  - Limpieza básica (trim, lowercase, remover caracteres especiales).
  - Manejo de consultas muy cortas (< 3 palabras): activar Fuse.js y sugerir al usuario que amplíe.
  - Manejo de texto en mayúsculas.
- **Subtask 2.2.3:** Conectar los filtros (Agenda, País, Calidad) como filtros post-búsqueda sobre los resultados de MiniSearch.
- **Subtask 2.2.4:** Reemplazar `buscarBrecha()` → `searchService.search(pregunta, filtros)`.
- **Subtask 2.2.5:** Benchmark de aceptación: 5 queries de prueba contra datos reales deben devolver resultados relevantes (verificación manual).
- **Criterio de aceptación:** Una pregunta como "datos de feminicidio por estado" devuelve datasets y normativas relevantes sobre feminicidio, no resultados aleatorios. Los filtros reducen los resultados correctamente. Fuse.js activa correctamente para queries cortas.

#### Story 2.3: Diseño e implementación de la fórmula de score de brechas
- **Subtask 2.3.1:** La hoja "Metodología" del Excel define la fórmula base:
  ```
  score_brecha = (1 - similitud_dataset) × 0.6 + cobertura_normativa × 0.4
  ```
  Donde:
  - **`similitud_dataset`** (peso 60%): qué tan bien responden los datasets existentes a la pregunta del usuario. Viene del servicio de búsqueda semántica (Story 2.2). Valor entre 0 y 1.
  - **`cobertura_normativa`** (peso 40%): qué tan cubierto está el tema por marcos normativos. Si hay normativas que obligan a producir datos sobre el tema pero no hay datasets, la brecha sube.
  
  Clasificación (ya definida en el Excel):
  - **Brecha Crítica:** score ≥ 0.70 — dato ausente o insuficiente frente a normativa
  - **Brecha Parcial:** score 0.40–0.69 — dato existe con limitaciones
  - **Brecha Cubierta:** score < 0.40 — dato disponible y de calidad aceptable
- **Subtask 2.3.2:** Implementar `calcularScoreBrecha()` en `src/services/scoreService.ts` que:
  1. Reciba los datasets encontrados por la búsqueda semántica con su score de similitud.
  2. Reciba las normativas relacionadas con la pregunta.
  3. Calcule `similitud_dataset` como el mejor match de similitud entre la pregunta y los datasets.
  4. Calcule `cobertura_normativa` como proporción de normativas que exigen datos sobre el tema vs datasets que los cubren.
  5. Aplique la fórmula: `(1 - similitud) * 0.6 + cobertura_norm * 0.4`.
  6. Devuelva score (0-1) y clasificación (Crítica/Parcial/Cubierta).
- **Subtask 2.3.3:** Calcular scores por agenda (Tecnológica, Datos, Género) filtrando datasets y normativas por agenda. Determinista — eliminar todo `Math.random()`.
- **Subtask 2.3.4:** Portar `calcularCalidadAuto()` del prototipo a TypeScript. Preservar la lógica de las 4 señales ponderadas definidas en la hoja "Metodología":
  - S1: Metadatos (20%) — fuente identificada + metodología documentada.
  - S2: Frecuencia (30%) — >3 años = Nula (bloquea), >2 años = Parcial, <2 años = OK.
  - S3: Desagregación geográfica (30%) — municipio=100%, solo nacional=30%, sin info=0%.
  - S4: Accesibilidad (20%) — API>CSV>XLSX>PDF. URL activa + formato legible=100%, PDF=25%, sin descarga=10%.
  
  Clasificación de calidad:
  - Completa: score ≥ 0.70 + frecuencia ≤ 2 años + desagregación + formato legible.
  - Parcial: score 0.35-0.69, o alguna condición no cumplida.
  - Nula: score < 0.35, o dato inexistente, o >3 años (bloqueo automático).
- **Subtask 2.3.5:** Tests unitarios para ambas funciones con datos del Excel real como fixtures.
- **Criterio de aceptación:** Misma pregunta → mismo score siempre. Scores por agenda calculados con la fórmula del Excel, no aleatorios. `calcularCalidadAuto()` produce las mismas clasificaciones que las del Excel (verificar contra DS-001 a DS-015). Tests unitarios pasan.

#### Story 2.4: UI del Motor de Brechas
- **Subtask 2.4.1:** Crear página `MonitorBrechas` con:
  - Hero section (preservar texto y tipografía del prototipo).
  - Textarea de pregunta con contador de caracteres.
  - Filtros funcionales: Agenda, País, Calidad (3 `<select>`).
  - Botón "Buscar brecha".
- **Subtask 2.4.2:** Crear componente `GapScoreCard` que muestre:
  - Círculo de score con color por categoría (crítica/parcial/cubierta).
  - Título y síntesis del resultado.
  - Scores por agenda (3 barras).
  - Metadatos (modelo, fecha, datasets encontrados).
- **Subtask 2.4.3:** Crear componente `DatasetList` para mostrar los datasets encontrados con su calidad.
- **Subtask 2.4.4:** Crear componente `NormativaList` para mostrar marcos normativos relacionados.
- **Subtask 2.4.5:** Implementar loading state real (sin setTimeout falso). Mostrar steps del proceso: "Buscando en datasets..." → "Calculando score..." → "Resultado".
- **Subtask 2.4.6:** Guardar la pregunta del usuario en la tabla `preguntas` de Supabase al buscar.
- **Criterio de aceptación:** El flujo completo funciona: usuario escribe pregunta → filtros opcionales → buscar → resultados reales con score determinista → pregunta guardada en BDD.

**Tests Épica 2:**
- [ ] MiniSearch indexa correctamente datasets y normativas al cargar la app
- [ ] Búsqueda de "feminicidio" devuelve datasets relevantes sobre feminicidio
- [ ] Fuse.js activa como fallback para queries de 1-2 palabras
- [ ] Score es determinista: misma pregunta + mismos datos = mismo score
- [ ] Filtro de Agenda = "Género" excluye datasets de otras agendas
- [ ] Pregunta guardada en tabla `preguntas` después de cada búsqueda
- [ ] Loading state muestra progreso real
- [ ] `calcularCalidadAuto()` clasifica un dataset con >3 años como "Nula"

---

### ÉPICA 3: Monitor Colectivo (Visualizaciones)
**Objetivo:** Reemplazar datos estáticos (MAPA_MOCK, AGENDA_MONITOR_MOCK, EVOLUCION_MOCK) por visualizaciones conectadas a datos reales de Supabase.
**Prioridad:** Alta — segunda pantalla en importancia.

#### Story 3.1: Visualización de brechas por agenda
- **Subtask 3.1.1:** Crear componente `AgendaMonitor` que consulte Supabase y muestre para cada agenda (Tecnológica, Datos, Género):
  - Score agregado de brecha (calculado con `scoreService`).
  - Cantidad de datasets existentes vs requeridos por normativa.
  - Cantidad de preguntas recientes (últimas 4 semanas).
- **Subtask 3.1.2:** Usar la librería de charts seleccionada (Recharts o D3) para barras/donuts por agenda.
- **Subtask 3.1.3:** Los datos deben actualizarse cuando el usuario cambia filtros (si los filtros aplican aquí).
- **Criterio de aceptación:** Los números cambian cuando se agregan datasets o preguntas. No hay "+8 preguntas esta semana" hardcodeado.

#### Story 3.2: Visualización de evolución temporal
- **Subtask 3.2.1:** Crear componente `EvolucionSemanal` que consulte la tabla `preguntas` agrupada por semana y muestre:
  - Gráfico de barras o líneas con evolución de preguntas por semana.
  - Evolución de brechas críticas por semana (recalculadas con datos de esa semana).
- **Subtask 3.2.2:** Usar datos sintéticos con distribución temporal realista (Story 1.2) para que el gráfico no esté vacío.
- **Criterio de aceptación:** El gráfico refleja datos reales de la tabla `preguntas`. Nuevas preguntas afectan la visualización.

#### Story 3.3: Mapa / distribución geográfica
- **Subtask 3.3.1:** Evaluar si el mapa es necesario para el MVP o si basta con una tabla/gráfico de distribución por país/región. (El MAPA_MOCK del prototipo es estático.)
- **Subtask 3.3.2:** Si se implementa: usar SVG o librería ligera (no Leaflet/Mapbox para mantener bundle bajo). Mostrar distribución de datasets por país.
- **Subtask 3.3.3:** Si no se implementa mapa: tabla de distribución geográfica con barras horizontales.
- **Criterio de aceptación:** Se visualiza la distribución geográfica de los datos, conectada a Supabase.

#### Story 3.4: Incidencia y marcos normativos
- **Subtask 3.4.1:** Preservar `INCIDENCIA_CONFIG` (los 4 tipos: OGP, DDHH, Digital, Cooperativa) como datos en Supabase o como constantes en el frontend.
- **Subtask 3.4.2:** Crear componente que muestre los marcos normativos relacionados con las brechas identificadas.
- **Criterio de aceptación:** Los tipos de incidencia se muestran correctamente y están conectados a normativas reales.

**Tests Épica 3:**
- [ ] `AgendaMonitor` muestra scores calculados, no hardcodeados
- [ ] `EvolucionSemanal` refleja preguntas insertadas en las últimas semanas
- [ ] Distribución geográfica muestra datos de Supabase
- [ ] Insertar un dataset nuevo cambia los números del monitor

---

### ÉPICA 4: Pantalla "¿Qué datos queremos?"
**Objetivo:** Visualizar los datos faltantes basados en la argumentación de gobernanza y calidad.
**Prioridad:** Media — depende de Épicas 1-3.

#### Story 4.1: Interfaz de datos faltantes
- **Subtask 4.1.1:** Crear página `DatosQueremos` que muestre:
  - Datos que más preguntan las personas (top N por frecuencia de la tabla `preguntas`).
  - Datos que no están cubiertos por ningún dataset.
  - Datos que existen pero con calidad baja (parcial/nula).
- **Subtask 4.1.2:** Remover visualizaciones de "análisis interno" (como número de preguntas ingresadas) — según indicado en requerimientos, estas no van aquí.
- **Subtask 4.1.3:** Enfocar las visualizaciones en brechas por agenda, no en preguntas por semana.
- **Criterio de aceptación:** La pantalla comunica qué datos faltan y por qué importan, no cuántas preguntas se hicieron.

#### Story 4.2: Tooltips de calidad de datos
- **Subtask 4.2.1:** Implementar la "cajita" de ¿Qué es un dato abierto? con link a CEPAL (requerimiento 4.5).
- **Subtask 4.2.2:** Agregar pop-up/nota orientadora sobre el formato de preguntas aceptadas (del doc de reunión).
- **Criterio de aceptación:** Elementos informativos visibles y con contenido correcto.

**Tests Épica 4:**
- [ ] Top de preguntas frecuentes se calcula desde `preguntas` en Supabase
- [ ] No se muestran métricas de análisis interno
- [ ] Tooltip de datos abiertos funciona con link a CEPAL

---

### ÉPICA 5: Landing y About
**Objetivo:** Página informativa funcional.
**Prioridad:** Baja — última en implementar.

#### Story 5.1: Página "¿Qué es Infra.Coop?"
- **Subtask 5.1.1:** Crear página `Landing` con descripción del proyecto, enfoque de datos cooperativos, y secciones de Monitor de Brechas y Monitor Colectivo.
- **Subtask 5.1.2:** Navegación clara a los otros módulos.
- **Subtask 5.1.3:** Quitar la funcionalidad de "editar" texto del About (era del prototipo, se perdía al recargar, no tiene valor).
- **Criterio de aceptación:** Página informativa completa. Navegación funciona.

---

### ÉPICA 6: Gestión de Formularios de Datos
**Objetivo:** Permitir ingreso de datos nuevos con dos modos: directo y en cola de revisión.
**Prioridad:** Media.

#### Story 6.1: Formulario de ingreso de datos
- **Subtask 6.1.1:** Crear componente `FormularioDatos` con campos para un nuevo dataset (título, fuente, URL, agenda, país, descripción, etc.).
- **Subtask 6.1.2:** Validación de campos requeridos (no vacíos, URL con formato válido).
- **Subtask 6.1.3:** Implementar clasificación de calidad automática (`calcularCalidadAuto()` portada en Story 2.3.5) al ingresar un dataset.
- **Criterio de aceptación:** Formulario funcional con validación.

#### Story 6.2: Dos modos de inserción
- **Subtask 6.2.1:** Variable de entorno `VITE_FORM_MODE=direct|review` que controla el comportamiento del formulario.
  - `direct`: INSERT a `formularios_publicados` → inmediatamente disponible.
  - `review`: INSERT a `formularios_en_revision` → status `pendiente`, no visible hasta aprobación.
- **Subtask 6.2.2:** Para modo `review`: crear vista simple de cola de revisión (lista de entradas pendientes con botón "Aprobar" que mueve el registro a `formularios_publicados`).
- **Subtask 6.2.3:** No se implementa flujo de 3 revisores — simplificado a aprobación simple.
- **Criterio de aceptación:** Ambos modos funcionan. Switching via variable de entorno. Cola de revisión lista para uso interno.

**Tests Épica 6:**
- [ ] Formulario rechaza campos vacíos
- [ ] Modo `direct` inserta en `formularios_publicados`
- [ ] Modo `review` inserta en `formularios_en_revision`
- [ ] Aprobar un formulario en revisión lo mueve a publicados

---

### ÉPICA 7: Exportación y Reportes
**Objetivo:** Funcionalidad real de exportación (reemplazar el window.print actual).
**Prioridad:** Baja.

#### Story 7.1: Exportar resultados como PDF
- **Subtask 7.1.1:** Integrar librería client-side para generación de PDF (jsPDF + html2canvas, o react-pdf).
- **Subtask 7.1.2:** Botón "Descargar PDF" en la tarjeta de resultados del Motor de Brechas que genere un PDF real con score, datasets encontrados y normativas.
- **Subtask 7.1.3:** Eliminar `capturarYDescargar()` y `window.open() + print()` del código.
- **Criterio de aceptación:** Click en "Descargar PDF" descarga un archivo .pdf real. No abre ventana de impresión.

#### Story 7.2: Exportar brecha como JSON
- **Subtask 7.2.1:** Reemplazar el stub `exportarBrecha()` por una función real que genere un JSON descargable con los datos de la brecha (score, datasets, normativas, pregunta).
- **Criterio de aceptación:** Click descarga un archivo .json con datos reales.

**Tests Épica 7:**
- [ ] PDF generado contiene el score y los datasets del resultado actual
- [ ] JSON exportado es válido y parseable

---

### ÉPICA 8: Calidad, Seguridad y Documentación
**Objetivo:** Hardening del sistema para uso real.
**Prioridad:** Continua — se trabaja en paralelo.

#### Story 8.1: Sanitización de inputs
- **Subtask 8.1.1:** Crear función `escapeHTML()` en `src/utils/sanitize.ts`.
- **Subtask 8.1.2:** Reemplazar todo uso de `innerHTML` por `textContent` o componentes React (que escapean automáticamente).
- **Subtask 8.1.3:** Sanitizar input del textarea de preguntas antes de enviarlo a búsqueda y a Supabase.
- **Criterio de aceptación:** No hay vectores XSS. Ningún dato de usuario se inyecta como HTML sin sanitizar.

#### Story 8.2: Manejo de errores
- **Subtask 8.2.1:** Implementar error boundaries de React para cada página.
- **Subtask 8.2.2:** `try/catch` en todas las llamadas a Supabase con mensajes de error claros al usuario.
- **Subtask 8.2.3:** Fallback visual cuando Supabase no está disponible.
- **Criterio de aceptación:** La app nunca se congela silenciosamente. Errores de red muestran mensaje al usuario.

#### Story 8.3: Accesibilidad básica
- **Subtask 8.3.1:** Agregar `aria-label` a todos los botones de icono.
- **Subtask 8.3.2:** Agregar `role` y `aria` attributes a componentes interactivos.
- **Subtask 8.3.3:** Trampa de foco en modales.
- **Criterio de aceptación:** Navegación por teclado funcional. Lectores de pantalla pueden identificar elementos interactivos.

#### Story 8.4: README y documentación técnica
- **Subtask 8.4.1:** README completo con: descripción, instrucciones de instalación, requisitos, features, estructura, instrucciones de pruebas.
- **Subtask 8.4.2:** Documentar variables de entorno necesarias.
- **Subtask 8.4.3:** Documentar cómo ejecutar scripts de seed y importación.
- **Subtask 8.4.4:** Documentar la fórmula del score de brechas.
- **Criterio de aceptación:** Un desarrollador nuevo puede clonar el repo, configurar el entorno, y correr la app siguiendo solo el README.

#### Story 8.5: Despliegue en HF Spaces
- **Subtask 8.5.1:** Configurar build de producción con Vite (`npm run build`).
- **Subtask 8.5.2:** Crear Space en Hugging Face con tipo "static".
- **Subtask 8.5.3:** Configurar variables de entorno de Supabase en HF Spaces.
- **Subtask 8.5.4:** Verificar que la app funciona en producción.
- **Criterio de aceptación:** App accesible via URL de HF Spaces. Todas las funcionalidades operativas.

---

## Orden de Ejecución Sugerido

```
Fase 1 — Cimientos (Épica 0 + 1)
├── Story 0.1: Repo + estructura
├── Story 0.2: Supabase
├── Story 0.3: Design system
├── Story 0.4: Layout + navegación
├── Story 1.1: Schema BDD
├── Story 1.2: Datos sintéticos
├── Story 1.3: Importar .xlsx
└── Story 1.4: Servicio de datos

Fase 2 — Core (Épica 2)
├── Story 2.1: Evaluar librería NLP  ← INVESTIGACIÓN
├── Story 2.2: Servicio de búsqueda
├── Story 2.3: Fórmula de score     ← DISEÑO TÉCNICO
└── Story 2.4: UI Motor de Brechas

Fase 3 — Visualizaciones (Épica 3 + 4)
├── Story 3.1: Brechas por agenda
├── Story 3.2: Evolución temporal
├── Story 3.3: Distribución geográfica
├── Story 3.4: Incidencia
├── Story 4.1: Datos faltantes
└── Story 4.2: Tooltips

Fase 4 — Complementos (Épica 5 + 6 + 7)
├── Story 5.1: Landing
├── Story 6.1: Formulario
├── Story 6.2: Modos de inserción
├── Story 7.1: PDF
└── Story 7.2: JSON export

Fase 8 — Continuo (Épica 8)
├── Story 8.1-8.3: Seguridad + accesibilidad (en paralelo)
├── Story 8.4: Documentación (al final)
└── Story 8.5: Despliegue (al final)
```

---

## Elementos Preservados del Prototipo

Estos elementos del código actual **deben portarse** sin cambios funcionales:

| Elemento | Archivo destino | Notas |
|----------|----------------|-------|
| Variables CSS `:root` | `src/styles/tokens.css` | Base del design system |
| `calcularCalidadAuto()` | `src/services/qualityService.ts` | Lógica de 4 señales ponderadas |
| `INCIDENCIA_CONFIG` | `src/data/incidencia.ts` o tabla en Supabase | 4 tipos de incidencia con marcos normativos |
| `DATOS_MOCK` (5 escenarios) | `src/data/fixtures.ts` | Convertir en fixtures de testing |
| Schema SQL | `db/schema.sql` | Adaptar a Supabase |
| Flujo cooperativo de revisión (simplificado) | `src/components/FormularioRevision.tsx` | Sin 3 revisores, solo cola simple |

## Elementos Eliminados

| Elemento | Razón |
|----------|-------|
| `setTimeout(r, 2600)` en búsqueda | Latencia simulada — reemplazar por loading real |
| `Math.random()` en scores | Scores deben ser deterministas |
| `window.open() + print()` | Reemplazar por jsPDF real |
| `prompt()` nativo | Reemplazar por modal propio |
| `exportarBrecha()` stub | Implementar exportación real |
| Texto "gpt-4o-mini" hardcodeado | Remover referencia al modelo |
| `display:none` en nota de auditoría | Decidir si se muestra o se elimina |
| Edición inline del About | No persiste, no tiene valor |

---

## Notas para el Desarrollo con Claude Code

- Trabajar por sesiones: completar un grupo de stories → guardar progreso → revisar → siguiente grupo.
- Limitar a 3 scripts/tareas por sesión para JD.
- Generar tests para cada módulo importante (TDD donde sea razonable).
- Guardar archivo de memoria con progreso al final de cada sesión.

---

## ANEXO A: Datos Reales del Excel (`infracoop_bd.xlsx` v0.4)

### Inventario de datos existentes

| Hoja | Registros | IDs | Contenido |
|------|-----------|-----|-----------|
| Datasets | 42 | DS-001 a DS-042 | Datasets sobre tecnología, género y violencias — MEX, ECU, ARG, REG |
| Normativas | 35 | NM-001 a NM-035 | Marcos normativos internacionales, regionales y nacionales (MEX, ECU, ARG) |
| Metodología | — | — | Reglas de scoring, vacíos críticos, créditos |

### Mapeo de columnas Excel → Tabla Supabase (`datasets`)

| Columna Excel | Campo Supabase | Tipo | Notas |
|--------------|----------------|------|-------|
| ID | `id` | text PK | DS-001 formato |
| Título del dataset | `titulo` | text | NOT NULL |
| Fuente / Organismo | `fuente_organismo` | text | INEGI, INEC, INDEC, CEPAL, etc. |
| País (ISO 3) | `pais_iso3` | text | MEX, ECU, ARG, COL, CHL, REG |
| Año publicación | `anio_publicacion` | integer | 2019-2025 |
| Subtema | `subtema` | text | Texto libre, separado por " · " |
| Agendas | `agendas` | text[] | Parsear por " · " → array |
| Frecuencia | `frecuencia` | text | Señal S2 |
| Desagregación geog. | `desagregacion_geo` | text | Señal S3 |
| Accesibilidad / Formato | `accesibilidad_formato` | text | Señal S4 |
| URL de descarga | `url_descarga` | text | Validar con HTTP HEAD |
| Descripción / Notas | `descripcion_notas` | text | Texto largo |

**Nota v0.4:** La columna "Metadatos" (S1) y "Calidad" fueron removidas de la hoja Datasets. La calidad se calcula dinámicamente con `calcularCalidadAuto()` usando S2-S4 + verificación de fuente.

### Mapeo de columnas Excel → Tabla Supabase (`normativas`)

| Columna Excel | Campo Supabase | Tipo | Notas |
|--------------|----------------|------|-------|
| ID | `id` | text PK | NM-001 formato |
| Nombre de la norma | `nombre` | text | NOT NULL |
| Organismo emisor | `organismo_emisor` | text | ONU, OEA/CIM, CEPAL, Congresos nacionales |
| Tipo | `tipo` | text | Convenio, Ley, ODS, Resolución, Plan, etc. |
| País / Alcance | `pais_alcance` | text | Internacional, ALyC, México, Ecuador, Argentina |
| Año adopción | `anio_adopcion` | integer | 1979-2025 |
| Artículo | `articulo_numeral` | text | Referencias específicas |
| Obligación sobre datos | `obligacion_datos` | text | Qué datos obliga a producir |
| Agendas | `agendas` | text[] | Parsear por " · " → array |
| URL texto oficial | `url_texto_oficial` | text | — |
| Descripción / Notas | `descripcion_notas` | text | Texto largo |

### Distribución de los datos reales

**Datasets por país (42 total):**
- MEX: 18 (DS-001–007, 010, 013, 015–026)
- ECU: 8 (DS-027–034)
- ARG: 8 (DS-008, 035–042)
- REG (regional): 4 (DS-003, 006, 011, 014)
- COL: 1 (DS-012)
- CHL: 1 (DS-009)

**Normativas por alcance (35 total):**
- Internacional: 14 (NM-001, 003, 006, 008–011, 013–015, 028–030, 033–035)
- ALyC (regional): 7 (NM-002, 004, 005, 007, 012, 031, 032)
- México: 4 (NM-016–019)
- Ecuador: 4 (NM-020–023)
- Argentina: 6 (NM-024–027, y parte de NM-028)

**Datasets por agenda (muchos-a-muchos):**
- Ag. Género: 42/42 (todos)
- Ag. Datos: 41/42 (todos menos DS-006)
- Ag. Tecnológica: 12/42 (DS-003, 011, 015, 021, 024, 026, 033, 034, 037, 039, 040, 041)

**Ejes temáticos nuevos (v0.4):**
- Violencia digital: DS-001 (ENDIREH módulo digital), DS-037 (grooming ARG), DS-039 (CABA)
- Brecha digital de género: DS-021 (ENDUTIH MEX), DS-033 (TIC ECU), DS-040 (ENUT ARG)
- Mujeres en STEM/CyT: DS-026 (SNI MEX), DS-034 (SENESCYT ECU), DS-041 (MINCyT ARG)

### Vacíos Críticos Documentados (de la hoja Metodología)

| ID | Vacío | Países |
|----|-------|--------|
| V-01 | Violencia digital sin datos abiertos gubernamentales | MEX · ECU · ARG |
| V-02 | Ecuador sin encuesta de violencia actualizada (ENVIGMU 2019, 6+ años) | ECU |
| V-03 | Línea 144 Argentina discontinuada (julio 2023, disolución MMGyD) | ARG |
| V-04 | IA sin regulación con perspectiva de género (ningún país tiene ley de IA) | MEX · ECU · ARG |
| V-05 | Brecha digital sin desagregación subnacional completa | ECU · ARG |

### Fórmula de Score (de la hoja Metodología — sin cambios desde v0.3)

```
score_brecha = (1 - similitud_dataset) × 0.6 + cobertura_normativa × 0.4

Clasificación:
  Crítica:  score ≥ 0.70
  Parcial:  score 0.40–0.69
  Cubierta: score < 0.40
```

### Señales de Calidad (de la hoja Metodología — sin cambios)

```
Score calidad = S1×0.20 + S2×0.30 + S3×0.30 + S4×0.20

S1 Metadatos (20%):  Fuente + metodología documentada
S2 Frecuencia (30%): >3 años = Nula (bloquea) | >2 años = Parcial | <2 años = OK
S3 Desagregación (30%): Municipio=100% | Nacional=30% | Sin info=0%
S4 Accesibilidad (20%): API/CSV=100% | PDF=25% | Sin descarga=10%

Clasificación:
  Completa: score ≥ 0.70 + frecuencia ≤2 años + desagregación + formato legible
  Parcial:  score 0.35–0.69 o alguna condición no cumplida
  Nula:     score < 0.35 o >3 años (bloqueo automático)
```
