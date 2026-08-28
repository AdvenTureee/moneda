-- ============================================================================
-- Supabase Database Linter — Security Fixes
--
-- Resolve 10 avisos WARN de segurança do Database Linter:
--   0011 Function Search Path Mutable       (set_updated_at, get_dashboard_page)
--   0014 Extension in Public                (pg_trgm, citext)
--   0028 Anon SECURITY DEFINER Executable   (get_dashboard_page, handle_new_user)
--   0029 Authenticated SECURITY DEFINER Executable (get_dashboard_page, handle_new_user, unlink_google_identity)
--   Auth Leaked Password Protection Disabled
--
-- Como aplicar: cole no Supabase Dashboard > SQL Editor e rode.
-- Pré-requisito: fazer backup do schema atual antes de executar.
-- ============================================================================

-- ============================================================================
-- BLOCO 1 — REVOKE EXECUTE: SECURITY DEFINER functions expostas via REST
-- ============================================================================
-- Estas funções rodam com privilégios do OWNER (postgres) e ficam expostas
-- em /rest/v1/rpc/<name>. Sem REVOKE, qualquer usuário anon/authenticated
-- pode invocá-las via API.

-- get_dashboard_page: chamada exclusivamente via service client (server-side).
--   Nenhum client (anon nem authenticated) deve invocá-la diretamente.
REVOKE EXECUTE ON FUNCTION public.get_dashboard_page(uuid, text) FROM anon, authenticated;

-- handle_new_user: trigger de auth.users (fires on signup).
--   Nunca deve ser chamável via API por ninguém.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- unlink_google_identity: chamada por usuário autenticado (perfil/actions.ts).
--   authenticated mantém acesso; anon não deve ter.
REVOKE EXECUTE ON FUNCTION public.unlink_google_identity() FROM anon;

-- ============================================================================
-- BLOCO 2 — Fix search_path mutable
-- ============================================================================
-- Sem search_path fixo, um atacante com controle sobre o schema search path
-- pode interceptar referências a objetos (search_path injection).

ALTER FUNCTION public.set_updated_at() SET search_path TO 'public';
ALTER FUNCTION public.get_dashboard_page(uuid, text) SET search_path TO 'public';

-- handle_new_user já tem search_path SET TO 'public' no schema original.

-- ============================================================================
-- BLOCO 3 — Mover extensões de public para extensions
-- ============================================================================
-- Extensões em public expõem objetos auxiliares (funções, tipos, operadores)
-- na API GraphQL/REST. Movê-las para o schema extensions (não exposto)
-- elimina essa superfície de ataque.

-- 3a. pg_trgm
--     O index expenses_description_trgm_idx referencia public.gin_trgm_ops.
--     Mover a extensão sem tratar isso quebra o index, então:
--     drop index → mover extensão → recriar index com schema qualificado.

DROP INDEX IF EXISTS public.expenses_description_trgm_idx;

ALTER EXTENSION pg_trgm SET SCHEMA extensions;

CREATE INDEX expenses_description_trgm_idx
  ON public.expenses
  USING gin (description extensions.gin_trgm_ops);

-- 3b. citext
--     O tipo citext é usado em profiles.email (public.citext).
--     ALTER EXTENSION SET SCHEMA move o tipo — o OID é preservado,
--     então colunas existentes continuam funcionando sem rewrite.
ALTER EXTENSION citext SET SCHEMA extensions;

-- ============================================================================
-- BLOCO 4 — Leaked Password Protection (Dashboard, não SQL)
-- ============================================================================
-- Esta correção NÃO pode ser feita via SQL — é uma configuração do
-- Supabase Auth (GoTrue). Aplique pelo Dashboard:
--
--   par
--
-- Isso faz o Auth checar senhas contra o banco do HaveIBeenPwned.org
-- no momento do signup, bloqueando senhas comprometidas em vazamentos.

-- ============================================================================
-- VERIFICAÇÃO PÓS-EXECUÇÃO
-- ============================================================================
-- Após rodar este script, confirme que os avisos sumiram:
--   Supabase Dashboard > Database > Database Linter > Re-run
--
-- Sanity check opcional (rode separadamente):
--
--   -- Funções expostas para anon? (deve retornar 0 linhas)
--   SELECT p.proname
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public'
--     AND p.prosecdef = true
--     AND has_function_privilege('anon', p.oid, 'EXECUTE');
--
--   -- search_path das funções (deve mostrar 'public')
--   SELECT p.proname, p.proconfig
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public'
--     AND p.proname IN ('set_updated_at', 'get_dashboard_page', 'handle_new_user');
--
--   -- Extensões no schema public? (deve retornar 0 linhas)
--   SELECT extname, extnamespace::regnamespace
--   FROM pg_extension
--   WHERE extnamespace::regnamespace::text = 'public';
