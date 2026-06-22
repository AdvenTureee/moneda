create table if not exists public.rate_limit_buckets (
  key text primary key,
  timestamps timestamptz[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.rate_limit_buckets enable row level security;

revoke all on table public.rate_limit_buckets from anon, authenticated;
grant select, insert, update, delete on table public.rate_limit_buckets to service_role;

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window interval := make_interval(secs => greatest(1, p_window_seconds));
  v_timestamps timestamptz[] := '{}';
  v_oldest timestamptz;
  v_retry_after integer;
begin
  if p_key is null or length(p_key) = 0 then
    raise exception 'rate limit key is required';
  end if;

  if p_limit is null or p_limit < 1 then
    raise exception 'rate limit must be positive';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_key));

  select coalesce(
    array(
      select ts
      from unnest(rate_limit_buckets.timestamps) as ts
      where v_now - ts < v_window
      order by ts
    ),
    '{}'
  )
  into v_timestamps
  from public.rate_limit_buckets
  where key = p_key
  for update;

  if v_timestamps is null then
    v_timestamps := '{}';
  end if;

  if cardinality(v_timestamps) >= p_limit then
    v_oldest := v_timestamps[1];
    v_retry_after := greatest(
      1,
      ceiling(extract(epoch from (v_window - (v_now - v_oldest))))::integer
    );

    insert into public.rate_limit_buckets as bucket (key, timestamps, updated_at)
    values (p_key, v_timestamps, v_now)
    on conflict (key) do update
      set timestamps = excluded.timestamps,
          updated_at = excluded.updated_at;

    return jsonb_build_object('ok', false, 'retryAfterSec', v_retry_after);
  end if;

  v_timestamps := array_append(v_timestamps, v_now);

  insert into public.rate_limit_buckets as bucket (key, timestamps, updated_at)
  values (p_key, v_timestamps, v_now)
  on conflict (key) do update
    set timestamps = excluded.timestamps,
        updated_at = excluded.updated_at;

  return jsonb_build_object(
    'ok',
    true,
    'remaining',
    greatest(0, p_limit - cardinality(v_timestamps))
  );
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
