-- 00000000000007_add_profile_finance_fields.sql
-- Adiciona colunas em public.profiles para capturar sinais coletados no
-- onboarding multi-etapas:
--  - monthly_income_cents: renda mensal declarada (centavos).
--  - has_pet: usuário declarou ter pet — gate de visibilidade da categoria Pet.
--
-- Dependências: 00000000000002_init_core_tables (profiles).

ALTER TABLE public.profiles
  ADD COLUMN monthly_income_cents bigint
    CHECK (monthly_income_cents IS NULL OR monthly_income_cents >= 0),
  ADD COLUMN has_pet boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.monthly_income_cents IS 'Renda mensal declarada no onboarding (centavos). NULL = não informado.';
COMMENT ON COLUMN public.profiles.has_pet              IS 'Usuário declarou ter pet — habilita a categoria Pet em listagens.';
