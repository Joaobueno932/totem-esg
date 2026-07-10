-- 002_multi_transport.sql — um participante pode informar vários trechos de transporte
-- (ex.: ônibus até o aeroporto → avião → táxi até o evento).
--
-- Cada trecho vira uma linha em transport_answers. O local_uuid deixa de identificar
-- uma linha e passa a identificar a SUBMISSÃO inteira: todos os trechos de uma resposta
-- compartilham o mesmo local_uuid e se distinguem pelo leg_index (0, 1, 2...).
-- A deduplicação da sincronização continua sendo "já existe alguma linha com este local_uuid?".

ALTER TABLE transport_answers ADD COLUMN IF NOT EXISTS leg_index INTEGER NOT NULL DEFAULT 0;

-- Respostas antigas (um único transporte) já ficam corretas com leg_index = 0.
ALTER TABLE transport_answers DROP CONSTRAINT IF EXISTS transport_answers_local_uuid_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_answers_submission_leg
  ON transport_answers (local_uuid, leg_index);

CREATE INDEX IF NOT EXISTS idx_answers_local_uuid   ON transport_answers(local_uuid);
CREATE INDEX IF NOT EXISTS idx_answers_participant  ON transport_answers(participant_id);
