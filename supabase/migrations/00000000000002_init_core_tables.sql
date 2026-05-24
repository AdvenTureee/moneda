-- 00000000000002_init_core_tables.sql
-- Cria as 7 tabelas do schema V1: profiles, categories, expenses,
-- incomes, budgets, ai_insights, whatsapp_messages.
-- Também cria os triggers de updated_at e handle_new_user (auth.users → profiles).
--
-- Convenções (ver DATABASE.md §2):
-- - snake_case em colunas; uuid PK com gen_random_uuid; bigint para
--   valores monetários (em centavos); timestamptz com DEFAULT now().
-- - Enums via CHECK em coluna text (evita lock pesado para evoluir).
-- - Soft delete em expenses e incomes (deleted_at).
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
  id                   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 text NOT NULL,
  phone                text,
  email                citext NOT NULL,
  avatar_url           text,
  timezone             text NOT NULL DEFAULT 'America/Sao_Paulo',
  currency             text NOT NULL DEFAULT 'BRL' CHECK (currency ~ '^[A-Z]{3}$'),
  -- Dia do mês em que o usuário recebe salário (1-31). NULL = não informado.
  salary_day           integer CHECK (salary_day IS NULL OR salary_day BETWEEN 1 AND 31),
  -- Dia de fechamento da fatura do cartão de crédito principal (1-28). NULL = não informado.
  billing_closing_day  integer CHECK (billing_closing_day IS NULL OR billing_closing_day BETWEEN 1 AND 28),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

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
  -- Valor do gasto em centavos (ex: R$ 32,50 = 3250). Sempre positivo e > 0.
  -- Representa saída de dinheiro; entradas ficam em public.incomes.
  amount_cents    bigint NOT NULL CHECK (amount_cents > 0),
  category_id     text NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  description     text NOT NULL CHECK (length(description) > 0 AND length(description) <= 500),
  -- Como o gasto foi pago.
  payment_method  text NOT NULL DEFAULT 'other'
                  CHECK (payment_method IN ('pix', 'debit', 'credit', 'cash', 'transfer', 'other')),
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
-- incomes: ganhos do usuário — recorrentes (salário) ou únicos (freelance, etc.).
-- Soft delete via deleted_at (mesma política de expenses).
-- ---------------------------------------------------------------------------
CREATE TABLE public.incomes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Valor recebido em centavos (ex: R$ 5.000,00 = 500000). Sempre positivo.
  amount_cents   bigint NOT NULL CHECK (amount_cents > 0),
  description    text NOT NULL CHECK (length(description) > 0 AND length(description) <= 500),
  -- Origem do ganho.
  source         text NOT NULL DEFAULT 'other'
                 CHECK (source IN ('salary', 'freelance', 'investment', 'rent', 'gift', 'other')),
  -- true = ganho que se repete (ex: salário mensal); false = ganho único (ex: freela pontual).
  is_recurring   boolean NOT NULL DEFAULT false,
  -- Regra de recorrência quando is_recurring = true.
  -- Formato previsto: { "frequency": "monthly", "day_of_month": 5 }
  -- NULL quando is_recurring = false.
  recurring_rule jsonb,
  -- Quando o ganho foi recebido (editável pelo usuário, como occurred_at em expenses).
  received_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT incomes_recurring_rule_chk CHECK (
    (is_recurring = false AND recurring_rule IS NULL) OR
    (is_recurring = true)
  )
);

CREATE TRIGGER incomes_set_updated_at
  BEFORE UPDATE ON public.incomes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- budgets: orçamentos mensais por categoria.
-- period = '2026-05' para orçamento pontual, 'default' para padrão recorrente.
-- UNIQUE(user_id, category_id, period) garante um orçamento por mês/categoria.
-- ---------------------------------------------------------------------------
CREATE TABLE public.budgets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id  text NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  -- '2026-05' = orçamento para maio/2026; 'default' = padrão mensal recorrente.
  period       text NOT NULL CHECK (period ~ '^([0-9]{4}-[0-9]{2}|default)$'),
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, category_id, period)
);

CREATE TRIGGER budgets_set_updated_at
  BEFORE UPDATE ON public.budgets
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
COMMENT ON TABLE  public.profiles                     IS 'Dados app-específicos do usuário; 1:1 com auth.users.';
COMMENT ON COLUMN public.profiles.phone               IS 'Número WhatsApp em formato E.164. Preenchido no onboarding.';
COMMENT ON COLUMN public.profiles.avatar_url          IS 'URL pública da foto de perfil no Supabase Storage (bucket: avatars). NULL até o usuário fazer upload.';
COMMENT ON COLUMN public.profiles.salary_day          IS 'Dia do mês em que o usuário recebe salário (1-31). Usado para calcular o período do orçamento.';
COMMENT ON COLUMN public.profiles.billing_closing_day IS 'Dia de fechamento da fatura do cartão de crédito principal (1-28). Usado para agrupar gastos no crédito.';
COMMENT ON TABLE  public.categories                   IS 'Categorias de despesa. user_id NULL = global default; user_id NOT NULL = custom do usuário (V2+).';
COMMENT ON TABLE  public.expenses                     IS 'Lançamentos de gasto (saídas). Soft-delete via deleted_at. Entradas ficam em public.incomes.';
COMMENT ON COLUMN public.expenses.amount_cents        IS 'Valor do gasto em centavos da moeda do usuário. Sempre > 0. Ex: R$ 32,50 = 3250.';
COMMENT ON COLUMN public.expenses.payment_method      IS 'Forma de pagamento usada: pix, debit, credit, cash, transfer, other.';
COMMENT ON COLUMN public.expenses.occurred_at         IS 'Quando o gasto aconteceu (visível ao usuário, editável). Diferente de created_at.';
COMMENT ON TABLE  public.incomes                      IS 'Lançamentos de ganho (entradas). Soft-delete via deleted_at. Gastos ficam em public.expenses.';
COMMENT ON COLUMN public.incomes.amount_cents         IS 'Valor recebido em centavos. Sempre > 0. Ex: R$ 5.000,00 = 500000.';
COMMENT ON COLUMN public.incomes.is_recurring         IS 'true = ganho recorrente (ex: salário); false = ganho único (ex: freela pontual).';
COMMENT ON TABLE  public.budgets                      IS 'Orçamentos mensais por categoria. period = YYYY-MM ou default (recorrente).';
COMMENT ON TABLE  public.ai_insights                  IS 'Saídas da IA persistidas com telemetria de tokens e custo.';
COMMENT ON COLUMN public.ai_insights.cost_micro_usd   IS 'Custo da inferência em micro-USD (1 USD = 1.000.000).';
COMMENT ON TABLE  public.whatsapp_messages            IS 'Log de mensagens WhatsApp recebidas pelo webhook.';
