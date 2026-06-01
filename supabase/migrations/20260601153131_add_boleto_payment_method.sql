alter table public.expenses
  drop constraint if exists expenses_payment_method_check;

alter table public.expenses
  add constraint expenses_payment_method_check
  check (payment_method in ('pix', 'debit', 'credit', 'cash', 'boleto', 'transfer', 'other'));
