alter table public.profiles
  add column if not exists billing_closing_day integer;

alter table public.profiles
  drop constraint if exists profiles_billing_closing_day_check;

alter table public.profiles
  add constraint profiles_billing_closing_day_check
  check (billing_closing_day is null or (billing_closing_day between 1 and 28));

comment on column public.profiles.billing_closing_day is
  'Dia de fechamento da fatura usado para calcular o ciclo financeiro do usuário.';
