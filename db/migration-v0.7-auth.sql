-- Supabase Auth ya viene habilitado. Solo necesitamos profiles.

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  rol text NOT NULL CHECK (rol IN ('admin', 'curadora')) DEFAULT 'curadora',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo ve su propio perfil
CREATE POLICY "Own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Solo admin puede ver todos los perfiles
CREATE POLICY "Admin sees all" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- Trigger: crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, rol)
  VALUES (new.id, new.email, 'curadora');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
