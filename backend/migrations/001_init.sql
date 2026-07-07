-- 001_init.sql — esquema inicial do sistema Carbono Zero

CREATE TABLE IF NOT EXISTS events (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  location    TEXT,
  start_date  DATE,
  end_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS participants (
  id                SERIAL PRIMARY KEY,
  event_id          INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  company           TEXT,
  email             TEXT NOT NULL,
  phone             TEXT,
  city              TEXT,
  state             TEXT,
  consent_lgpd      BOOLEAN NOT NULL DEFAULT false,
  consent_marketing BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_participants_event ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_city  ON participants(city);
CREATE INDEX IF NOT EXISTS idx_participants_state ON participants(state);

CREATE TABLE IF NOT EXISTS emission_factors (
  id                     SERIAL PRIMARY KEY,
  mode                   TEXT NOT NULL,
  fuel_type              TEXT,
  factor_kg_co2e_per_km  NUMERIC(10,6) NOT NULL,
  -- 'vehicle' = fator por veículo (divide pelo nº de ocupantes); 'passenger' = fator já por passageiro
  factor_basis           TEXT NOT NULL DEFAULT 'vehicle',
  source                 TEXT NOT NULL,
  source_url             TEXT,
  version                TEXT NOT NULL,
  active                 BOOLEAN NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mode, fuel_type, version)
);

CREATE TABLE IF NOT EXISTS transport_answers (
  id                    SERIAL PRIMARY KEY,
  local_uuid            UUID NOT NULL UNIQUE,
  participant_id        INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  event_id              INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  transport_mode        TEXT NOT NULL,
  fuel_type             TEXT,
  origin_text           TEXT,
  distance_km           NUMERIC(10,2) NOT NULL CHECK (distance_km >= 0),
  round_trip            BOOLEAN NOT NULL DEFAULT false,
  passengers_in_vehicle INTEGER NOT NULL DEFAULT 1 CHECK (passengers_in_vehicle >= 1),
  emission_kg_co2e      NUMERIC(12,4) NOT NULL,
  calculation_version   TEXT NOT NULL,
  answered_at           TIMESTAMPTZ,          -- momento em que o participante respondeu no totem
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_answers_event ON transport_answers(event_id);
CREATE INDEX IF NOT EXISTS idx_answers_mode  ON transport_answers(transport_mode);

CREATE TABLE IF NOT EXISTS sync_logs (
  id            SERIAL PRIMARY KEY,
  local_uuid    UUID,
  status        TEXT NOT NULL,          -- 'ok' | 'duplicate' | 'error' | 'recalculated'
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
