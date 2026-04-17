-- ============================================================
--  Infra.Coop · Métricas automáticas y snapshots
--  Extensión del esquema infracoop_schema.sql
--  Se ejecuta DESPUÉS de haber corrido el schema principal
-- ============================================================


-- ============================================================
--  TABLA DE AUDITORÍA DE EVENTOS
--  Registro inmutable de cada interacción con el motor.
--  Un trigger la alimenta automáticamente en cada INSERT
--  sobre questions y gaps — sin intervención del código Python.
-- ============================================================

CREATE TABLE audit_eventos (
    id              BIGSERIAL PRIMARY KEY,
    tabla_origen    VARCHAR(40)  NOT NULL,    -- 'questions' | 'gaps'
    evento          VARCHAR(20)  NOT NULL,    -- 'INSERT' | 'UPDATE' | 'DELETE'
    registro_id     UUID         NOT NULL,    -- id del registro afectado
    pais_contexto   VARCHAR(3),              -- copiado de questions si aplica
    topic_id        UUID,                    -- copiado de questions si aplica
    score_brecha    REAL,                    -- copiado de gaps si aplica
    categoria       VARCHAR(20),             -- copiado de gaps si aplica
    modelo_llm      VARCHAR(60),             -- copiado de gaps si aplica
    ms_latencia     INTEGER,                 -- copiado de gaps si aplica
    ocurrido_en     TIMESTAMPTZ DEFAULT NOW()
);

-- Solo lectura hacia atrás: nunca se borra, nunca se edita
-- El rol de app solo tiene INSERT sobre esta tabla
CREATE INDEX idx_audit_tabla     ON audit_eventos (tabla_origen);
CREATE INDEX idx_audit_fecha     ON audit_eventos (ocurrido_en DESC);
CREATE INDEX idx_audit_categoria ON audit_eventos (categoria);
CREATE INDEX idx_audit_topic     ON audit_eventos (topic_id);


-- ============================================================
--  TRIGGERS DE AUDITORÍA AUTOMÁTICA
--  Se disparan en cada INSERT sobre questions y gaps.
--  No requieren cambios en el código Python del backend.
-- ============================================================

