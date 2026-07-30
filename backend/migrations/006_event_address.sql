-- 006_event_address.sql — endereço do evento a partir do CEP.
-- 'location' continua sendo o endereço (logradouro/bairro), agora preenchido
-- automaticamente pela busca de CEP; 'venue' guarda o nome do espaço.

ALTER TABLE events ADD COLUMN IF NOT EXISTS cep   TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue TEXT;
