create or replace function public.unlink_google_identity()
returns void
language plpgsql
security definer
set search_path = auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autorizado';
  end if;

  delete from auth.identities
  where user_id = auth.uid()
    and provider = 'google';
end;
$$;
