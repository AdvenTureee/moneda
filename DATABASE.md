# Grana — Schema do Banco de Dados (Supabase / Postgres)

> Design canônico do schema Postgres do Grana a partir do V1. Esta é a fonte da verdade para a camada de dados — `ARCHITECTURE.md` referencia este documento.

> **Status:** desenho aprovado pelo CTO, aguardando review do CEO. Nada foi executado no Supabase ainda. Os arquivos em `supabase/migrations/` são prontos para `supabase db push` após aprovação.

---

## 1. Princípios

1. **Single-user no MVP, multi-tenant por desenho.** Toda tabela de dados de usuário carrega `user_id` referenciando `auth.users(id)`, e RLS está ativa desde o init. O custo de carregar `user_id` agora é zero; o custo de retrofitar depois é alto.
2. **Postgres como source of truth, não o app.** Constraints (`CHECK`, `NOT NULL`, FKs, UNIQUE) garantem invariantes mesmo se o app tiver bugs.
3. **Soft delete em dados financeiros.** `expenses.deleted_at` preserva histórico para analytics e auditoria. Hard delete só para tabelas operacionais (mensagens duplicadas, por exemplo).
4. **Forward-compatibility explícita.** Colunas e tabelas previstas para V2/V3 estão documentadas na §9, mas não criadas — minimiza migrações sem necessidade prematura.
5. **Convenções Postgres-nativas.** `snake_case`, `uuid` com `gen_random_uuid()` para PKs, `timestamptz` para timestamps, `bigint` (centavos) para valores monetários, `jsonb` para campos flexíveis.

---

## 2. Convenções

| Categoria | Convenção | Exemplo |
|---|---|---|
| Nomes de tabelas | `snake_case` plural | `expenses`, `whatsapp_messages` |
| Nomes de colunas | `snake_case` | `user_id`, `amount_cents`, `occurred_at` |
| Primary keys | `uuid` com `DEFAULT gen_random_uuid()` | salvo `categories.id` (text slug — ver §6) |
| Foreign keys | sufixo `_id`, FK declarada explicitamente | `category_id text REFERENCES categories(id)` |
| Timestamps | `timestamptz NOT NULL DEFAULT now()` | `created_at`, `updated_at`, `occurred_at` |
| Booleans | prefixo positivo (`is_`, `has_`) | `is_default`, `has_phone_verified` |
| Enums | `text` + `CHECK (col IN (...))` | mais fácil de evoluir que `CREATE TYPE` |
| Valores monetários | `bigint`, em centavos da menor unidade da moeda | `amount_cents bigint` |
| JSON livre | `jsonb NOT NULL DEFAULT '{}'::jsonb` | `metadata`, `recurring_rule` |
| Hex colors | `text` com `CHECK (color ~ '^#[0-9A-Fa-f]{6}$')` | `color text` |
| E.164 phone | `text` com `CHECK (phone ~ '^\+[1-9]\d{6,14}$')` | `phone text` |
| Emails | `citext` (case-insensitive) | `email citext` |

**Por que `bigint` para `amount_cents` (e não `integer`):** `integer` (int4) vai até R$ 21.474.836,47 — suficiente para gastos pessoais, mas insuficiente se um dia tratarmos transações empresariais (MEI — V4) ou agregados (`SUM(amount_cents)` em portfolios maiores). `bigint` (int8) custa 4 bytes extras por linha; em troca, eliminamos um risco silencioso de overflow em agregações. Decisão: `bigint` em todas as colunas monetárias.

**Por que `text` + `CHECK` em vez de `CREATE TYPE` enum:** Postgres `ENUM` torna adições de valor uma migração com lock pesado (até PG 12 era `ALTER TYPE ADD VALUE` sem reorganização). `text + CHECK` permite trocar o constraint com `VALIDATE` em background. Para um produto em rápida evolução, `text + CHECK` é mais barato.

**Timestamps separados:** Para `expenses` distinguimos `occurred_at` (quando o gasto aconteceu — visível ao usuário, editável) de `created_at` (quando a linha foi inserida — imutável, para auditoria). Os tipos TypeScript hoje têm `createdAt` ambíguo; no SQL ficamos explícitos.

