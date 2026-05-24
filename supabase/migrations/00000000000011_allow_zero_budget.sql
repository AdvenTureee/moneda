ALTER TABLE public.budgets
  DROP CONSTRAINT IF EXISTS budgets_amount_cents_check,
  ADD CONSTRAINT budgets_amount_cents_check CHECK (amount_cents >= 0);
