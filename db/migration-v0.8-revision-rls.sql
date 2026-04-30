-- Migration v0.8 — Tabla normativas_en_revision + RLS en tablas de revisión

-- Tabla: normativas_en_revision
-- Normativas ingresadas pendientes de aprobación

CREATE TABLE IF NOT EXISTS normativas_en_revision (
    id                  TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    nombre              TEXT        NOT NULL,
    organismo_emisor    TEXT,
    tipo                TEXT,
    pais_alcance        TEXT,
    anio_adopcion       INTEGER,
    articulo_numeral    TEXT,
    obligacion_datos    TEXT,
    agendas             TEXT[],
    url_texto_oficial   TEXT,
    descripcion_notas   TEXT,
    ingresado_por       TEXT,
    status              TEXT        DEFAULT 'pendiente',   -- "pendiente" | "aprobado" | "rechazado"
    fecha_revision      TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_normativas_revision_status ON normativas_en_revision (status);

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
