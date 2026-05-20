-- 00000000000001_init_extensions.sql
-- Habilita extensões usadas pelo schema V1 do Grana.
-- Idempotente: usa IF NOT EXISTS. Pode rodar em ambiente já provisionado.
--
-- Dependências: nenhuma. Esta é a primeira migration.
-- Próxima: 00000000000002_init_core_tables.sql

-- pgcrypto: fornece gen_random_uuid() usado como default em PKs uuid.
-- Supabase já habilita em projetos novos, mas garantimos aqui.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- pg_trgm: índices GIN com trigram para busca fuzzy em expenses.description
-- (CFO conversacional V1+ e search no feed).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- citext: tipo case-insensitive para email em profiles.
CREATE EXTENSION IF NOT EXISTS citext;
