create index if not exists expenses_feed_history_idx
  on public.expenses (user_id, occurred_at desc, id desc)
  where deleted_at is null;

create index if not exists expenses_feed_scheduled_idx
  on public.expenses (user_id, occurred_at asc, id asc)
  where deleted_at is null;

create index if not exists expenses_feed_category_idx
  on public.expenses (user_id, category_id, occurred_at desc, id desc)
  where deleted_at is null;

create index if not exists expenses_feed_payment_method_idx
  on public.expenses (user_id, payment_method, occurred_at desc, id desc)
  where deleted_at is null;

do $$
begin
  create extension if not exists pg_trgm with schema extensions;
exception
  when others then
    raise notice 'pg_trgm extension unavailable; skipping trigram search index.';
end $$;

do $$
declare
  v_trgm_schema text;
begin
  select n.nspname
    into v_trgm_schema
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pg_trgm';

  if v_trgm_schema is not null then
    execute format(
      'create index if not exists expenses_description_trgm_idx on public.expenses using gin (description %I.gin_trgm_ops) where deleted_at is null',
      v_trgm_schema
    );
  end if;
end $$;
