-- Fase 1 da proteção de PII: adiciona colunas para ciphertext AES-GCM
-- e hashes HMAC normalizados para busca/deduplicação. Mantemos as colunas
-- antigas durante o rollout para dual-write e fallback de leitura.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name_ciphertext text,
  ADD COLUMN IF NOT EXISTS name_iv text,
  ADD COLUMN IF NOT EXISTS name_tag text,
  ADD COLUMN IF NOT EXISTS email_ciphertext text,
  ADD COLUMN IF NOT EXISTS email_iv text,
  ADD COLUMN IF NOT EXISTS email_tag text,
  ADD COLUMN IF NOT EXISTS email_hash text,
  ADD COLUMN IF NOT EXISTS phone_ciphertext text,
  ADD COLUMN IF NOT EXISTS phone_iv text,
  ADD COLUMN IF NOT EXISTS phone_tag text,
  ADD COLUMN IF NOT EXISTS phone_hash text,
  ADD COLUMN IF NOT EXISTS pii_crypto_version text;

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS phone_ciphertext text,
  ADD COLUMN IF NOT EXISTS phone_iv text,
  ADD COLUMN IF NOT EXISTS phone_tag text,
  ADD COLUMN IF NOT EXISTS phone_hash text,
  ADD COLUMN IF NOT EXISTS pii_crypto_version text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_hash_unique_idx
  ON public.profiles (email_hash)
  WHERE email_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_hash_unique_idx
  ON public.profiles (phone_hash)
  WHERE phone_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS whatsapp_messages_phone_hash_received_idx
  ON public.whatsapp_messages (phone_hash, received_at DESC)
  WHERE phone_hash IS NOT NULL;

COMMENT ON COLUMN public.profiles.name_ciphertext IS 'Nome criptografado no servidor da aplicação com AES-256-GCM.';
COMMENT ON COLUMN public.profiles.email_ciphertext IS 'Email espelhado criptografado; auth.users.email segue como fonte de autenticação.';
COMMENT ON COLUMN public.profiles.email_hash IS 'HMAC-SHA-256 do email normalizado para lookup/deduplicação sem expor valor claro.';
COMMENT ON COLUMN public.profiles.phone_ciphertext IS 'Telefone criptografado no servidor da aplicação com AES-256-GCM.';
COMMENT ON COLUMN public.profiles.phone_hash IS 'HMAC-SHA-256 do telefone E.164 normalizado.';
COMMENT ON COLUMN public.profiles.pii_crypto_version IS 'Versão da chave/estratégia usada para criptografar PII.';
COMMENT ON COLUMN public.whatsapp_messages.phone_ciphertext IS 'Telefone de origem criptografado no servidor da aplicação com AES-256-GCM.';
COMMENT ON COLUMN public.whatsapp_messages.phone_hash IS 'HMAC-SHA-256 do telefone de origem normalizado.';
