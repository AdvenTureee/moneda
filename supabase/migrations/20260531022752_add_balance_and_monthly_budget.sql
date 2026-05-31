alter table public.profiles
  add column if not exists current_balance_cents bigint,
  add column if not exists monthly_budget_cents bigint;

alter table public.profiles
  add constraint profiles_current_balance_cents_check
  check (current_balance_cents is null or current_balance_cents >= 0);

alter table public.profiles
  add constraint profiles_monthly_budget_cents_check
  check (monthly_budget_cents is null or monthly_budget_cents >= 0);

update public.profiles
set monthly_budget_cents = monthly_income_cents
where monthly_budget_cents is null
  and monthly_income_cents is not null;

comment on column public.profiles.current_balance_cents is
  'Saldo atual declarado no onboarding (centavos). Usado para estimar dinheiro restante.';

comment on column public.profiles.monthly_budget_cents is
  'Teto de gasto mensal declarado no onboarding (centavos). Substitui monthly_income_cents como orçamento principal.';
