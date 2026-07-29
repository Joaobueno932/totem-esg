-- 004_event_details.sql — cadastro de evento mais completo.
-- Campos opcionais exibidos no totem e/ou usados em relatórios.

ALTER TABLE events ADD COLUMN IF NOT EXISTS description        TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer_name     TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS contact_email      TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS contact_phone      TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS city               TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS state              TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS expected_attendees INTEGER;
