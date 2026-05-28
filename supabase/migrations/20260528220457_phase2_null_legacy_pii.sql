-- Fase 2: deixa de reter PII clara nas colunas legadas.
-- Pré-requisito: rodar o backfill de PII para popular ciphertext/hash.

ALTER TABLE public.profiles
  ALTER COLUMN name DROP NOT NULL,
  ALTER COLUMN email DROP NOT NULL;

ALTER TABLE public.whatsapp_messages
  ALTER COLUMN phone DROP NOT NULL;

DROP INDEX IF EXISTS public.profiles_email_unique_idx;
DROP INDEX IF EXISTS public.profiles_phone_unique_idx;
DROP INDEX IF EXISTS public.whatsapp_messages_phone_received_idx;

UPDATE public.profiles
SET
  name = CASE WHEN name_ciphertext IS NOT NULL THEN NULL ELSE name END,
  email = CASE WHEN email_ciphertext IS NOT NULL AND email_hash IS NOT NULL THEN NULL ELSE email END,
  phone = CASE WHEN phone IS NULL OR (phone_ciphertext IS NOT NULL AND phone_hash IS NOT NULL) THEN NULL ELSE phone END
WHERE
  name_ciphertext IS NOT NULL
  OR (email_ciphertext IS NOT NULL AND email_hash IS NOT NULL)
  OR (phone_ciphertext IS NOT NULL AND phone_hash IS NOT NULL);

UPDATE public.whatsapp_messages
SET phone = NULL
WHERE phone_ciphertext IS NOT NULL AND phone_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    name,
    phone,
    email,
    terms_accepted_at,
    terms_version,
    privacy_accepted_at
  )
  VALUES (
    NEW.id,
    NULL,
    NULL,
    NULL,
    CASE WHEN NEW.raw_user_meta_data->>'terms_accepted' = 'true' THEN now() ELSE NULL END,
    NULLIF(NEW.raw_user_meta_data->>'terms_version', ''),
    CASE WHEN NEW.raw_user_meta_data->>'privacy_accepted' = 'true' THEN now() ELSE NULL END
  );
  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.profiles.name IS 'LEGACY: mantida apenas para compatibilidade temporária. PII clara deve ficar NULL após backfill.';
COMMENT ON COLUMN public.profiles.email IS 'LEGACY: auth.users.email é fonte de autenticação; espelho operacional fica criptografado.';
COMMENT ON COLUMN public.profiles.phone IS 'LEGACY: telefone operacional fica criptografado/hash.';
COMMENT ON COLUMN public.whatsapp_messages.phone IS 'LEGACY: telefone operacional fica criptografado/hash.';
