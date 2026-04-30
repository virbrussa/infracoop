-- ============================================================
--  Infra.Coop · Motor de Brechas · Esquema PostgreSQL (Supabase)
--  Data Cooperativas Latinas / Mozilla Fellowship 2024-2026
--  v0.5 — búsqueda client-side (sin pgvector)
-- ============================================================

-- ============================================================
--  GRUPO 1: DATOS PRINCIPALES
-- ============================================================

-- Tabla: datasets
-- 42 registros reales (DS-001 a DS-042) + sintéticos (DS-S001+)
-- Calidad calculada dinámicamente con calcularCalidadAuto() (señales S2-S4)

CREATE TABLE IF NOT EXISTS datasets (
    id                    TEXT        PRIMARY KEY,           -- ej: "DS-001", "DS-S001"
    titulo                TEXT        NOT NULL,
    fuente_organismo      TEXT,                              -- INEGI, INEC, INDEC, CEPAL, etc.
    pais_iso3             TEXT,                              -- MEX, ECU, ARG, COL, CHL, REG
    anio_publicacion      INTEGER,
    subtema               TEXT,
    agendas               TEXT[],                            -- ["Ag. Género", "Ag. Datos", "Ag. Tecnológica"]
    calidad               TEXT,                              -- "Completa" | "Parcial" | "Nula" (calculada)
    frecuencia            TEXT,                              -- señal S2
    desagregacion_geo     TEXT,                              -- señal S3
    accesibilidad_formato TEXT,                              -- señal S4
    url_descarga          TEXT,
    url_valida            BOOLEAN     DEFAULT TRUE,
    descripcion_notas     TEXT,
    es_sintetico          BOOLEAN     DEFAULT FALSE,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_datasets_pais     ON datasets (pais_iso3);
CREATE INDEX IF NOT EXISTS idx_datasets_calidad  ON datasets (calidad);
CREATE INDEX IF NOT EXISTS idx_datasets_sintetico ON datasets (es_sintetico);


-- Tabla: normativas
-- 35 registros reales (NM-001 a NM-035) + sintéticos (NM-S001+)

CREATE TABLE IF NOT EXISTS normativas (
    id                TEXT        PRIMARY KEY,               -- ej: "NM-001", "NM-S001"
    nombre            TEXT        NOT NULL,
    organismo_emisor  TEXT,                                  -- ONU, OEA/CIM, CEPAL, Congresos nacionales
    tipo              TEXT,                                  -- Convenio, Ley, ODS, Resolución, Plan, etc.
    pais_alcance      TEXT,                                  -- Internacional, ALyC, México, Ecuador, Argentina
    anio_adopcion     INTEGER,
    articulo_numeral  TEXT,
    obligacion_datos  TEXT,                                  -- qué datos obliga a producir
    agendas           TEXT[],
    url_texto_oficial TEXT,
    descripcion_notas TEXT,
    es_sintetico      BOOLEAN     DEFAULT FALSE,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_normativas_pais      ON normativas (pais_alcance);
CREATE INDEX IF NOT EXISTS idx_normativas_sintetico ON normativas (es_sintetico);


-- ============================================================
--  GRUPO 2: HISTORIAL DE USO
-- ============================================================

-- Tabla: preguntas
-- Log de consultas de usuarias al motor de brechas

CREATE TABLE IF NOT EXISTS preguntas (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    texto                TEXT        NOT NULL,
    fecha                TIMESTAMPTZ DEFAULT NOW(),
    agenda_clasificada   TEXT,                               -- agenda inferida de la pregunta
    resultado_score      NUMERIC,                            -- score de brecha calculado (0-1)
    datasets_encontrados TEXT[],                             -- IDs de datasets relevantes
    es_sintetico         BOOLEAN     DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_preguntas_fecha     ON preguntas (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_preguntas_sintetico ON preguntas (es_sintetico);


-- ============================================================
--  GRUPO 3: FORMULARIOS DE INGRESO COOPERATIVO
-- ============================================================

-- Tabla: formularios_publicados
-- Datasets ingresados por la comunidad y aprobados (disponibles en el motor)

CREATE TABLE IF NOT EXISTS formularios_publicados (
    id                    TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    titulo                TEXT        NOT NULL,
    fuente_organismo      TEXT,
    pais_iso3             TEXT,
    anio_publicacion      INTEGER,
    subtema               TEXT,
    agendas               TEXT[],
    calidad               TEXT,
    frecuencia            TEXT,
    desagregacion_geo     TEXT,
    accesibilidad_formato TEXT,
    url_descarga          TEXT,
    url_valida            BOOLEAN     DEFAULT TRUE,
    descripcion_notas     TEXT,
    ingresado_por         TEXT,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);


-- Tabla: formularios_en_revision
-- Datasets ingresados pendientes de aprobación (modo revisión)

CREATE TABLE IF NOT EXISTS formularios_en_revision (
    id                    TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    titulo                TEXT        NOT NULL,
    fuente_organismo      TEXT,
    pais_iso3             TEXT,
    anio_publicacion      INTEGER,
    subtema               TEXT,
    agendas               TEXT[],
    calidad               TEXT,
    frecuencia            TEXT,
    desagregacion_geo     TEXT,
    accesibilidad_formato TEXT,
    url_descarga          TEXT,
    url_valida            BOOLEAN     DEFAULT TRUE,
    descripcion_notas     TEXT,
    ingresado_por         TEXT,
    status                TEXT        DEFAULT 'pendiente',   -- "pendiente" | "aprobado" | "rechazado"
    fecha_revision        TIMESTAMPTZ,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revision_status ON formularios_en_revision (status);


-- ============================================================
--  ROW LEVEL SECURITY (configurar en Supabase dashboard)
-- ============================================================
--
--  datasets:               lectura pública, sin escritura directa
--  normativas:             lectura pública, sin escritura directa
--  preguntas:              lectura pública, INSERT permitido (anónimo)
--  formularios_publicados: lectura pública, INSERT permitido (anónimo)
--  formularios_en_revision: INSERT permitido (anónimo), lectura restringida
--
--  Ejecutar en Supabase SQL Editor después de crear las tablas:
--
--  ALTER TABLE datasets               ENABLE ROW LEVEL SECURITY;
--  ALTER TABLE normativas             ENABLE ROW LEVEL SECURITY;
--  ALTER TABLE preguntas              ENABLE ROW LEVEL SECURITY;
--  ALTER TABLE formularios_publicados ENABLE ROW LEVEL SECURITY;
--  ALTER TABLE formularios_en_revision ENABLE ROW LEVEL SECURITY;
--
--  CREATE POLICY "public read datasets"     ON datasets     FOR SELECT USING (true);
--  CREATE POLICY "public read normativas"   ON normativas   FOR SELECT USING (true);
--  CREATE POLICY "public read preguntas"    ON preguntas    FOR SELECT USING (true);
--  CREATE POLICY "insert preguntas"         ON preguntas    FOR INSERT WITH CHECK (true);
--  CREATE POLICY "insert formularios pub"   ON formularios_publicados  FOR INSERT WITH CHECK (true);
--  CREATE POLICY "public read forms pub"    ON formularios_publicados  FOR SELECT USING (true);
--  CREATE POLICY "insert formularios rev"   ON formularios_en_revision FOR INSERT WITH CHECK (true);
-- ============================================================
