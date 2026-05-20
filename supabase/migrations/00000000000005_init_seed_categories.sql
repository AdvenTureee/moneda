-- 00000000000005_init_seed_categories.sql
-- Seed das 7 categorias default do Grana V1.
-- Idempotente: ON CONFLICT (id) DO NOTHING permite re-rodar sem erro.
--
-- Mantém paridade com src/data/mock.ts. Quando o seed mudar (palavras-chave
-- novas, categoria nova), criar uma migration nova — não editar esta.
--
-- Dependências: 00000000000002_init_core_tables.
-- Próxima migration: número real (ex: 20260601120000_...).

INSERT INTO public.categories (id, user_id, name, icon, color, keywords, sort_order, is_default)
VALUES
  ('alimentacao', NULL, 'Alimentação', '🍔', '#F59E0B',
    ARRAY['almoço','almoco','jantar','lanche','café','cafe','ifood','rappi',
          'uber eats','mcdonalds','restaurante','padaria','mercado','supermercado',
          'starbucks','pizza','hamburguer','sushi'],
    10, true),

  ('transporte', NULL, 'Transporte', '🚗', '#3B82F6',
    ARRAY['uber','99','taxi','táxi','gasolina','combustivel','metro','metrô',
          'onibus','ônibus','estacionamento','pedagio','pedágio','passagem'],
    20, true),

  ('lazer', NULL, 'Lazer', '🎮', '#8B5CF6',
    ARRAY['cinema','netflix','spotify','steam','jogo','show','teatro','bar',
          'balada','viagem','hotel','ingresso','disney','prime','hbo'],
    30, true),

  ('saude', NULL, 'Saúde', '💊', '#EF4444',
    ARRAY['farmácia','farmacia','médico','medico','dentista','exame',
          'hospital','remédio','remedio','plano de saúde','academia','gym'],
    40, true),

  ('casa', NULL, 'Casa', '🏠', '#10B981',
    ARRAY['aluguel','condomínio','condominio','luz','água','agua','internet',
          'telefone','gás','gas','faxina','reforma','móvel','movel'],
    50, true),

  ('educacao', NULL, 'Educação', '📚', '#06B6D4',
    ARRAY['curso','faculdade','escola','livro','udemy','alura','mensalidade',
          'material escolar','treinamento','inglês','ingles'],
    60, true),

  ('outros', NULL, 'Outros', '📦', '#6B7280',
    ARRAY[]::text[],
    99, true)
ON CONFLICT (id) DO NOTHING;
