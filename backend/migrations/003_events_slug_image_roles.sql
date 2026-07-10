-- 003_events_slug_image_roles.sql
-- (1) cada evento ganha um slug único (usado no link/QR do totem: totem.app/<slug>)
--     e uma imagem opcional (data URL base64) exibida na tela inicial do totem;
-- (2) papéis de usuário: 'admin' (tudo) e 'viewer' (só consulta).

-- ---------- Eventos: slug + imagem ----------
ALTER TABLE events ADD COLUMN IF NOT EXISTS slug        TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_data  TEXT;   -- data:image/...;base64,....
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_updated_at TIMESTAMPTZ;

-- Backfill de slug para eventos já existentes: slugify(name) + id para garantir unicidade.
UPDATE events
   SET slug = trim(both '-' from regexp_replace(lower(
         translate(name,
           'áàâãäéèêëíìîïóòôõöúùûüçñ',
           'aaaaaeeeeiiiiooooouuuucn')),
         '[^a-z0-9]+', '-', 'g')) || '-' || id
 WHERE slug IS NULL;

ALTER TABLE events ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_events_slug ON events(slug);

-- ---------- Usuários: papéis ----------
-- Normaliza qualquer papel fora do conjunto conhecido para 'admin' antes de restringir.
UPDATE admin_users SET role = 'admin' WHERE role IS NULL OR role NOT IN ('admin', 'viewer');
ALTER TABLE admin_users ALTER COLUMN role SET DEFAULT 'admin';

ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check CHECK (role IN ('admin', 'viewer'));
