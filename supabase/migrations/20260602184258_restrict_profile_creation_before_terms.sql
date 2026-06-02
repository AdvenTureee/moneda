create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  accepted_terms boolean := coalesce((new.raw_user_meta_data->>'terms_accepted')::boolean, false);
begin
  insert into public.profiles (
    id,
    terms_accepted_at,
    terms_version,
    privacy_accepted_at
  )
  values (
    new.id,
    case
      when accepted_terms then nullif(new.raw_user_meta_data->>'terms_accepted_at', '')::timestamptz
      else null
    end,
    case
      when accepted_terms then nullif(new.raw_user_meta_data->>'terms_version', '')
      else null
    end,
    case
      when accepted_terms then nullif(new.raw_user_meta_data->>'privacy_accepted_at', '')::timestamptz
      else null
    end
  );

  return new;
end;
$$;
