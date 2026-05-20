-- 00000000000003_init_indexes.sql
-- Índices baseados nos query patterns conhecidos (ver DATABASE.md §§5-8).
--
-- Estratégia geral:
-- - Índices parciais com WHERE deleted_at IS NULL para expenses (todas
--   as queries do app filtram soft-delete; índice menor = mais rápido).
-- - GIN em colunas array (tags, keywords) para buscas com && / @>.
-- - GIN com gin_trgm_ops em description para busca fuzzy do CFO.
-- - Constraints UNIQUE já criam índices próprios; não duplicamos.
--
-- Dependências: 00000000000002_init_core_tables.
-- Próxima: 00000000000004_init_rls.

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------

-- Feed/dashboard: lista paginada por usuário, mais recentes primeiro.
CREATE INDEX expenses_user_occurred_idx
  ON public.expenses (user_id, occurred_at DESC)
  WHERE deleted_at IS NULL;

-- Filtro por categoria + período (ex: "todos os gastos de Alimentação em maio").
CREATE INDEX expenses_user_category_occurred_idx
  ON public.expenses (user_id, category_id, occurred_at DESC)
  WHERE deleted_at IS NULL;

-- Filtro/busca por tag (tags && ARRAY['delivery']).
CREATE INDEX expenses_tags_gin_idx
  ON public.expenses USING GIN (tags);

-- Busca fuzzy em description (CFO conversacional V1+, search no feed).
CREATE INDEX expenses_description_trgm_idx
  ON public.expenses USING GIN (description gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------

-- Lista de categorias do usuário (defaults globais + custom).
-- ORDER BY sort_order, name é o caso comum na UI.
CREATE INDEX categories_user_sort_idx
  ON public.categories (user_id, sort_order, name);

-- Match de keyword durante parsing do WhatsApp.
-- (O parser hoje carrega tudo em memória, mas com custom categories
--  o conjunto cresce — GIN deixa o cost estável.)
CREATE INDEX categories_keywords_gin_idx
  ON public.categories USING GIN (keywords);

-- ---------------------------------------------------------------------------
-- ai_insights
-- ---------------------------------------------------------------------------
-- O índice em (user_id, type, period) já vem do UNIQUE constraint criado
-- em init_core_tables. Não precisamos de índice adicional.

-- ---------------------------------------------------------------------------
-- whatsapp_messages
-- ---------------------------------------------------------------------------

-- Histórico por telefone (mensagens pré-resolução de user_id).
CREATE INDEX whatsapp_messages_phone_received_idx
  ON public.whatsapp_messages (phone, received_at DESC);

-- Histórico por usuário (após resolução). Parcial: pula linhas órfãs.
CREATE INDEX whatsapp_messages_user_received_idx
  ON public.whatsapp_messages (user_id, received_at DESC)
  WHERE user_id IS NOT NULL;
