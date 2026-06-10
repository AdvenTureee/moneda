create extension if not exists pg_cron with schema extensions;

select cron.schedule('limpa-temp-users', '0 3 * * *', $$
  delete from auth.users
  where raw_user_meta_data->>'temp_email_change' = 'true'
    and created_at < now() - interval '24 hours';
$$);
