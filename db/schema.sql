-- ============================================================
--  Infra.Coop · Motor de Brechas · Esquema PostgreSQL
--  Data Cooperativas Latinas / Mozilla Fellowship 2024-2026
--  Requiere: PostgreSQL 15+ y extensión pgvector
-- ============================================================

-- Activar extensión vectorial
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
--  GRUPO 1: DATOS DE ENTRADA AL MODELO
--  Tablas que alimentan los dos índices de búsqueda semántica
-- ============================================================

-- Tabla: datasets
-- Repositorio de datasets de género recolectados a nivel global/regional.
-- El campo `embedding` almacena el vector generado por sentence-transformers
-- sobre la concatenación de título + descripción + subtema.

CREATE TABLE datasets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo          TEXT        NOT NULL,
    fuente          TEXT        NOT NULL,                   -- ej: "ONU Mujeres", "CEPAL", "INEGI"
    pais            VARCHAR(3),                             -- ISO 3166-1 alpha-3, NULL = global
    anio            SMALLINT,
    tema            VARCHAR(80) NOT NULL,                   -- salud | justicia | violencia | tecnologia | interseccional
    subtema         VARCHAR(120),                           -- ej: "mortalidad materna", "aborto legal"
    calidad         VARCHAR(20) DEFAULT 'desconocida',      -- completo | parcial | desactualizado | desconocida
    descripcion     TEXT,
    url_fuente      TEXT,
    licencia        VARCHAR(60),                            -- ej: "CC BY 4.0", "uso restringido"
    embedding       vector(768),                            -- paraphrase-multilingual-mpnet-base-v2
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índice vectorial para búsqueda semántica rápida (coseno)
CREATE INDEX idx_datasets_embedding
    ON datasets USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Índices de filtro frecuente
CREATE INDEX idx_datasets_tema    ON datasets (tema);
CREATE INDEX idx_datasets_pais    ON datasets (pais);
CREATE INDEX idx_datasets_calidad ON datasets (calidad);


-- Tabla: frameworks
-- Marcos normativos que el Estado está obligado a cumplir.
-- Base del análisis de brecha: qué exige la norma vs qué dato existe.
-- El embedding se genera sobre nombre + obligacion + descripción.

CREATE TABLE frameworks (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre           TEXT        NOT NULL,                  -- ej: "NOM-046-SSA2-2005"
    organismo        VARCHAR(120) NOT NULL,                 -- ej: "Secretaría de Salud México"
    tipo             VARCHAR(40) NOT NULL,                  -- norma_oficial | ley | convenio | ods | recomendacion
    pais_aplicacion  VARCHAR(3),                            -- NULL = internacional
    articulo         VARCHAR(60),                           -- ej: "Artículo 6.3"
    obligacion       TEXT        NOT NULL,                  -- qué dato obliga a registrar/publicar
    descripcion      TEXT,
    url_texto        TEXT,
    embedding        vector(768),
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_frameworks_embedding
    ON frameworks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50);

CREATE INDEX idx_frameworks_tipo   ON frameworks (tipo);
CREATE INDEX idx_frameworks_pais   ON frameworks (pais_aplicacion);


-- ============================================================
--  GRUPO 2: GOBERNANZA COOPERATIVA
--  Organización temática por nodos (Capa 2 de la infraestructura)
-- ============================================================

-- Tabla: topics
-- Nodos temáticos federados. Un topic pertenece a un nodo cooperativo.
-- Los datasets y frameworks se clasifican en uno o más topics.