-- Trigger para questions
CREATE OR REPLACE FUNCTION fn_audit_question()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_eventos (
        tabla_origen, evento, registro_id,
        pais_contexto, topic_id, ocurrido_en
    ) VALUES (
        'questions', TG_OP, NEW.id,
        NEW.pais_contexto, NEW.topic_id, NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_question
AFTER INSERT ON questions
FOR EACH ROW EXECUTE FUNCTION fn_audit_question();


-- Trigger para gaps
CREATE OR REPLACE FUNCTION fn_audit_gap()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_eventos (
        tabla_origen, evento, registro_id,
        score_brecha, categoria, modelo_llm, ms_latencia, ocurrido_en
    ) VALUES (
        'gaps', TG_OP, NEW.id,
        NEW.score_brecha, NEW.categoria, NEW.modelo_llm, NEW.ms_latencia, NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_gap
AFTER INSERT ON gaps
FOR EACH ROW EXECUTE FUNCTION fn_audit_gap();


-- ============================================================
--  TABLA DE SNAPSHOTS DIARIOS
--  Fotografía del estado del sistema cada 24 horas.
--  Se llena con un cron job (pg_cron o cron externo).
--  Permite ver la evolución del mapa de brechas a lo largo
--  del tiempo: cuántas preguntas nuevas, cómo cambia el score
--  promedio por topic, cuántas brechas críticas se acumulan.
-- ============================================================

CREATE TABLE metricas_snapshot (
    id                      BIGSERIAL PRIMARY KEY,
    fecha                   DATE        NOT NULL DEFAULT CURRENT_DATE,
    topic_id                UUID        REFERENCES topics(id),
    topic_nombre            VARCHAR(120),

    -- Volumen de uso
    total_preguntas_acum    INTEGER     NOT NULL DEFAULT 0,  -- total histórico
    preguntas_nuevas_dia    INTEGER     NOT NULL DEFAULT 0,  -- solo las últimas 24h
    total_gaps_acum         INTEGER     NOT NULL DEFAULT 0,

    -- Distribución de brechas
    brechas_criticas        INTEGER     NOT NULL DEFAULT 0,
    brechas_parciales       INTEGER     NOT NULL DEFAULT 0,
    brechas_cubiertas       INTEGER     NOT NULL DEFAULT 0,

    -- Scores
    score_promedio          REAL,                            -- promedio del día
    score_promedio_acum     REAL,                            -- promedio histórico
    score_max               REAL,                            -- brecha más alta del día
    score_min               REAL,                            -- brecha más baja del día

    -- Performance del sistema
    latencia_promedio_ms    REAL,                            -- latencia promedio del LLM
    latencia_p95_ms         REAL,                            -- percentil 95 de latencia

    -- Metadatos del snapshot
    capturado_en            TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (fecha, topic_id)                                 -- un snapshot por topic por día
);

CREATE INDEX idx_snapshot_fecha  ON metricas_snapshot (fecha DESC);
CREATE INDEX idx_snapshot_topic  ON metricas_snapshot (topic_id, fecha DESC);


-- ============================================================
--  FUNCIÓN PARA GENERAR EL SNAPSHOT DIARIO
--  Se llama desde un cron job: cada día a medianoche (UTC).
--  Compatible con pg_cron (extensión de PostgreSQL) o
--  con un script Python externo que haga SELECT y luego INSERT.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_generar_snapshot_diario(p_fecha DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
    filas_insertadas INTEGER := 0;
BEGIN
    INSERT INTO metricas_snapshot (
        fecha, topic_id, topic_nombre,
        total_preguntas_acum, preguntas_nuevas_dia, total_gaps_acum,
        brechas_criticas, brechas_parciales, brechas_cubiertas,
        score_promedio, score_promedio_acum, score_max, score_min,
        latencia_promedio_ms, latencia_p95_ms
    )
    SELECT
        p_fecha,
        t.id                                                AS topic_id,
        t.nombre                                            AS topic_nombre,

        -- Volumen acumulado
        COUNT(DISTINCT q.id)                                AS total_preguntas_acum,
        COUNT(DISTINCT q.id) FILTER (
            WHERE q.created_at >= p_fecha
            AND   q.created_at <  p_fecha + INTERVAL '1 day'
        )                                                   AS preguntas_nuevas_dia,
        COUNT(DISTINCT g.id)                                AS total_gaps_acum,

        -- Distribución de brechas (solo del día)
        COUNT(g.id) FILTER (
            WHERE g.categoria = 'critica'
            AND   g.created_at >= p_fecha
            AND   g.created_at <  p_fecha + INTERVAL '1 day'
        )                                                   AS brechas_criticas,
        COUNT(g.id) FILTER (
            WHERE g.categoria = 'parcial'
            AND   g.created_at >= p_fecha
            AND   g.created_at <  p_fecha + INTERVAL '1 day'
        )                                                   AS brechas_parciales,
        COUNT(g.id) FILTER (
            WHERE g.categoria = 'cubierta'
            AND   g.created_at >= p_fecha
            AND   g.created_at <  p_fecha + INTERVAL '1 day'
        )                                                   AS brechas_cubiertas,

        -- Scores del día
        AVG(g.score_brecha) FILTER (
            WHERE g.created_at >= p_fecha
            AND   g.created_at <  p_fecha + INTERVAL '1 day'
        )                                                   AS score_promedio,
        AVG(g.score_brecha)                                 AS score_promedio_acum,
        MAX(g.score_brecha) FILTER (
            WHERE g.created_at >= p_fecha
            AND   g.created_at <  p_fecha + INTERVAL '1 day'
        )                                                   AS score_max,
        MIN(g.score_brecha) FILTER (
            WHERE g.created_at >= p_fecha
            AND   g.created_at <  p_fecha + INTERVAL '1 day'
        )                                                   AS score_min,

        -- Latencia del LLM (día)
        AVG(g.ms_latencia) FILTER (
            WHERE g.created_at >= p_fecha
            AND   g.created_at <  p_fecha + INTERVAL '1 day'
        )                                                   AS latencia_promedio_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (
            ORDER BY g.ms_latencia
        ) FILTER (
            WHERE g.created_at >= p_fecha
            AND   g.created_at <  p_fecha + INTERVAL '1 day'
        )                                                   AS latencia_p95_ms

    FROM topics t
    LEFT JOIN questions q ON q.topic_id = t.id
    LEFT JOIN gaps g      ON g.question_id = q.id
    GROUP BY t.id, t.nombre
    ON CONFLICT (fecha, topic_id) DO UPDATE SET
        total_preguntas_acum  = EXCLUDED.total_preguntas_acum,
        preguntas_nuevas_dia  = EXCLUDED.preguntas_nuevas_dia,
        total_gaps_acum       = EXCLUDED.total_gaps_acum,
        brechas_criticas      = EXCLUDED.brechas_criticas,
        brechas_parciales     = EXCLUDED.brechas_parciales,
        brechas_cubiertas     = EXCLUDED.brechas_cubiertas,
        score_promedio        = EXCLUDED.score_promedio,
        score_promedio_acum   = EXCLUDED.score_promedio_acum,
        score_max             = EXCLUDED.score_max,
        score_min             = EXCLUDED.score_min,
        latencia_promedio_ms  = EXCLUDED.latencia_promedio_ms,
        latencia_p95_ms       = EXCLUDED.latencia_p95_ms,
        capturado_en          = NOW();

    GET DIAGNOSTICS filas_insertadas = ROW_COUNT;
    RETURN filas_insertadas;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
--  ACTIVAR pg_cron (si está disponible en el servidor)
--  Ejecuta el snapshot diario a las 00:05 UTC
-- ============================================================

-- CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- SELECT cron.schedule(
--     'snapshot-diario-brechas',
--     '5 0 * * *',
--     $$ SELECT fn_generar_snapshot_diario(); $$
-- );
--
-- Para verificar que está programado:
-- SELECT * FROM cron.job;
--
-- Si no se usa pg_cron, llamar desde Python con APScheduler:
--   from apscheduler.schedulers.background import BackgroundScheduler
--   scheduler = BackgroundScheduler()
--   scheduler.add_job(run_snapshot, 'cron', hour=0, minute=5)


-- ============================================================
--  VISTAS DE MÉTRICAS PARA EL DASHBOARD
-- ============================================================

-- Vista: evolución diaria de brechas (serie temporal)
-- Alimenta el dashboard de métricas del colectivo custodio.
CREATE OR REPLACE VIEW metricas_evolucion_diaria AS
SELECT
    fecha,
    SUM(preguntas_nuevas_dia)          AS preguntas_dia,
    SUM(total_preguntas_acum)          AS preguntas_total,
    SUM(brechas_criticas)              AS criticas_dia,
    SUM(brechas_parciales)             AS parciales_dia,
    SUM(brechas_cubiertas)             AS cubiertas_dia,
    ROUND(AVG(score_promedio)::numeric, 3)      AS score_promedio_global,
    ROUND(AVG(latencia_promedio_ms)::numeric, 0) AS latencia_promedio_ms
FROM metricas_snapshot
GROUP BY fecha
ORDER BY fecha DESC;


-- Vista: ranking de topics por urgencia acumulada
-- Muestra qué nodos concentran más brechas críticas históricamente.
CREATE OR REPLACE VIEW metricas_ranking_topics AS
SELECT
    topic_nombre,
    MAX(total_preguntas_acum)                               AS total_preguntas,
    SUM(brechas_criticas)                                   AS total_criticas,
    SUM(brechas_parciales)                                  AS total_parciales,
    ROUND(AVG(score_promedio_acum)::numeric, 3)             AS score_promedio,
    MAX(fecha)                                              AS ultimo_snapshot
FROM metricas_snapshot
WHERE topic_nombre IS NOT NULL
GROUP BY topic_nombre
ORDER BY total_criticas DESC, score_promedio DESC;


-- Vista: detalle de eventos en las últimas 24h (para monitoreo en tiempo real)
CREATE OR REPLACE VIEW metricas_ultimas_24h AS
SELECT
    DATE_TRUNC('hour', a.ocurrido_en)   AS hora,
    a.tabla_origen,
    a.categoria,
    COUNT(*)                             AS eventos,
    ROUND(AVG(a.score_brecha)::numeric, 3)        AS score_promedio,
    ROUND(AVG(a.ms_latencia)::numeric, 0)          AS latencia_promedio_ms
FROM audit_eventos a
WHERE a.ocurrido_en >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', a.ocurrido_en), a.tabla_origen, a.categoria
ORDER BY hora DESC;


-- ============================================================
--  CONSULTAS DE EJEMPLO PARA EL COLECTIVO CUSTODIO
-- ============================================================

-- ¿Cuántas preguntas nuevas llegaron hoy?
-- SELECT SUM(preguntas_nuevas_dia) FROM metricas_snapshot WHERE fecha = CURRENT_DATE;

-- ¿Qué topic tuvo más brechas críticas esta semana?
-- SELECT topic_nombre, SUM(brechas_criticas) AS criticas
-- FROM metricas_snapshot
-- WHERE fecha >= CURRENT_DATE - 7
-- GROUP BY topic_nombre ORDER BY criticas DESC LIMIT 5;

-- ¿Cómo evolucionó el score promedio de brecha en el último mes?
-- SELECT fecha, score_promedio_global FROM metricas_evolucion_diaria
-- WHERE fecha >= CURRENT_DATE - 30 ORDER BY fecha;

-- ¿El LLM está más lento que antes? (alerta de performance)
-- SELECT fecha, latencia_promedio_ms FROM metricas_evolucion_diaria
-- WHERE fecha >= CURRENT_DATE - 7 ORDER BY fecha;

-- ============================================================
--  NOTAS DE IMPLEMENTACIÓN
-- ============================================================
--
--  1. ORDEN DE EJECUCIÓN: correr infracoop_schema.sql primero,
--     este archivo segundo.
--
--  2. pg_cron vs APScheduler: para Railway/Render sin pg_cron,
--     usar APScheduler en Python. Llamar a fn_generar_snapshot_diario()
--     con psycopg2 o asyncpg desde el backend FastAPI.
--
--  3. RETENCIÓN: audit_eventos crece indefinidamente.
--     Para producción, considerar particionamiento por mes
--     o política de retención de 12 meses con pg_partman.
--
--  4. PRIVACIDAD: audit_eventos NO guarda texto de preguntas
--     ni embeddings — solo IDs, scores y metadatos temporales.
--     Es seguro hacerlo visible al colectivo custodio.
--
--  5. DASHBOARD: las vistas metricas_* están diseñadas para
--     conectarse directamente a Metabase, Grafana o un
--     dashboard propio en el frontend de Infra.Coop.
-- ============================================================
