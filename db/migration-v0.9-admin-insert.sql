-- Migration v0.9 — Admin INSERT/DELETE policies on datasets and normativas
-- Required for aprobarFormulario / aprobarNormativa to work from the client.

ALTER TABLE datasets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE normativas ENABLE ROW LEVEL SECURITY;

-- Admin can insert approved community datasets / normativas
CREATE POLICY "admin insert datasets" ON datasets
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "admin delete datasets" ON datasets
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "admin insert normativas" ON normativas
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "admin delete normativas" ON normativas
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );
