alter table profiles enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'own_profile_select') then
    create policy "own_profile_select" on profiles for select to authenticated using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'own_profile_insert') then
    create policy "own_profile_insert" on profiles for insert to authenticated with check (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'own_profile_update') then
    create policy "own_profile_update" on profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'own_profile_delete') then
    create policy "own_profile_delete" on profiles for delete to authenticated using (auth.uid() = id);
  end if;
end $$;
