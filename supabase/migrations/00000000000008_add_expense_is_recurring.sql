-- 00000000000008_add_expense_is_recurring.sql
-- Adiciona is_recurring em public.expenses para diferenciar gastos pontuais
-- de gastos mensais recorrentes (cadastrados no onboarding ou marcados pelo
-- usuário). Espelha o padrão já adotado em public.incomes.
--
-- Dependências: 00000000000002_init_core_tables (expenses).

ALTER TABLE public.expenses
  ADD COLUMN is_recurring boolean NOT NULL DEFAULT false;

-- Índice parcial: a maioria das queries de recorrência filtra por
-- (user_id, is_recurring = true) ignorando soft-deleted.
CREATE INDEX expenses_is_recurring_idx
  ON public.expenses (user_id, is_recurring)
  WHERE deleted_at IS NULL AND is_recurring = true;

COMMENT ON COLUMN public.expenses.is_recurring IS 'true = gasto mensal recorrente (ex: aluguel, assinatura) cadastrado no onboarding ou marcado pelo usuário; false = lançamento pontual.';
