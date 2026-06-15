drop function if exists public.unlink_google_identity(uuid);

revoke all on function public.unlink_google_identity() from public;
revoke all on function public.unlink_google_identity() from anon;
revoke all on function public.unlink_google_identity() from authenticated;
grant execute on function public.unlink_google_identity() to authenticated;

create table if not exists public.api_rate_limits (
  key text primary key,
  window_started_at timestamp with time zone not null default now(),
  request_count integer not null default 0,
  updated_at timestamp with time zone not null default now(),
  constraint api_rate_limits_key_length_check check (length(key) between 1 and 300),
  constraint api_rate_limits_request_count_check check (request_count >= 0)
);

comment on table public.api_rate_limits is
  'Server-side API rate limit buckets. Access is restricted to service_role.';

alter table public.api_rate_limits enable row level security;

revoke all on table public.api_rate_limits from public;
revoke all on table public.api_rate_limits from anon;
revoke all on table public.api_rate_limits from authenticated;
grant select, insert, update, delete on table public.api_rate_limits to service_role;

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_now timestamp with time zone := clock_timestamp();
  v_window_started_at timestamp with time zone;
  v_request_count integer;
  v_retry_after_seconds integer;
begin
  if p_key is null or length(trim(p_key)) = 0 then
    raise exception 'Rate limit key is required';
  end if;

  if length(p_key) > 300 then
    raise exception 'Rate limit key is too long';
  end if;

  if p_limit is null or p_limit < 1 then
    raise exception 'Rate limit must be positive';
  end if;

  if p_window_seconds is null or p_window_seconds < 1 then
    raise exception 'Rate limit window must be positive';
  end if;

  insert into public.api_rate_limits as bucket (
    key,
    window_started_at,
    request_count,
    updated_at
  )
  values (
    p_key,
    v_now,
    1,
    v_now
  )
  on conflict (key) do update
  set
    window_started_at = case
      when excluded.updated_at - bucket.window_started_at >= make_interval(secs => p_window_seconds)
        then excluded.updated_at
      else bucket.window_started_at
    end,
    request_count = case
      when excluded.updated_at - bucket.window_started_at >= make_interval(secs => p_window_seconds)
        then 1
      else bucket.request_count + 1
    end,
    updated_at = excluded.updated_at
  returning window_started_at, request_count
  into v_window_started_at, v_request_count;

  if v_request_count > p_limit then
    v_retry_after_seconds := greatest(
      1,
      ceiling(
        extract(epoch from (v_window_started_at + make_interval(secs => p_window_seconds) - v_now))
      )::integer
    );

    return jsonb_build_object(
      'ok', false,
      'remaining', 0,
      'retryAfterSec', v_retry_after_seconds
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'remaining', greatest(0, p_limit - v_request_count),
    'retryAfterSec', 0
  );
end;
$$;

comment on function public.consume_rate_limit(text, integer, integer) is
  'Consumes one request from a server-side rate limit bucket and returns {ok, remaining, retryAfterSec}.';

revoke all on function public.consume_rate_limit(text, integer, integer) from public;
revoke all on function public.consume_rate_limit(text, integer, integer) from anon;
revoke all on function public.consume_rate_limit(text, integer, integer) from authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
