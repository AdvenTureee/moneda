-- 00000000000010_add_profile_onboarded.sql
-- Move o flag de "usuário concluiu onboarding" do `auth.users.user_metadata`
-- para `profiles.onboarded`. Motivação: provedores OAuth (Google) sobrescrevem
-- raw_user_meta_data a cada login, apagando o flag e reiniciando o onboarding
-- do usuário recorrente.
--
-- Dependências: 00000000000007_add_profile_finance_fields (estado mínimo de
-- profiles esperado pelo app pós-onboarding).

ALTER TABLE public.profiles
  ADD COLUMN onboarded boolean NOT NULL DEFAULT false;

-- Backfill: qualquer perfil que já tenha renda informada implica que passou
-- pelo onboarding em alguma versão anterior. Evita re-trapping de usuários
-- existentes após o deploy desta migration.
UPDATE public.profiles
   SET onboarded = true
 WHERE monthly_income_cents IS NOT NULL;

COMMENT ON COLUMN public.profiles.onboarded IS 'true = usuário concluiu o onboarding inicial. Persistente entre logins (diferente de auth.user_metadata, que provedores OAuth sobrescrevem).';
