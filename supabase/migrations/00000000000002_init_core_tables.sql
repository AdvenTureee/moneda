-- 00000000000002_init_core_tables.sql
-- Cria as 5 tabelas do schema V1: profiles, categories, expenses,
-- ai_insights, whatsapp_messages. Também cria os triggers de
-- updated_at e o handle_new_user que sincroniza auth.users → profiles.
--
-- Convenções (ver DATABASE.md §2):
-- - snake_case em colunas; uuid PK com gen_random_uuid; bigint para
--   valores monetários (em centavos); timestamptz com DEFAULT now().
-- - Enums via CHECK em coluna text (evita lock pesado para evoluir).
-- - Soft delete em expenses (deleted_at).
--
-- Dependências: 00000000000001_init_extensions (pgcrypto, citext).
-- Próxima: 00000000000003_init_indexes.

-- ---------------------------------------------------------------------------
-- Helpers: trigger genérico para manter updated_at em sincronia.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- profiles: 1:1 com auth.users, dados específicos do app.
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  phone        text,
  email        citext NOT NULL,
  timezone     text NOT NULL DEFAULT 'America/Sao_Paulo',
  currency     text NOT NULL DEFAULT 'BRL' CHECK (currency ~ '^[A-Z]{3}$'),
  onboarded_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  -- E.164: '+' seguido de 7 a 15 dígitos, primeiro dígito 1-9.
  CONSTRAINT profiles_phone_e164_chk
    CHECK (phone IS NULL OR phone ~ '^\+[1-9][0-9]{6,14}$')
);

-- Phone único quando preenchido (partial unique permite múltiplos NULLs
-- durante onboarding, mas garante que dois usuários nunca terão o mesmo número).
CREATE UNIQUE INDEX profiles_phone_unique_idx
  ON public.profiles (phone)
  WHERE phone IS NOT NULL;

-- Email único (case-insensitive via citext).
CREATE UNIQUE INDEX profiles_email_unique_idx
  ON public.profiles (email);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Trigger handle_new_user: cria linha em profiles quando auth.users insere.
-- SECURITY DEFINER permite escrita em public.profiles a partir do contexto
-- de signup. Owner deve ser postgres/supabase_admin.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- categories: defaults globais (user_id NULL, is_default true) +
-- custom de usuário (V2; user_id NOT NULL, is_default false).
-- ---------------------------------------------------------------------------
CREATE TABLE public.categories (
  id          text PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  icon        text NOT NULL,
  color       text NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  keywords    text[] NOT NULL DEFAULT ARRAY[]::text[],
  sort_order  integer NOT NULL DEFAULT 100,
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  -- Garante coerência: default ↔ global; custom ↔ user-owned.
  CONSTRAINT categories_default_user_chk CHECK (
    (user_id IS NULL  AND is_default = true)  OR
    (user_id IS NOT NULL AND is_default = false)
  ),

  -- Slug não-vazio, sem espaços.
  CONSTRAINT categories_id_format_chk CHECK (id ~ '^[a-z][a-z0-9_]*$')
);

CREATE TRIGGER categories_set_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- expenses: a entidade central. Soft delete via deleted_at.
-- ---------------------------------------------------------------------------
CREATE TABLE public.expenses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents    bigint NOT NULL CHECK (amount_cents > 0),
  category_id     text NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  description     text NOT NULL CHECK (length(description) > 0 AND length(description) <= 500),
  source          text NOT NULL DEFAULT 'manual'
                  CHECK (source IN ('whatsapp', 'manual', 'import')),
  tags            text[] NOT NULL DEFAULT ARRAY[]::text[],
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  recurring_rule  jsonb,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  deleted_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER expenses_set_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ai_insights: persistência de outputs da IA com telemetria de custo.
-- UNIQUE(user_id, type, period) → re-geração faz ON CONFLICT.
-- ---------------------------------------------------------------------------
CREATE TABLE public.ai_insights (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type              text NOT NULL
                    CHECK (type IN ('monthly_summary', 'category_alert', 'spending_pattern')),
  period            text NOT NULL,
  message           text NOT NULL,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_used        text,
  prompt_tokens     integer CHECK (prompt_tokens IS NULL OR prompt_tokens >= 0),
  completion_tokens integer CHECK (completion_tokens IS NULL OR completion_tokens >= 0),
  -- Custo em micro-USD (1 USD = 1.000.000); bigint pra absorver acumulação
  -- multi-ano sem overflow. Ver DATABASE.md §7 para justificativa.
  cost_micro_usd    bigint CHECK (cost_micro_usd IS NULL OR cost_micro_usd >= 0),
  generated_at      timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, type, period)
);

-- ---------------------------------------------------------------------------
-- whatsapp_messages: log de mensagens recebidas (mesmo as falhas de parse).
-- user_id nullable: pode chegar de número não cadastrado.
-- Dedup de webhook retries via UNIQUE(provider, provider_message_id).
-- ---------------------------------------------------------------------------
CREATE TABLE public.whatsapp_messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  phone               text NOT NULL CHECK (phone ~ '^\+[1-9][0-9]{6,14}$'),
  raw_text            text NOT NULL,
  parsed_expense_id   uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  status              text NOT NULL DEFAULT 'received'
                      CHECK (status IN ('received', 'parsed', 'failed', 'responded')),
  parse_error         text,
  provider            text,
  provider_message_id text,
  received_at         timestamptz NOT NULL DEFAULT now(),
  responded_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Dedup parcial: aplica-se apenas quando provider + provider_message_id estão preenchidos.
CREATE UNIQUE INDEX whatsapp_messages_provider_msg_unique_idx
  ON public.whatsapp_messages (provider, provider_message_id)
  WHERE provider IS NOT NULL AND provider_message_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Comentários inline (acessíveis via \d+ no psql e via Supabase dashboard).
-- ---------------------------------------------------------------------------
COMMENT ON TABLE  public.profiles            IS 'Dados app-específicos do usuário; 1:1 com auth.users.';
COMMENT ON COLUMN public.profiles.phone      IS 'Número WhatsApp em formato E.164. Preenchido no onboarding.';
COMMENT ON TABLE  public.categories          IS 'Categorias de despesa. user_id NULL = global default; user_id NOT NULL = custom do usuário (V2+).';
COMMENT ON TABLE  public.expenses            IS 'Lançamentos de gasto. Soft-delete via deleted_at.';
COMMENT ON COLUMN public.expenses.amount_cents IS 'Valor em centavos da moeda do usuário. Sempre > 0.';
COMMENT ON COLUMN public.expenses.occurred_at  IS 'Quando o gasto aconteceu (visível ao usuário, editável). Diferente de created_at.';
COMMENT ON TABLE  public.ai_insights         IS 'Saídas da IA persistidas com telemetria de tokens e custo.';
COMMENT ON COLUMN public.ai_insights.cost_micro_usd IS 'Custo da inferência em micro-USD (1 USD = 1.000.000).';
COMMENT ON TABLE  public.whatsapp_messages   IS 'Log de mensagens WhatsApp recebidas pelo webhook.';
