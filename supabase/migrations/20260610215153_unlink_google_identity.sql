  create or replace function public.unlink_google_identity(target_user_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = auth
  as $$
  begin
    delete from auth.identities
    where user_id = target_user_id
      and provider = 'google';
  end;
  $$;
