create table if not exists public.pending_email_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  new_email text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create unique index if not exists pending_email_changes_user_id_key
  on public.pending_email_changes(user_id);

create index if not exists pending_email_changes_expires_at_idx
  on public.pending_email_changes(expires_at);