---

## 3. Diagrama ER (Mermaid)

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : "1:1 (id)"
  AUTH_USERS ||--o{ EXPENSES : "user_id"
  AUTH_USERS ||--o{ AI_INSIGHTS : "user_id"
  AUTH_USERS ||--o{ WHATSAPP_MESSAGES : "user_id"
  AUTH_USERS ||--o{ CATEGORIES : "user_id (custom only, NULL = global)"

  CATEGORIES ||--o{ EXPENSES : "category_id"
  WHATSAPP_MESSAGES }o--o| EXPENSES : "parsed_expense_id"

  AUTH_USERS {
    uuid id PK
    text email
    jsonb raw_user_meta_data
  }

  PROFILES {
    uuid id PK_FK
    text name
    text phone "E.164, nullable até onboarding"
    citext email
    text timezone "default America/Sao_Paulo"
    text currency "ISO 4217, default BRL"
    timestamptz onboarded_at "NULL = onboarding incompleto"
    timestamptz created_at
    timestamptz updated_at
  }

  CATEGORIES {
    text id PK "slug, ex: alimentacao"
    uuid user_id FK "NULL = categoria global"
    text name
    text icon "emoji"
    text color "hex #RRGGBB"
    text_array keywords "GIN-indexed"
    int sort_order
    bool is_default
    timestamptz created_at
    timestamptz updated_at
  }

  EXPENSES {
    uuid id PK
    uuid user_id FK
    bigint amount_cents "> 0"
    text category_id FK
    text description
    text source "whatsapp|manual|import"
    text_array tags "GIN-indexed"
    timestamptz occurred_at "quando o gasto aconteceu"
    jsonb recurring_rule "V2 — null até lá"
    jsonb metadata
    timestamptz deleted_at "soft delete"
    timestamptz created_at
    timestamptz updated_at
  }

  AI_INSIGHTS {
    uuid id PK
    uuid user_id FK
    text type "monthly_summary|category_alert|spending_pattern"
    text period "ex: 2026-05"
    text message "markdown"
    jsonb metadata
    text model_used "ex: llama-3.3-70b-versatile"
    int prompt_tokens
    int completion_tokens
    int cost_micro_usd "custo da inferência em micro-USD"
    timestamptz generated_at
    timestamptz created_at
  }

  WHATSAPP_MESSAGES {
    uuid id PK
    uuid user_id FK "NULL até resolver pelo phone"
    text phone "E.164"
    text raw_text
    uuid parsed_expense_id FK
    text status "received|parsed|failed|responded"
    text parse_error
    text provider "evolution_api|waha|twilio"
    text provider_message_id "dedup"
    timestamptz received_at
    timestamptz responded_at
    timestamptz created_at
  }
```

### Diagrama ER (ASCII para quem não tem Mermaid)

```
                  ┌──────────────────┐
                  │   auth.users     │  (gerenciado pelo Supabase Auth)
                  │ id (uuid) PK     │
                  │ email            │
                  │ raw_user_meta…   │
                  └────────┬─────────┘
                           │ 1:1
              ┌────────────▼────────────┐
              │      profiles           │
              │ id (uuid) PK + FK→users │
              │ name, phone, email      │
              │ timezone, currency      │
              │ onboarded_at            │
              └─────────────────────────┘
                           │
        ┌──────────────────┼─────────────────────────┐
        │ 1:N              │ 1:N                     │ 1:N
        ▼                  ▼                         ▼
┌──────────────┐  ┌──────────────────┐    ┌──────────────────────┐
│  expenses    │  │   ai_insights    │    │  whatsapp_messages   │
│ id PK        │  │ id PK            │    │ id PK                │
│ user_id FK   │  │ user_id FK       │    │ user_id FK (nullable)│
│ category_id  │──┐ type, period     │    │ phone (E.164)        │
│ amount_cents │  │ message (md)     │    │ raw_text             │
│ description  │  │ model_used       │    │ parsed_expense_id ───┘──► expenses.id
│ tags[]       │  │ cost_micro_usd   │    │ status, provider     │
│ occurred_at  │  │ generated_at     │    │ received_at          │
│ deleted_at   │  └──────────────────┘    └──────────────────────┘
└──────┬───────┘
       │ N:1
       ▼
┌────────────────────────┐
│      categories        │
│ id (text/slug) PK      │
│ user_id FK (nullable)  │  ← NULL = categoria global (default)
│ name, icon, color      │
│ keywords text[]        │
│ sort_order, is_default │
└────────────────────────┘
```

---

## 4. Identidade: `auth.users` + `profiles`

**Decisão:** Usar `auth.users` (Supabase Auth) como source-of-truth da identidade, com `public.profiles` 1:1 referenciando.

**Justificativa:** Supabase Auth gerencia senha, magic link, OAuth, refresh tokens, JWT — qualquer coisa que reimplementássemos seria pior e inseguro. `profiles` cobre apenas dados app-específicos (nome, telefone para WhatsApp, fuso, moeda, status de onboarding).

**Conexão:** `profiles.id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`. Quando o usuário for deletado em `auth.users` (LGPD), `profiles` e em cascata `expenses`, `ai_insights` etc. são removidos.

**Criação automática:** Trigger `on_auth_user_created` em `auth.users` insere uma linha em `public.profiles` (com `SECURITY DEFINER` para conseguir escrever no schema `public` a partir do contexto de signup). Detalhes em `00000000000002_init_core_tables.sql`.

**Phone (E.164):** `NULL` na criação (Supabase Auth pode autenticar por email/OAuth sem phone), preenchido no onboarding. `UNIQUE WHERE phone IS NOT NULL` (partial unique index — Postgres permite múltiplos `NULL`s, mas dois usuários nunca podem reivindicar o mesmo número).

**Email duplicado em `profiles`?** Sim. Justificativa: simplifica queries (`SELECT name, email FROM profiles WHERE id = ?` sem join cross-schema com `auth.users`). É denormalização leve; mantemos sincronia via trigger no signup. Não atualizamos `profiles.email` em troca de email (raro) — escrevemos no app na próxima alteração.

---

## 5. Tabela: `expenses`

A entidade central. Cada linha = um gasto.

### Decisões

- **`amount_cents bigint NOT NULL CHECK (amount_cents > 0)`** — centavos da moeda do usuário. `bigint` por overflow (§2). `CHECK > 0` porque "gasto zero" não faz sentido; reembolsos viriam em uma tabela `refunds` (V3+).
- **`category_id text NOT NULL REFERENCES categories(id) ON DELETE RESTRICT`** — `RESTRICT` impede deletar categoria que tem despesas atreladas. `categories.id` é `text` (slug) — ver §6.
- **`source text NOT NULL CHECK (source IN ('whatsapp','manual','import')) DEFAULT 'manual'`** — origem do gasto. Extensível para `'open_banking'`, `'photo'` em V3.
- **`tags text[] NOT NULL DEFAULT '{}'`** — array Postgres. **Justificativa:** tags são metadados leves, baixa cardinalidade por linha (raramente >3 tags), e não precisam ser entidade própria. Normalizar com `expense_tags` (M:N) custaria 2 joins por query do feed; com array + GIN index, filtros como `tags && ARRAY['delivery']` são rápidos. Brief recomendava `text[]` — confirmamos.
- **`occurred_at timestamptz NOT NULL DEFAULT now()`** — quando o gasto aconteceu (editável pelo usuário). `created_at` (imutável) registra quando a linha foi inserida.
- **`deleted_at timestamptz NULL`** — soft delete. Views/queries do app filtram `WHERE deleted_at IS NULL`. Analytics futuras podem ler com tudo.
- **`recurring_rule jsonb NULL`** — placeholder para V2. Formato previsto: `{ "frequency": "monthly", "day_of_month": 15, "ends_at": null }`. Hoje sempre NULL.
- **`metadata jsonb NOT NULL DEFAULT '{}'::jsonb`** — escape hatch para campos não-críticos (ex: confidence score do parsing, IP do request). Evita migrations para campos experimentais.

### Por que não criar `whatsapp_message_id` em `expenses`?

A relação é unidirecional: `whatsapp_messages.parsed_expense_id → expenses.id`. Quem precisa do raw text faz `SELECT … FROM whatsapp_messages WHERE parsed_expense_id = ?`. Adicionar coluna espelhada em `expenses` cria FK circular sem ganho de query — descartado.

### Índices

```sql
-- Feed/dashboard (uso principal)
CREATE INDEX expenses_user_occurred_idx
  ON expenses (user_id, occurred_at DESC)
  WHERE deleted_at IS NULL;

-- Filtro por categoria
CREATE INDEX expenses_user_category_occurred_idx
  ON expenses (user_id, category_id, occurred_at DESC)
  WHERE deleted_at IS NULL;

-- Busca por tag
CREATE INDEX expenses_tags_gin_idx ON expenses USING GIN (tags);

-- Busca por descrição (fuzzy / trigram)
CREATE INDEX expenses_description_trgm_idx
  ON expenses USING GIN (description gin_trgm_ops);
```

Não indexamos `(user_id, deleted_at)` porque o filtro `WHERE deleted_at IS NULL` já entra nos índices parciais acima.

---

## 6. Tabela: `categories`

### Decisões

- **PK `id text` (slug)** — ex: `'alimentacao'`, `'transporte'`. **Justificativa:** humano-legível em queries, logs, prompts da IA (passamos os slugs para o modelo de categorização — slugs falam mais que UUIDs). Brief recomendava `text`; confirmamos.
- **`user_id uuid NULL REFERENCES auth.users(id) ON DELETE CASCADE`** — `NULL` = categoria global default (visível para todos). `NOT NULL` = categoria custom do usuário (V2). RLS de SELECT permite ler ambas.
- **`is_default boolean NOT NULL DEFAULT false`** — flag explícita; CHECK constraint garante coerência:
  `CHECK ((user_id IS NULL AND is_default = true) OR (user_id IS NOT NULL AND is_default = false))`.
- **Slug collision em V2 (custom categories):** No V1 só existem categorias globais (`user_id IS NULL`), com slugs simples como `'alimentacao'`. Em V2, custom categories de usuário usarão slug namespaced no formato `user_<short_id>_<slug>` (ex: `user_a1b2c3_brindes_clientes`). Mantém PK `text` global, evita colisão entre usuários, e ainda é legível em logs.
- **`keywords text[]`** — usado pelo parser de WhatsApp para fazer match determinístico antes de cair na IA. Brief perguntou se ia para tabela separada `category_keywords`: para 7 categorias com ~15 keywords cada (~105 strings), array com GIN index é estritamente melhor. Tabela separada faria sentido se keywords tivessem metadados próprios (peso, idioma), o que não é o caso.
- **`color text CHECK (color ~ '^#[0-9A-Fa-f]{6}$')`** — hex `#RRGGBB`. CHECK garante formato no banco; UI não precisa defender-se.

### Índices

```sql
CREATE INDEX categories_user_idx ON categories (user_id, sort_order, name);
CREATE INDEX categories_keywords_gin_idx ON categories USING GIN (keywords);
```

---

## 7. Tabela: `ai_insights`

Insights gerados pela IA (Groq) e persistidos para evitar re-geração e tracking de custo.

### Decisões

- **`type text CHECK (type IN ('monthly_summary','category_alert','spending_pattern'))`** — três tipos hoje; extensível.
- **`period text NOT NULL`** — formato livre por tipo:
  - `monthly_summary`: `'2026-05'`
  - `category_alert`: `'2026-05:alimentacao'` (período + categoria)
  - `spending_pattern`: `'2026-W21'` (semana ISO)
- **`UNIQUE (user_id, type, period)`** — um insight por user/type/period. Re-geração faz `ON CONFLICT (user_id, type, period) DO UPDATE`.
- **`model_used text`** — ex: `'llama-3.3-70b-versatile'`. Necessário para auditoria de custo e A/B de modelos.
- **`prompt_tokens integer`, `completion_tokens integer`** — telemetria de tokens.
- **`cost_micro_usd bigint`** — custo da inferência em **micro-USD** (1 USD = 1.000.000 micro-USD). **Justificativa:** Groq cobra em USD com preços que vão a 4–6 casas decimais por milhão de tokens. `cost_cents` (USD cents) perderia precisão. `cost_micro_usd bigint` cobre até ~9 trilhões de USD em custo cumulativo. A UI converte para BRL on-the-fly se quiser exibir.
- **`message text NOT NULL`** — corpo markdown renderizado pela UI.
- **`metadata jsonb`** — escape hatch (ex: alerts emitidos, breakdown extra).

### Índices

```sql
CREATE INDEX ai_insights_user_period_idx ON ai_insights (user_id, type, period DESC);
```

A constraint `UNIQUE(user_id, type, period)` já cria índice próprio; o índice acima é redundante e foi removido — usamos só o do `UNIQUE`.

---

## 8. Tabela: `whatsapp_messages`

Log de mensagens recebidas, mesmo as que falharam parsing. **Auditoria + debugging + base para "CFO conversacional" do V1.**

### Decisões

- **`user_id uuid NULL`** — pode chegar mensagem de número não cadastrado. Resolução é feita no webhook: lookup por `phone` em `profiles`. Se achar, preencher `user_id`; senão, manter NULL (e responder "não te conheço, cadastre-se em…").
- **`phone text NOT NULL CHECK`** — E.164. Sempre presente.
- **`parsed_expense_id uuid REFERENCES expenses(id) ON DELETE SET NULL`** — link para o expense gerado. `SET NULL` se a expense for hard-deletada (raro).
- **`status text CHECK`** — fluxo: `received → parsed | failed → responded`.
- **`parse_error text`** — preenchido quando `status = 'failed'`; útil para análise offline.
- **`provider text` + `provider_message_id text`** — `UNIQUE(provider, provider_message_id)` para idempotência: se o provedor reenvia o mesmo webhook (retry), não duplicamos. Hoje `provider` é `NULL` até decidirmos Evolution/WAHA/Twilio (issue GAB-13?).
- **`received_at`, `responded_at`** — métricas de latência.

### Índices

```sql
-- Histórico por telefone (mensagens não autenticadas ainda)
CREATE INDEX whatsapp_messages_phone_received_idx
  ON whatsapp_messages (phone, received_at DESC);

-- Histórico por usuário (após resolução)
CREATE INDEX whatsapp_messages_user_received_idx
  ON whatsapp_messages (user_id, received_at DESC)
  WHERE user_id IS NOT NULL;

-- Dedup de webhooks (constraint cria índice automaticamente)
-- ALTER TABLE: UNIQUE (provider, provider_message_id) WHERE provider_message_id IS NOT NULL
```

---

## 9. Plano de evolução (V1 → V3+)

Tabelas/colunas previstas mas **não criadas ainda**. Esta seção é o backlog do schema — cada item vira uma migration própria quando a feature for priorizada.

### V2 — Engajamento, metas e recorrências

**`budgets`** — orçamento mensal por categoria.
```sql
-- esboço, NÃO criar agora
CREATE TABLE budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id text NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  period text NOT NULL,            -- '2026-05' ou 'recurring' (padrão mensal)
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id, period)
);
```

**`recurring_expenses`** ou ativar `expenses.recurring_rule jsonb` — duas escolhas:
- **Opção A (preferida):** tabela `recurring_expenses` (template) + cron que materializa `expenses` reais quando a data chega. Histórico fica natural em `expenses`; o template é editável sem mexer no passado.
- **Opção B:** apenas usar `expenses.recurring_rule jsonb` no template e as instâncias materializadas como expenses normais com referência ao template. Mais simples mas obriga `recurring_template_id` em expenses.
- **Decisão antecipada para V2:** Opção A, tabela separada. `expenses.recurring_rule` no V1 fica reservada mas sem uso — pode ser removida em uma migration de cleanup se Opção A vencer. (Reservar agora evita ALTER TABLE depois.)

**`categories` extensão (custom):** já suportado por desenho — basta o app permitir INSERT com `user_id` setado. Sem migration necessária.

**`couples` / `shared_accounts`** — "Modo Casal" (V2 product feature):
```sql
-- esboço
CREATE TABLE couples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  secondary_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (primary_user_id, secondary_user_id)
);
-- expenses.shared_with_couple_id uuid REFERENCES couples(id)
-- RLS: SELECT permite expenses do parceiro se shared_with_couple_id != NULL
```

### V3 — Open Banking, fotos, CFO completo

**`bank_accounts`, `bank_transactions`** — conexão Open Banking.
**`receipts`** — uploads de cupom fiscal via Supabase Storage; `expenses.receipt_id`.
**`conversation_messages`** — histórico do CFO conversacional (perguntas/respostas), separado de `whatsapp_messages` para não poluir.

### V4 — MEI, IR

**`mei_profiles`, `tax_brackets`, `dedutible_expense_categories`** — feature MEI.
**`annual_reports`** — relatórios cacheados de IR.

---

## 10. RLS (Row Level Security)

**Princípio:** RLS está ativo desde o V1 mesmo em modo single-user. Custo é zero quando há um único usuário, e proteção é total se algum dia o `SUPABASE_ANON_KEY` vazar ou o app esquecer um filtro.

### Política por tabela

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | `auth.uid() = id` | `auth.uid() = id` (trigger faz) | `auth.uid() = id` | nunca (cascata do auth.users) |
| `categories` | `user_id IS NULL OR auth.uid() = user_id` | `auth.uid() = user_id AND is_default = false` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `expenses` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` (mas app prefere UPDATE deleted_at) |
| `ai_insights` | `auth.uid() = user_id` | `auth.uid() = user_id` (geralmente via service role) | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `whatsapp_messages` | `auth.uid() = user_id` | service role apenas | service role apenas | nunca |

### Service role bypass

Operações server-side que precisam contornar RLS (webhook do WhatsApp escrevendo `whatsapp_messages` com `user_id` ainda nulo; job de IA escrevendo `ai_insights`) usam o `SUPABASE_SERVICE_ROLE_KEY` — `service_role` ignora RLS por padrão. Esse client **nunca** vai para o browser; vive só em API routes do Next.

### Default categories são visíveis para todos os autenticados

Política `categories SELECT`: `user_id IS NULL OR auth.uid() = user_id`. Anon (não-autenticado) **não** vê categorias — RLS bloqueia tudo se `auth.uid()` é NULL. Isso é intencional: a UI sempre roda autenticada.

---

## 11. Mapeamento TypeScript ↔ SQL

A coluna `snake_case` do SQL é convertida para `camelCase` no app via:
- Tipos gerados (`supabase gen types typescript`) — geram `interface Tables<'expenses'>['Row']` com nomes do banco. Wrappers em `lib/expenses.ts` fazem a tradução para os tipos do `src/types/index.ts`.
- Alternativa: usar `select()` com aliases (`select('amount_cents:amount, occurred_at:createdAt')`) — funcional mas frágil. Preferimos o wrapper explícito.

| `src/types/index.ts` | tabela SQL | observação |
|---|---|---|
| `User.id` | `profiles.id` (= `auth.users.id`) | UUID |
| `User.name` | `profiles.name` | |
| `User.email` | `profiles.email` | espelhado de `auth.users.email` |
| `User.phone` | `profiles.phone` | E.164, nullable até onboarding |
| `User.createdAt` | `profiles.created_at` | |
| `Category.id` | `categories.id` | text slug |
| `Category.name` | `categories.name` | |
| `Category.icon` | `categories.icon` | |
| `Category.color` | `categories.color` | hex |
| `Category.keywords` | `categories.keywords` | `text[]` |
| `Expense.id` | `expenses.id` | uuid |
| `Expense.userId` | `expenses.user_id` | |
| `Expense.amount` | `expenses.amount_cents` | rename intencional: explicita a unidade |
| `Expense.category` | `expenses.category_id` | rename para deixar claro que é FK |
| `Expense.description` | `expenses.description` | |
| `Expense.source` | `expenses.source` | |
| `Expense.tags` | `expenses.tags` | `text[]` |
| `Expense.createdAt` | `expenses.occurred_at` | **mapeamento crítico:** o `createdAt` do TS hoje é "quando o gasto aconteceu"; no SQL isso é `occurred_at`. `expenses.created_at` é audit-only. |
| `AIInsight.id` | `ai_insights.id` | |
| `AIInsight.userId` | `ai_insights.user_id` | |
| `AIInsight.type` | `ai_insights.type` | |
| `AIInsight.message` | `ai_insights.message` | markdown |
| `AIInsight.period` | `ai_insights.period` | |
| `AIInsight.createdAt` | `ai_insights.generated_at` | mesmo padrão de `occurred_at`: `generated_at` é o evento; `created_at` é insert |
| `WhatsAppMessage.id` | `whatsapp_messages.id` | |
| `WhatsAppMessage.phone` | `whatsapp_messages.phone` | |
| `WhatsAppMessage.rawText` | `whatsapp_messages.raw_text` | |
| `WhatsAppMessage.parsedExpenseId` | `whatsapp_messages.parsed_expense_id` | |
| `WhatsAppMessage.status` | `whatsapp_messages.status` | |
| `WhatsAppMessage.createdAt` | `whatsapp_messages.received_at` | mesma lógica |

**Wrapper recomendado em `lib/expenses.ts` (na issue filha de execução):**
```ts
function rowToExpense(row: ExpensesRow): Expense {
  return {
    id: row.id,
    userId: row.user_id,
    amount: row.amount_cents,
    category: row.category_id,
    description: row.description,
    source: row.source as ExpenseSource,
    tags: row.tags,
    createdAt: new Date(row.occurred_at),
  };
}
```

---

## 12. Geração de tipos TypeScript

**Não executado nesta issue.** Comando para rodar quando o board tiver Supabase CLI configurado e as migrations aplicadas:

```bash
# requer login no Supabase CLI e SUPABASE_PROJECT_ID em .env
npx supabase gen types typescript \
  --project-id "$SUPABASE_PROJECT_ID" \
  --schema public \
  > src/types/supabase.ts
```

O arquivo gerado exporta:
- `Database` (interface raiz com todos os schemas)
- `Tables<'expenses'>['Row']`, `['Insert']`, `['Update']`
- Enums e composite types

Esses tipos **não substituem** `src/types/index.ts` — são camada de baixo nível para o client Supabase. Os tipos do `index.ts` continuam sendo a API pública do app; os wrappers em `lib/expenses.ts` traduzem.

---

## 13. Migrations

Os arquivos abaixo estão em `supabase/migrations/` e seguem o naming do Supabase CLI (`<timestamp>_<descricao>.sql`). Usamos prefixos `00000000000001…05` para o init — quando começarmos a versionar mudanças, novas migrations usam timestamps reais (`20260520120000_…`).

| Arquivo | Conteúdo |
|---|---|
| `00000000000001_init_extensions.sql` | `pgcrypto` (gen_random_uuid), `pg_trgm` (search), `citext` (emails) |
| `00000000000002_init_core_tables.sql` | profiles, categories, expenses, ai_insights, whatsapp_messages, trigger updated_at, trigger handle_new_user |
| `00000000000003_init_indexes.sql` | todos os índices descritos nesta doc |
| `00000000000004_init_rls.sql` | enable RLS + policies de §10 |
| `00000000000005_init_seed_categories.sql` | seed das 7 categorias default (`ON CONFLICT DO NOTHING`) |

Cada arquivo abre com um comentário SQL explicando objetivo e dependências.

---

## 14. Próximos passos pós-aprovação

Esta issue ([GAB-17](/GAB/issues/GAB-17)) termina aqui — apenas design + migrations no repo, **nada executado** no Supabase. Após aprovação do CEO, abrir issue filha "Aplicar schema V1 no Supabase + criar cliente" que:

1. Roda `supabase db push` (ou aplica migrations via dashboard).
2. Cria `src/lib/supabase.ts` (clients server-only e browser).
3. Gera tipos com `supabase gen types typescript`.
4. Reescreve `src/lib/expenses.ts` para usar Supabase atrás da mesma interface — sem alterar API routes nem componentes.
5. Mantém `src/data/mock.ts` como fallback de desenvolvimento behind feature flag (ou remove).
6. Testa golden path: signup → onboard com phone → criar expense via UI → ver no feed.

---

*Documento mantido pelo CTO. Última atualização: 2026-05-20.*