CREATE TABLE topics (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre      VARCHAR(120) NOT NULL,
    slug        VARCHAR(80)  NOT NULL UNIQUE,               -- ej: "salud-reproductiva", "violencia-genero"
    descripcion TEXT,
    nodo_id     VARCHAR(40),                                -- identificador del nodo federado (Capa 2)
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tablas de relación muchos-a-muchos

CREATE TABLE dataset_topics (
    dataset_id   UUID NOT NULL REFERENCES datasets(id)   ON DELETE CASCADE,
    topic_id     UUID NOT NULL REFERENCES topics(id)     ON DELETE CASCADE,
    PRIMARY KEY (dataset_id, topic_id)
);

CREATE TABLE framework_topics (
    framework_id UUID NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
    topic_id     UUID NOT NULL REFERENCES topics(id)     ON DELETE CASCADE,
    PRIMARY KEY (framework_id, topic_id)
);


-- ============================================================
--  GRUPO 3: PRODUCCIÓN DEL MOTOR
--  Tablas que registran el uso y construyen el mapa colectivo
-- ============================================================

-- Tabla: questions
-- Log anonimizado de preguntas ingresadas por las usuarias.
-- NUNCA almacena la pregunta original con datos identificables.
-- El texto se anonimiza antes de insertar (ver pipeline).
-- Los embeddings de esta tabla alimentan el clustering k-means
-- para construir el mapa colectivo de brechas.

CREATE TABLE questions (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    texto_anonimizado TEXT        NOT NULL,                 -- pregunta sin datos identificables
    embedding        vector(768)  NOT NULL,
    pais_contexto    VARCHAR(3),                            -- país declarado por la usuaria, opcional
    topic_id         UUID REFERENCES topics(id),           -- topic inferido por el sistema
    cluster_id       INTEGER,                               -- asignado por k-means periódico
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_questions_embedding
    ON questions USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50);

CREATE INDEX idx_questions_topic   ON questions (topic_id);
CREATE INDEX idx_questions_cluster ON questions (cluster_id);
CREATE INDEX idx_questions_fecha   ON questions (created_at DESC);


-- Tabla: gaps
-- Resultado del análisis de brecha para cada pregunta.
-- Almacena el score calculado, la categoría y la síntesis generada por el LLM.
-- Un question puede tener múltiples gaps si se re-analiza con distintos parámetros.

CREATE TABLE gaps (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id   UUID        NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    score_brecha  REAL        NOT NULL CHECK (score_brecha BETWEEN 0 AND 1),
    -- Formula: score = (1 - max_sim_dataset) * 0.6 + cobertura_norma * 0.4
    -- 0.0 = dato completamente cubierto / 1.0 = brecha crítica
    categoria     VARCHAR(20) NOT NULL CHECK (categoria IN ('critica','parcial','cubierta')),
    sintesis_llm  TEXT,                                     -- respuesta generada por el LLM
    modelo_llm    VARCHAR(60),                              -- ej: "gpt-4o-mini", "claude-haiku-3"
    ms_latencia   INTEGER,                                  -- tiempo total de respuesta en ms
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gaps_question   ON gaps (question_id);
CREATE INDEX idx_gaps_categoria  ON gaps (categoria);
CREATE INDEX idx_gaps_score      ON gaps (score_brecha DESC);


-- Tabla: gap_datasets
-- Relación entre un análisis de brecha y los datasets que devolvió
-- la búsqueda semántica. Guarda el score de similitud y el ranking.

CREATE TABLE gap_datasets (
    gap_id          UUID NOT NULL REFERENCES gaps(id)     ON DELETE CASCADE,
    dataset_id      UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    score_similitud REAL NOT NULL CHECK (score_similitud BETWEEN 0 AND 1),
    rank_resultado  SMALLINT NOT NULL CHECK (rank_resultado BETWEEN 1 AND 10),
    PRIMARY KEY (gap_id, dataset_id)
);


-- Tabla: gap_frameworks
-- Relación entre un análisis de brecha y los marcos normativos relevantes
-- encontrados en la búsqueda semántica.

CREATE TABLE gap_frameworks (
    gap_id          UUID NOT NULL REFERENCES gaps(id)       ON DELETE CASCADE,
    framework_id    UUID NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
    score_similitud REAL NOT NULL CHECK (score_similitud BETWEEN 0 AND 1),
    rank_resultado  SMALLINT NOT NULL CHECK (rank_resultado BETWEEN 1 AND 5),
    PRIMARY KEY (gap_id, framework_id)
);


-- ============================================================
--  VISTAS ÚTILES PARA EL FRONTEND Y EL MAPA COLECTIVO
-- ============================================================

-- Vista: mapa colectivo de brechas
-- Agrega preguntas por cluster y calcula el score promedio de brecha.
-- Alimenta la visualización pública del mapa colectivo.

CREATE OR REPLACE VIEW mapa_brechas_colectivo AS
SELECT
    q.cluster_id,
    t.nombre                            AS topic,
    t.slug                              AS topic_slug,
    COUNT(DISTINCT q.id)                AS total_preguntas,
    AVG(g.score_brecha)                 AS score_brecha_promedio,
    COUNT(CASE WHEN g.categoria = 'critica'  THEN 1 END) AS brechas_criticas,
    COUNT(CASE WHEN g.categoria = 'parcial'  THEN 1 END) AS brechas_parciales,
    COUNT(CASE WHEN g.categoria = 'cubierta' THEN 1 END) AS brechas_cubiertas,
    MAX(q.created_at)                   AS ultima_pregunta
FROM questions q
LEFT JOIN gaps g         ON g.question_id = q.id
LEFT JOIN topics t       ON t.id = q.topic_id
WHERE q.cluster_id IS NOT NULL
GROUP BY q.cluster_id, t.nombre, t.slug
ORDER BY score_brecha_promedio DESC;


-- Vista: datasets con sus topics
-- Facilita filtros del frontend por tema/nodo sin JOINs manuales.

CREATE OR REPLACE VIEW datasets_con_topics AS
SELECT
    d.id,
    d.titulo,
    d.fuente,
    d.pais,
    d.anio,
    d.tema,
    d.subtema,
    d.calidad,
    d.url_fuente,
    ARRAY_AGG(t.slug ORDER BY t.slug) AS topics
FROM datasets d
LEFT JOIN dataset_topics dt ON dt.dataset_id = d.id
LEFT JOIN topics t          ON t.id = dt.topic_id
GROUP BY d.id, d.titulo, d.fuente, d.pais, d.anio,
         d.tema, d.subtema, d.calidad, d.url_fuente;


-- ============================================================
--  DATOS INICIALES: TOPICS BASE (seed)
-- ============================================================

INSERT INTO topics (nombre, slug, descripcion, nodo_id) VALUES
  ('Salud reproductiva',   'salud-reproductiva',   'Datos sobre aborto, mortalidad materna, atención primaria', 'nodo-salud'),
  ('Justicia y litigios',  'justicia-litigios',    'Datos sobre acceso a la justicia, sentencias, litigios estratégicos', 'nodo-justicia'),
  ('Violencia de género',  'violencia-genero',     'Registros de violencia, feminicidio, acceso a refugios', 'nodo-violencia'),
  ('Tecnologías y datos',  'tecnologias-datos',    'Brecha digital, acceso a internet, datos sobre IA y género', 'nodo-tecnologia'),
  ('Interseccionalidad',   'interseccionalidad',   'Datos que cruzan género con etnia, clase, territorio, discapacidad', 'nodo-interseccional');


-- ============================================================
--  NOTAS DE IMPLEMENTACIÓN
-- ============================================================
-- 
--  1. EMBEDDINGS: Generar con sentence-transformers antes de INSERT.
--     Dimensión 768 para paraphrase-multilingual-mpnet-base-v2.
--     Si se elige OpenAI text-embedding-3-small: cambiar a vector(1536).
--
--  2. CLUSTERING: Ejecutar k-means sobre questions.embedding
--     con script Python periódico (cron semanal recomendado).
--     Actualizar questions.cluster_id con los resultados.
--
--  3. ANONIMIZACIÓN: El pipeline debe sanitizar questions.texto_anonimizado
--     antes de INSERT usando spaCy NER para detectar nombres y lugares.
--
--  4. ÍNDICES IVFFLAT: El parámetro `lists` debe ajustarse según
--     el volumen de datos. Regla general: lists = sqrt(n_filas).
--     Con 10k datasets: lists=100. Con 1k: lists=32.
--
--  5. SCORE DE BRECHA: La fórmula actual pondera 60% similitud semántica
--     y 40% cobertura normativa. Los pesos deben calibrarse durante
--     la evaluación del día 13 del sprint con participantes reales.
-- ============================================================
