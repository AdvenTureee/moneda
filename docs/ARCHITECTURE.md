# Moneda — Arquitetura Técnica

> Guia de referência para implementação do MVP 0 do Moneda: assistente financeiro pessoal via WhatsApp com IA.

> **Decisões confirmadas (2026-05-09):**
> - **Banco de dados:** Supabase (Postgres gerenciado) — a partir do V1
> - **IA:** Groq API (substitui Anthropic/Claude para reduzir custos)
> - **WhatsApp:** provedor ainda a definir (candidatos: Evolution API, WAHA)

---

## 1. Stack Completa

### Diagrama da Stack

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTE                              │
│   Browser (Next.js SSR/CSR) ←──── Tailwind CSS             │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP
┌────────────────────────▼────────────────────────────────────┐
│                   NEXT.JS APP ROUTER                        │
│                                                             │
│   app/                   app/api/                           │
│   ├── (dashboard)/       ├── expenses/route.ts              │
│   ├── (auth)/            ├── expenses/[id]/route.ts         │
│   └── layout.tsx         ├── dashboard/route.ts             │
│                          ├── whatsapp/webhook/route.ts      │
│                          ├── ai/summary/route.ts            │
│                          └── ai/categorize/route.ts         │
└──────────┬──────────────────────┬───────────────────────────┘
           │                      │
    ┌──────▼──────┐        ┌──────▼──────────────┐
    │  data/      │        │  INTEGRAÇÕES         │
    │  mock.ts    │        │                      │
    │  (MVP 0)    │        │  Groq API            │
    │             │        │  (llama-3.1 / 3.3)   │
    │  → Postgres │        │                      │
    │    (V1+)    │        │  Evolution API / WAHA│
    └─────────────┘        │  (WhatsApp)          │
                           └──────────────────────┘
```

### Escolhas Tecnológicas

| Tecnologia | Decisão | Justificativa |
|---|---|---|
| **Next.js 15 App Router** | Framework principal | App Router + API Routes = monolito simples; deploy em Vercel sem configuração; SSR e RSC nativos |
| **TypeScript strict** | Linguagem | Segurança de tipos nas entidades financeiras; autocompletar nas API routes; refactor seguro |
| **Tailwind CSS** | Estilo | Prototipagem rápida; zero CSS customizado no MVP; consistência visual sem design system próprio |
| **Groq API** | IA | `llama-3.1-8b-instant` para parsing/categorização (< 0.5s, ~10x mais barato que Claude); `llama-3.3-70b-versatile` para resumos mensais |
| **WhatsApp** *(TBD)* | Integração | Provedor a definir: Evolution API (open-source, self-hosted) ou WAHA (gerenciado). Twilio também avaliado para produção |
| **Vercel** | Deploy | Zero-config para Next.js; preview deployments por PR; edge functions disponíveis para webhooks |
| **Mock data (MVP 0)** | Persistência | Valida UX sem overhead de banco; migração para Postgres transparente depois |

---

## 2. Estrutura de Pastas do Projeto

```
moneda/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── expenses/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── api/
│   │       ├── expenses/route.ts
│   │       ├── expenses/[id]/route.ts
│   │       ├── dashboard/route.ts
│   │       ├── whatsapp/webhook/route.ts
│   │       ├── ai/summary/route.ts
│   │       └── ai/categorize/route.ts
│   ├── components/
│   │   ├── ui/
│   │   ├── expenses/
│   │   ├── dashboard/
│   │   └── layout/
│   ├── lib/
│   │   ├── groq.ts
│   │   ├── whatsapp.ts
│   │   ├── expenses.ts
│   │   ├── categories.ts
│   │   └── utils.ts
│   ├── types/
│   │   └── index.ts
│   └── data/
│       └── mock.ts
├── docs/                             # ← Toda a documentação aqui
├── public/
├── supabase/
├── scripts/
├── tests/
├── .env.example
├── middleware.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## 3. Entidades e Modelo de Dados

### Schemas TypeScript

