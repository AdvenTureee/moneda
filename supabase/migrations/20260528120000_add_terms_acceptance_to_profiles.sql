-- Registra aceite de Termos de Uso e Politica de Protecao de Dados (LGPD).
-- Dependencias: public.profiles e public.handle_new_user.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamptz;

COMMENT ON COLUMN public.profiles.terms_accepted_at IS 'Data/hora em que o usuario aceitou os Termos de Uso vigentes.';
COMMENT ON COLUMN public.profiles.terms_version IS 'Versao dos Termos de Uso e Politica de Protecao de Dados aceita pelo usuario.';
COMMENT ON COLUMN public.profiles.privacy_accepted_at IS 'Data/hora em que o usuario aceitou a Politica de Protecao de Dados/LGPD vigente.';

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
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    NEW.email,
    CASE WHEN NEW.raw_user_meta_data->>'terms_accepted' = 'true' THEN now() ELSE NULL END,
    NULLIF(NEW.raw_user_meta_data->>'terms_version', ''),
    CASE WHEN NEW.raw_user_meta_data->>'privacy_accepted' = 'true' THEN now() ELSE NULL END
  );
  RETURN NEW;
END;
$$;
