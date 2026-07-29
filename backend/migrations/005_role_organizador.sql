-- 005_role_organizador.sql — novo papel "organizador".
-- Papéis: admin (tudo), organizador (gerencia eventos e vê tudo, mas NÃO usuários),
-- viewer (só consulta). Apenas admin cria/gerencia usuários.

ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('admin', 'organizador', 'viewer'));
