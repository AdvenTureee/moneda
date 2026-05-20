-- 00000000000004_init_rls.sql
-- Habilita Row Level Security em todas as tabelas do schema public.
-- Mesmo no MVP single-user, RLS protege contra vazamento de anon key
-- e prepara o terreno para multi-tenant sem retrofit.
--
-- Padrão das políticas (ver DATABASE.md §10):
-- - auth.uid() = user_id em todas as operações por padrão.
-- - categories tem SELECT especial (NULL = global, visível para todos os autenticados).
-- - whatsapp_messages: writes apenas via service_role (webhook server-side).
-- - service_role bypassa RLS por padrão; não precisamos de policies pra ele.
--
-- Dependências: 00000000000002_init_core_tables.
-- Próxima: 00000000000005_init_seed_categories.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT é feito pelo trigger handle_new_user em contexto SECURITY DEFINER;
-- não criamos policy de INSERT para authenticated (anon não deve poder criar
-- profile sem passar por auth.users primeiro).

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- SELECT: vê defaults globais + suas próprias customs.
CREATE POLICY categories_select_visible ON public.categories
  FOR SELECT
  TO authenticated
  USING (user_id IS NULL OR auth.uid() = user_id);

-- INSERT: só categoria custom própria (não-default).
CREATE POLICY categories_insert_own_custom ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_default = false);

-- UPDATE: só nas próprias customs.
CREATE POLICY categories_update_own_custom ON public.categories
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND is_default = false)
  WITH CHECK (auth.uid() = user_id AND is_default = false);

-- DELETE: só nas próprias customs.
CREATE POLICY categories_delete_own_custom ON public.categories
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND is_default = false);

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY expenses_select_own ON public.expenses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY expenses_insert_own ON public.expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY expenses_update_own ON public.expenses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE policy existe para correção de erro de digitação no D+0;
-- app deve preferir UPDATE deleted_at = now() para preservar histórico.
CREATE POLICY expenses_delete_own ON public.expenses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- ai_insights
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_insights_select_own ON public.ai_insights
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE: na prática feito por job server-side com service_role
-- (bypass de RLS). Mantemos policies para o caso de chamada do client autenticado.
CREATE POLICY ai_insights_insert_own ON public.ai_insights
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY ai_insights_update_own ON public.ai_insights
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY ai_insights_delete_own ON public.ai_insights
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- whatsapp_messages
-- ---------------------------------------------------------------------------
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: usuário vê suas próprias mensagens (após resolução por phone).
-- Mensagens com user_id NULL (não resolvidas) ficam invisíveis para clientes —
-- apenas service_role pode lê-las.
CREATE POLICY whatsapp_messages_select_own ON public.whatsapp_messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE: apenas service_role (bypass nativo). Não criamos
-- policies para authenticated — webhook nunca vem com JWT de usuário.
