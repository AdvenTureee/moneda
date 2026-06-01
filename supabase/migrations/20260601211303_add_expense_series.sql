create table if not exists public.expense_series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  amount_cents bigint not null,
  category_id text not null references public.categories(id) on delete restrict,
  description text not null,
  payment_method text not null default 'other',
  source text not null default 'manual',
  tags text[] not null default array[]::text[],
  metadata jsonb not null default '{}'::jsonb,
  start_at timestamp with time zone not null,
  day_of_month integer not null,
  total_occurrences integer,
  status text not null default 'active',
  ended_at timestamp with time zone,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint expense_series_kind_check
    check (kind in ('recurring', 'installment')),
  constraint expense_series_amount_cents_check
    check (amount_cents > 0),
  constraint expense_series_description_check
    check (length(description) > 0 and length(description) <= 500),
  constraint expense_series_payment_method_check
    check (payment_method in ('pix', 'debit', 'credit', 'cash', 'boleto', 'transfer', 'other')),
  constraint expense_series_source_check
    check (source in ('whatsapp', 'manual', 'import')),
  constraint expense_series_day_of_month_check
    check (day_of_month between 1 and 31),
  constraint expense_series_total_occurrences_check
    check (
      (kind = 'installment' and total_occurrences is not null and total_occurrences > 1)
      or (kind = 'recurring' and total_occurrences is null)
    ),
  constraint expense_series_status_check
    check (status in ('active', 'ended'))
);

comment on table public.expense_series is
  'Templates mensais de gastos recorrentes e parcelados. As ocorrências materializadas vivem em public.expenses.';

comment on column public.expense_series.day_of_month is
  'Dia preferido da ocorrência mensal. Meses curtos usam o último dia disponível.';

alter table public.expenses
  add column if not exists series_id uuid references public.expense_series(id) on delete set null,
  add column if not exists series_occurrence_index integer;

alter table public.expenses
  add constraint expenses_series_occurrence_index_check
  check (series_occurrence_index is null or series_occurrence_index > 0);

create unique index if not exists expenses_series_occurrence_unique_idx
  on public.expenses (series_id, series_occurrence_index);

create index if not exists expense_series_user_active_idx
  on public.expense_series (user_id, status, start_at)
  where deleted_at is null;

create index if not exists expenses_user_series_idx
  on public.expenses (user_id, series_id, series_occurrence_index)
  where deleted_at is null and series_id is not null;

create trigger expense_series_set_updated_at
  before update on public.expense_series
  for each row execute function public.set_updated_at();

alter table public.expense_series enable row level security;

create policy "expense_series_select_own"
  on public.expense_series
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "expense_series_insert_own"
  on public.expense_series
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "expense_series_update_own"
  on public.expense_series
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "expense_series_delete_own"
  on public.expense_series
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant all on table public.expense_series to authenticated;
grant all on table public.expense_series to service_role;

do $$
declare
  e record;
  v_series_id uuid;
  v_installment_current integer;
  v_installment_total integer;
  v_start_at timestamp with time zone;
begin
  for e in
    select *
    from public.expenses
    where deleted_at is null
      and series_id is null
      and (
        is_recurring = true
        or (
          payment_method = 'credit'
          and metadata->>'credit_purchase_type' = 'installment'
        )
      )
  loop
    if e.payment_method = 'credit' and e.metadata->>'credit_purchase_type' = 'installment' then
      v_installment_current := nullif(e.metadata->>'installment_current', '')::integer;
      v_installment_total := nullif(e.metadata->>'installment_total', '')::integer;

      if v_installment_current is null
        or v_installment_total is null
        or v_installment_current < 1
        or v_installment_total < 2
        or v_installment_current > v_installment_total
      then
        continue;
      end if;

      v_start_at := e.occurred_at - make_interval(months => v_installment_current - 1);

      insert into public.expense_series (
        user_id,
        kind,
        amount_cents,
        category_id,
        description,
        payment_method,
        source,
        tags,
        metadata,
        start_at,
        day_of_month,
        total_occurrences
      )
      values (
        e.user_id,
        'installment',
        e.amount_cents,
        e.category_id,
        e.description,
        e.payment_method,
        e.source,
        e.tags,
        e.metadata,
        v_start_at,
        extract(day from e.occurred_at)::integer,
        v_installment_total
      )
      returning id into v_series_id;

      update public.expenses
      set series_id = v_series_id,
          series_occurrence_index = v_installment_current
      where id = e.id;
    elsif e.is_recurring = true then
      insert into public.expense_series (
        user_id,
        kind,
        amount_cents,
        category_id,
        description,
        payment_method,
        source,
        tags,
        metadata,
        start_at,
        day_of_month,
        total_occurrences
      )
      values (
        e.user_id,
        'recurring',
        e.amount_cents,
        e.category_id,
        e.description,
        e.payment_method,
        e.source,
        e.tags,
        e.metadata,
        e.occurred_at,
        extract(day from e.occurred_at)::integer,
        null
      )
      returning id into v_series_id;

      update public.expenses
      set series_id = v_series_id,
          series_occurrence_index = 1
      where id = e.id;
    end if;
  end loop;
end $$;
