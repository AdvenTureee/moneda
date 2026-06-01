alter table public.profiles
  add column if not exists has_password boolean not null default false;

comment on column public.profiles.has_password is
  'True when the user has a password credential in Supabase Auth. Used only for account UI state.';

update public.profiles as p
set has_password = true
from auth.users as u
where u.id = p.id
  and coalesce(u.encrypted_password, '') <> '';
