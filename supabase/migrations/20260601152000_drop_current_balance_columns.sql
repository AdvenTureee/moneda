alter table public.profiles
  drop constraint if exists profiles_current_balance_cents_check;

alter table public.profiles
  drop column if exists current_balance_updated_at,
  drop column if exists current_balance_cents;
