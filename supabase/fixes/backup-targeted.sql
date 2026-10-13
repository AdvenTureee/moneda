-- ============================================================================
-- Backup direcionado — objetos que serão modificados pelo security-linter-fixes.sql
--
-- Rode no Supabase Dashboard > SQL Editor e copie o resultado.
-- Isso captura o DDL exato das 4 funções, 1 índice e 2 extensões que vamos alterar.
-- ============================================================================

-- 1. Funções SECURITY DEFINER (get_dashboard_page, handle_new_user, unlink_google_identity)
--    + função set_updated_at
SELECT n.nspname AS schema, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('get_dashboard_page', 'handle_new_user', 'unlink_google_identity', 'set_updated_at')
ORDER BY p.proname;

-- 2. Grants atuais dessas funções (para reverter REVOKE se necessário)
SELECT n.nspname AS schema, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS args,
       CASE (aclcontains(p.proacl, 'anon=X/postgres'))
         WHEN true THEN 'anon: EXECUTE' ELSE 'anon: revoked' END AS anon_perm,
       CASE (aclcontains(p.proacl, 'authenticated=X/postgres'))
         WHEN true THEN 'authenticated: EXECUTE' ELSE 'authenticated: revoked' END AS auth_perm
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('get_dashboard_page', 'handle_new_user', 'unlink_google_identity', 'set_updated_at')
ORDER BY p.proname;

-- 3. Índice que referencia pg_trgm (será droppado e recriado)
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname = 'expenses_description_trgm_idx';

-- 4. Extensões em public (serão movidas para extensions)
SELECT e.extname AS extension_name,
       n.nspname AS current_schema,
       e.extversion AS version
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE e.extname IN ('pg_trgm', 'citext');

-- 5. Triggers que usam set_updated_at (para confirmar que não quebram)
SELECT event_object_table AS table_name,
       trigger_name,
       action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%set_updated_at'
  AND trigger_schema = 'public';

-- 6. Colunas que usam tipo citext (para confirmar que ALTER EXTENSION é seguro)
SELECT table_name, column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND udt_name = 'citext';