```typescript
// types/index.ts

export type ExpenseSource = 'whatsapp' | 'manual' | 'import';
export type AIInsightType = 'monthly_summary' | 'category_alert' | 'spending_pattern';
export type WhatsAppMessageStatus = 'received' | 'parsed' | 'failed' | 'responded';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;           // E.164: "+5511999999999"
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;            // "Alimentação"
  icon: string;            // Emoji: "🍔"
  color: string;           // Hex: "#F59E0B"
  keywords: string[];      // ["almoço", "jantar", "ifood", "rappi", "uber eats"]
}

export interface Expense {
  id: string;
  userId: string;
  amount: number;          // Em centavos (evita float): 3500 = R$ 35,00
  category: string;        // Category.id
  description: string;     // "Almoço iFood"
  source: ExpenseSource;
  tags: string[];          // ["delivery", "trabalho"]
  createdAt: Date;
}

export interface AIInsight {
  id: string;
  userId: string;
  type: AIInsightType;
  message: string;         // Markdown formatado
  period: string;          // "2026-05" para mensal
  createdAt: Date;
}

export interface WhatsAppMessage {
  id: string;
  phone: string;           // E.164
  rawText: string;         // "almoco 35 reais ifood"
  parsedExpenseId: string | null;
  status: WhatsAppMessageStatus;
  createdAt: Date;
}
```

### Convenção: valores monetários em centavos

Todos os campos `amount` são armazenados em **centavos inteiros** (ex: `3500` = R$ 35,00).

```typescript
// lib/utils.ts
export function formatCurrency(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100);
}

export function parseCurrencyInput(text: string): number {
  const clean = text.replace(/[R$\s.]/g, '').replace(',', '.');
  return Math.round(parseFloat(clean) * 100);
}
```

---

## 4. Fluxo de Integração WhatsApp

```
Usuário (WhatsApp)
     │
     │  "almoco 35 reais ifood"
     ▼
Evolution API / WAHA
     │
     │  POST /api/whatsapp/webhook
     ▼
webhook/route.ts
     │
     ├─► parseWhatsAppMessage(rawText)
     ├─► Se parsing falhar → Groq llama-3.1-8b-instant
     ├─► saveExpense(...)
     └─► sendWhatsAppReply("✅ Registrado: R$ 35,00 — Alimentação às 12:47")
```

---

## 5. Fluxo de IA (Groq API)

| Caso de Uso | Modelo Groq | Latência | Custo |
|---|---|---|---|
| Categorização de texto livre | `llama-3.1-8b-instant` | < 0.5s | Muito baixo |
| Resposta de confirmação WhatsApp | `llama-3.1-8b-instant` | < 0.5s | Muito baixo |
| Resumo mensal de gastos | `llama-3.3-70b-versatile` | 1–3s | Baixo |
| Alerta de padrão anômalo | `llama-3.3-70b-versatile` | 1–3s | Baixo |

---

## 6. API Routes

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/expenses` | Listar despesas |
| `POST` | `/api/expenses` | Criar despesa manual |
| `GET` | `/api/expenses/:id` | Detalhe de despesa |
| `GET` | `/api/dashboard` | Métricas agregadas |
| `POST` | `/api/whatsapp/webhook` | Receber mensagem WhatsApp |
| `POST` | `/api/ai/summary` | Resumo mensal IA |
| `POST` | `/api/ai/categorize` | Categorizar texto livre |

---

## 7. Variáveis de Ambiente

```bash
# .env.example

# IA — Groq
GROQ_API_KEY=gsk_...

# WhatsApp — Evolution API (self-hosted)
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=...
EVOLUTION_INSTANCE_NAME=moneda

# Banco de dados — Supabase (V1+)
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Auth — Clerk (V1+)
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...

# App
NEXT_PUBLIC_APP_URL=https://moneda.info
```

---

## 8. Roadmap Técnico

| Decisão | MVP 0 | V1+ |
|---|---|---|
| Persistência | Mock em memória | **Supabase** ✓ |
| Auth | Sem auth | Clerk |
| WhatsApp | Webhook mockado | Evolution API ou WAHA |
| IA Categorização | Keyword match + Groq fallback | Groq llama-3.1-8b-instant ✓ |
| IA Análise | Texto mock | Groq llama-3.3-70b-versatile ✓ |
| Deploy | Vercel Hobby | Vercel Pro + Redis (Upstash) |
