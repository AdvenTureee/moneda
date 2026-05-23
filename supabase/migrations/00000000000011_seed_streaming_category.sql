-- 00000000000011_seed_streaming_category.sql
-- Adiciona a categoria default "Streaming" para separar assinaturas de mídia
-- (Netflix, Spotify, Disney+, etc.) da categoria "Lazer", que continua
-- cobrindo cinema, shows, jogos físicos, bares e viagens.
--
-- Também remove as palavras-chave de streaming de "lazer" para evitar conflito
-- de classificação no parser de WhatsApp/IA — sem essa limpeza, gastos como
-- "Netflix" ainda cairiam em Lazer.
--
-- Idempotente: INSERT ... ON CONFLICT (id) DO NOTHING e UPDATE com filtro
-- exato permitem re-execução.
--
-- Dependências: 00000000000005_init_seed_categories.

INSERT INTO public.categories (id, user_id, name, icon, color, keywords, sort_order, is_default)
VALUES
  ('streaming', NULL, 'Streaming', 'FilmStrip', '#A855F7',
    ARRAY['streaming','assinatura','netflix','spotify','disney','disney+',
          'prime','prime video','amazon prime','hbo','hbo max','max',
          'paramount','paramount+','apple tv','apple music','deezer',
          'youtube premium','youtube music','globoplay','crunchyroll',
          'twitch','dazn','star+','star plus','espn','premiere','looke',
          'mubi','telecine','tidal'],
    35, true)
ON CONFLICT (id) DO NOTHING;

-- Remove os termos de streaming de "lazer" para que o parser roteie
-- corretamente para a nova categoria. Mantém cinema, jogo, show, teatro,
-- bar, balada, viagem, hotel, ingresso (não relacionados a streaming).
UPDATE public.categories
SET keywords = ARRAY['cinema','jogo','show','teatro','bar','balada',
                     'viagem','hotel','ingresso']
WHERE id = 'lazer';
