# Grana — Arquitetura Técnica

> Guia de referência para implementação do MVP 0 do Grana: assistente financeiro pessoal via WhatsApp com IA.

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
    │  (MVP 0)    │        │  Claude API          │
    │             │        │  (Haiku / Sonnet)    │
    │  → Postgres │        │                      │
    │    (V1+)    │        │  Twilio / Evolution  │
    └─────────────┘        │  API (WhatsApp)      │
                           └──────────────────────┘
```

### Escolhas Tecnológicas

| Tecnologia | Decisão | Justificativa |
|---|---|---|
| **Next.js 14+ App Router** | Framework principal | App Router + API Routes = monolito simples; deploy em Vercel sem configuração; SSR e RSC nativos |
| **TypeScript strict** | Linguagem | Segurança de tipos nas entidades financeiras; autocompletar nas API routes; refactor seguro |
| **Tailwind CSS** | Estilo | Prototipagem rápida; zero CSS customizado no MVP; consistência visual sem design system próprio |
| **Groq API** | IA | `llama-3.1-8b-instant` para parsing/categorização (< 0.5s, ~10x mais barato que Claude); `llama-3.3-70b-versatile` para resumos mensais |
| **WhatsApp** *(TBD)* | Integração | Provedor a definir: Evolution API (open-source, self-hosted) ou WAHA (gerenciado). Twilio também avaliado para produção |
| **Vercel** | Deploy | Zero-config para Next.js; preview deployments por PR; edge functions disponíveis para webhooks |
| **Mock data (MVP 0)** | Persistência | Valida UX sem overhead de banco; migração para Postgres transparente depois |

---

## 2. Estrutura de Pastas do Projeto

```
grana/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (fonte, metadata, providers)
│   ├── page.tsx                  # Redirect para dashboard
│   ├── (dashboard)/              # Route group — páginas autenticadas
│   │   ├── layout.tsx            # Sidebar + header
│   │   ├── dashboard/
│   │   │   └── page.tsx          # Métricas, gráficos, insights
│   │   ├── expenses/
│   │   │   ├── page.tsx          # Lista de despesas
│   │   │   └── [id]/page.tsx     # Detalhe de despesa
│   │   └── settings/
│   │       └── page.tsx          # Config do usuário
│   └── api/                      # API Routes (backend)
│       ├── expenses/
│       │   ├── route.ts          # GET (lista) + POST (criar)
│       │   └── [id]/route.ts     # GET (detalhe)
│       ├── dashboard/
│       │   └── route.ts          # GET métricas agregadas
│       ├── whatsapp/
│       │   └── webhook/
│       │       └── route.ts      # POST webhook Twilio/Evolution
│       └── ai/
│           ├── summary/
│           │   └── route.ts      # POST resumo mensal
│           └── categorize/
│               └── route.ts      # POST categorização de texto
│
├── components/                   # Componentes React reutilizáveis
│   ├── ui/                       # Primitivos (Button, Card, Badge...)
│   ├── expenses/                 # ExpenseCard, ExpenseForm, ExpenseList
│   ├── dashboard/                # SpendingChart, CategoryBreakdown
│   └── layout/                   # Sidebar, Header, NavItem
│
├── lib/                          # Lógica de negócio e utilitários
│   ├── claude.ts                 # Cliente Anthropic SDK + prompt builders
│   ├── whatsapp.ts               # Parser de mensagens + resposta automática
│   ├── expenses.ts               # CRUD de despesas (mock no MVP 0)
│   ├── categories.ts             # Matching de categorias
│   └── utils.ts                  # formatCurrency, formatDate, etc.
│
├── types/                        # TypeScript interfaces e tipos
│   └── index.ts                  # Todas as entidades exportadas
│
├── data/                         # Mock data (MVP 0)
│   └── mock.ts                   # Usuários, despesas, categorias de exemplo
│
├── public/                       # Assets estáticos
├── .env.local                    # Variáveis de ambiente (não commitado)
├── .env.example                  # Template de variáveis
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
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

Todos os campos `amount` são armazenados em **centavos inteiros** (ex: `3500` = R$ 35,00). Use o utilitário:

```typescript
// lib/utils.ts
export function formatCurrency(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100);
}

export function parseCurrencyInput(text: string): number {
  // "35,90" | "R$ 35,90" | "35.90" → 3590
  const clean = text.replace(/[R$\s.]/g, '').replace(',', '.');
  return Math.round(parseFloat(clean) * 100);
}
```

---

## 4. Fluxo de Integração WhatsApp

### Diagrama de Sequência

```
Usuário (WhatsApp)
     │
     │  "almoco 35 reais ifood"
     ▼
Twilio / Evolution API
     │
     │  POST /api/whatsapp/webhook
     │  { From: "+5511...", Body: "almoco 35 reais ifood" }
     ▼
webhook/route.ts
     │
     ├─► parseWhatsAppMessage(rawText)
     │       │
     │       ├─ Extrai valor: 35.00 → 3500 centavos
     │       ├─ Extrai descrição: "almoço iFood"
     │       └─ Sugere categoria: "alimentacao" (keyword match)
     │
     ├─► Se parsing falhar → POST /api/ai/categorize (Groq llama-3.1-8b-instant)
     │
     ├─► saveExpense({ userId, amount, category, description, source: 'whatsapp' })
     │
     └─► sendWhatsAppReply("✅ Registrado: R$ 35,00 — Alimentação (iFood) às 12:47")
```

### Implementação do Parser

```typescript
// lib/whatsapp.ts

interface ParsedMessage {
  amount: number;           // centavos
  description: string;
  suggestedCategoryId: string | null;
}

const AMOUNT_PATTERNS = [
  /(\d+[.,]\d{2})\s*reais?/i,
  /r\$\s*(\d+[.,]\d{2})/i,
  /(\d+[.,]\d{2})/,
  /(\d+)\s*reais?/i,
  /(\d+)\s*conto/i,
];

export function parseWhatsAppMessage(
  text: string,
  categories: Category[]
): ParsedMessage | null {
  let amount: number | null = null;

  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const raw = match[1].replace(',', '.');
      amount = Math.round(parseFloat(raw) * 100);
      break;
    }
  }

  if (!amount) return null;

  const normalizedText = text.toLowerCase();
  const suggestedCategoryId = categories.find((cat) =>
    cat.keywords.some((kw) => normalizedText.includes(kw))
  )?.id ?? null;

  const amountStr = amount.toString();
  const description = text
    .replace(new RegExp(`${amountStr.slice(0, -2)}[.,]?\\d{0,2}\\s*(reais?|conto|r\\$)?`, 'gi'), '')
    .trim()
    .replace(/\s+/g, ' ')
    || 'Despesa via WhatsApp';

  return { amount, description, suggestedCategoryId };
}
```

### Webhook Handler

```typescript
// app/api/whatsapp/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { parseWhatsAppMessage } from '@/lib/whatsapp';
import { getCategories, saveExpense } from '@/lib/expenses';
import { categorizeWithAI } from '@/lib/groq';
import { formatCurrency } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const body = await req.formData();           // Twilio envia form-encoded
  const phone = body.get('From') as string;
  const rawText = body.get('Body') as string;

  const categories = await getCategories();
  let parsed = parseWhatsAppMessage(rawText, categories);

  if (!parsed) {
    return NextResponse.json({ error: 'Não entendi o valor' }, { status: 422 });
  }

  // Fallback: Claude Haiku categoriza se keyword match falhou
  if (!parsed.suggestedCategoryId) {
    parsed.suggestedCategoryId = await categorizeWithAI(rawText, categories);
  }

  const expense = await saveExpense({
    userId: 'mock-user-id',                    // MVP 0: usuário único
    amount: parsed.amount,
    category: parsed.suggestedCategoryId ?? 'outros',
    description: parsed.description,
    source: 'whatsapp',
    tags: [],
  });

  const category = categories.find((c) => c.id === expense.category);
  const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const reply = `✅ Registrado: ${formatCurrency(expense.amount)} — ${category?.name ?? 'Outros'} às ${time}`;

  // Resposta TwiML para Twilio
  return new NextResponse(
    `<?xml version="1.0"?><Response><Message>${reply}</Message></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  );
}
```

---

## 5. Fluxo de IA (Groq API)

> **Decisão confirmada (2026-05-09):** Groq substitui Anthropic/Claude para reduzir custos. A API do Groq é compatível com o padrão OpenAI (`openai` SDK com `baseURL`), sem migração complexa. Modelos open-source via Groq têm latência inferior a 1s e custo ~10x menor que Claude.

### Modelos e Casos de Uso

| Caso de Uso | Modelo Groq | Latência Esperada | Custo |
|---|---|---|---|
| Categorização de texto livre | `llama-3.1-8b-instant` | < 0.5s | Muito baixo |
| Resposta de confirmação WhatsApp | `llama-3.1-8b-instant` | < 0.5s | Muito baixo |
| Resumo mensal de gastos | `llama-3.3-70b-versatile` | 1–3s | Baixo |
| Alerta de padrão anômalo | `llama-3.3-70b-versatile` | 1–3s | Baixo |

**Pacote:** `npm install groq-sdk` (Groq fornece SDK oficial TypeScript, interface similar ao OpenAI SDK)

### Cliente Groq

```typescript
// lib/groq.ts
import Groq from 'groq-sdk';
import type { Category, Expense } from '@/types';

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function categorizeWithAI(
  text: string,
  categories: Category[]
): Promise<string> {
  const categoryList = categories
    .map((c) => `- ${c.id}: ${c.name} (${c.keywords.slice(0, 3).join(', ')})`)
    .join('\n');

  const response = await client.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    max_tokens: 50,
    messages: [
      {
        role: 'system',
        content: 'Você é um classificador de despesas financeiras. Responda APENAS com o id da categoria, sem explicações.',
      },
      {
        role: 'user',
        content: `Classifique: "${text}"\n\nCategorias disponíveis:\n${categoryList}`,
      },
    ],
  });

  const result = response.choices[0]?.message?.content ?? '';
  return result.trim().toLowerCase().replace(/[^a-z_]/g, '') || 'outros';
}

export async function generateMonthlySummary(
  expenses: Expense[],
  categories: Category[],
  period: string           // "2026-05"
): Promise<string> {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const byCategoryId = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  const breakdown = Object.entries(byCategoryId)
    .sort(([, a], [, b]) => b - a)
    .map(([id, amount]) => {
      const cat = categories.find((c) => c.id === id);
      return `- ${cat?.name ?? id}: R$ ${(amount / 100).toFixed(2)}`;
    })
    .join('\n');

  const [year, month] = period.split('-');
  const monthName = new Date(+year, +month - 1).toLocaleString('pt-BR', { month: 'long' });

  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 600,
    messages: [
      {
        role: 'system',
        content:
          'Você é um assistente financeiro pessoal. Analise os gastos e forneça insights práticos em português. Use markdown com emojis. Seja direto e construtivo.',
      },
      {
        role: 'user',
        content: `Resuma meus gastos de ${monthName} de ${year}:\n\nTotal: R$ ${(total / 100).toFixed(2)}\n\nPor categoria:\n${breakdown}`,
      },
    ],
  });

  return response.choices[0]?.message?.content ?? 'Não foi possível gerar o resumo.';
}

export async function detectSpendingAlerts(
  currentMonth: Expense[],
  previousMonths: Expense[][],
  categories: Category[]
): Promise<string[]> {
  const currentByCategory = aggregateByCategory(currentMonth);
  const alerts: string[] = [];

  for (const [catId, currentAmount] of Object.entries(currentByCategory)) {
    const historicalAmounts = previousMonths.map((month) =>
      aggregateByCategory(month)[catId] ?? 0
    );
    const avg = historicalAmounts.reduce((s, v) => s + v, 0) / (historicalAmounts.length || 1);

    if (avg > 0 && currentAmount > avg * 1.3) {
      const cat = categories.find((c) => c.id === catId);
      const pct = Math.round((currentAmount / avg - 1) * 100);
      alerts.push(`⚠️ ${cat?.name ?? catId} está ${pct}% acima da sua média histórica.`);
    }
  }

  return alerts;
}

function aggregateByCategory(expenses: Expense[]): Record<string, number> {
  return expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});
}
```

### Prompt Templates de Referência

```
# Categorização (llama-3.1-8b-instant — ultra-rápido)
SYSTEM: Você é um classificador de despesas financeiras. Responda APENAS com o id da categoria.
USER:   Classifique: "{texto}" \n\n Categorias: {lista}

# Resumo Mensal (llama-3.3-70b-versatile — qualidade)
SYSTEM: Você é um assistente financeiro pessoal. Analise os gastos e forneça insights práticos
        em português. Use markdown com emojis. Seja direto e construtivo.
USER:   Resuma meus gastos de {mês} de {ano}:
        Total: R$ {total}
        Por categoria:
        {breakdown}

# Alerta de Padrão (inline — não usa API separada)
# Lógica determinística: se categoria > média histórica * 1.3 → emite alerta.
```

---

## 6. API Routes do Next.js

### Tabela de Endpoints

| Método | Rota | Descrição | Corpo / Params |
|---|---|---|---|
| `GET` | `/api/expenses` | Listar despesas | `?userId&category&startDate&endDate&limit` |
| `POST` | `/api/expenses` | Criar despesa manual | `{ userId, amount, category, description, tags }` |
| `GET` | `/api/expenses/:id` | Detalhe de despesa | — |
| `GET` | `/api/dashboard` | Métricas agregadas | `?userId&period` (ex: `2026-05`) |
| `POST` | `/api/whatsapp/webhook` | Receber mensagem WhatsApp | Form-encoded (Twilio) ou JSON (Evolution) |
| `POST` | `/api/ai/summary` | Resumo mensal IA | `{ userId, period }` |
| `POST` | `/api/ai/categorize` | Categorizar texto livre | `{ text }` |

### Contrato de Resposta — `GET /api/dashboard`

```typescript
interface DashboardResponse {
  period: string;          // "2026-05"
  totalSpent: number;      // centavos
  expenseCount: number;
  topCategories: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;        // centavos
    percentage: number;    // 0–100
  }>;
  dailySpending: Array<{
    date: string;          // "2026-05-08"
    amount: number;
  }>;
  alerts: string[];        // Mensagens de alerta de padrão
}
```

### Contrato de Resposta — `POST /api/ai/summary`

```typescript
interface AISummaryResponse {
  period: string;
  markdown: string;        // Texto formatado do Claude Sonnet
  generatedAt: string;     // ISO 8601
}
```

---

## 7. Estrutura de Mock Data

```typescript
// data/mock.ts

import type { User, Category, Expense } from '@/types';

export const MOCK_USER: User = {
  id: 'user-001',
  name: 'Gabriel Mauro',
  email: 'gabriel@fieldcorp.com.br',
  phone: '+5511999999999',
  createdAt: new Date('2026-01-01'),
};

export const CATEGORIES: Category[] = [
  {
    id: 'alimentacao',
    name: 'Alimentação',
    icon: '🍔',
    color: '#F59E0B',
    keywords: ['almoço', 'almoco', 'jantar', 'lanche', 'café', 'cafe', 'ifood', 'rappi',
               'uber eats', 'mcdonalds', 'restaurante', 'padaria', 'mercado', 'supermercado'],
  },
  {
    id: 'transporte',
    name: 'Transporte',
    icon: '🚗',
    color: '#3B82F6',
    keywords: ['uber', '99', 'taxi', 'táxi', 'gasolina', 'combustivel', 'metro', 'metrô',
               'onibus', 'ônibus', 'estacionamento', 'pedagio', 'pedágio'],
  },
  {
    id: 'lazer',
    name: 'Lazer',
    icon: '🎮',
    color: '#8B5CF6',
    keywords: ['cinema', 'netflix', 'spotify', 'steam', 'jogo', 'show', 'teatro', 'bar',
               'balada', 'viagem', 'hotel', 'ingresso'],
  },
  {
    id: 'saude',
    name: 'Saúde',
    icon: '💊',
    color: '#EF4444',
    keywords: ['farmácia', 'farmacia', 'médico', 'medico', 'dentista', 'exame',
               'hospital', 'remédio', 'remedio', 'plano de saúde'],
  },
  {
    id: 'casa',
    name: 'Casa',
    icon: '🏠',
    color: '#10B981',
    keywords: ['aluguel', 'condomínio', 'condominio', 'luz', 'água', 'agua', 'internet',
               'telefone', 'gás', 'gas', 'faxina', 'reforma', 'móvel', 'movel'],
  },
  {
    id: 'educacao',
    name: 'Educação',
    icon: '📚',
    color: '#06B6D4',
    keywords: ['curso', 'faculdade', 'escola', 'livro', 'udemy', 'alura', 'mensalidade',
               'material escolar', 'treinamento'],
  },
  {
    id: 'outros',
    name: 'Outros',
    icon: '📦',
    color: '#6B7280',
    keywords: [],
  },
];

// Gera despesas de exemplo para os últimos 30 dias
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export const MOCK_EXPENSES: Expense[] = [
  { id: 'exp-001', userId: 'user-001', amount: 3500, category: 'alimentacao',
    description: 'Almoço iFood', source: 'whatsapp', tags: ['delivery'], createdAt: daysAgo(0) },
  { id: 'exp-002', userId: 'user-001', amount: 2800, category: 'transporte',
    description: 'Uber para trabalho', source: 'whatsapp', tags: [], createdAt: daysAgo(1) },
  { id: 'exp-003', userId: 'user-001', amount: 4990, category: 'lazer',
    description: 'Netflix mensal', source: 'manual', tags: ['assinatura'], createdAt: daysAgo(2) },
  { id: 'exp-004', userId: 'user-001', amount: 12000, category: 'casa',
    description: 'Conta de luz', source: 'manual', tags: [], createdAt: daysAgo(5) },
  { id: 'exp-005', userId: 'user-001', amount: 8750, category: 'alimentacao',
    description: 'Supermercado', source: 'manual', tags: ['mercado'], createdAt: daysAgo(7) },
  { id: 'exp-006', userId: 'user-001', amount: 15000, category: 'educacao',
    description: 'Curso TypeScript Alura', source: 'manual', tags: ['tech'], createdAt: daysAgo(10) },
  { id: 'exp-007', userId: 'user-001', amount: 4500, category: 'saude',
    description: 'Farmácia', source: 'whatsapp', tags: [], createdAt: daysAgo(12) },
  { id: 'exp-008', userId: 'user-001', amount: 6200, category: 'alimentacao',
    description: 'Jantar restaurante', source: 'whatsapp', tags: ['saida'], createdAt: daysAgo(14) },
];

// Helpers de acesso (simula queries de banco)
export function getExpensesByUser(userId: string): Expense[] {
  return MOCK_EXPENSES.filter((e) => e.userId === userId);
}

export function getExpensesByPeriod(userId: string, period: string): Expense[] {
  const [year, month] = period.split('-').map(Number);
  return MOCK_EXPENSES.filter((e) => {
    const d = new Date(e.createdAt);
    return e.userId === userId && d.getFullYear() === year && d.getMonth() + 1 === month;
  });
}
```

---

## 8. Considerações de Escalabilidade (V1+)

### 8.1 Persistência — Migração para Supabase

> **Decisão confirmada (2026-05-09):** Supabase como banco de dados a partir do V1 (substitui a opção anterior de Neon).
>
> **Fonte canônica do schema:** [`DATABASE.md`](./DATABASE.md) (criado em GAB-17). Esta seção descreve o **caminho de migração**; o desenho completo de tabelas, índices, RLS e plano de evolução V1→V3 está no `DATABASE.md` para não duplicar conteúdo aqui.

O MVP 0 usa `data/mock.ts`. A camada de acesso a dados em `lib/expenses.ts` abstrai a fonte, permitindo trocar o mock por Supabase sem alterar as API routes.

**Por que Supabase sobre Neon:**
- Postgres gerenciado + Auth + Storage + Realtime em um serviço
- SDK JavaScript nativo (`@supabase/supabase-js`) sem necessidade de ORM obrigatório
- Dashboard visual para inspecionar e editar dados sem SQL
- Tier gratuito generoso para validação

```typescript
// lib/expenses.ts — abstração que o MVP 0 satisfaz com mock
export async function getExpenses(filters: ExpenseFilters): Promise<Expense[]> {
  // MVP 0: importa de data/mock.ts
  // V1+: return supabase.from('expenses').select('*').eq('user_id', filters.userId)
}
```

**Plano de migração (V1):**
1. `@supabase/supabase-js`, `@supabase/ssr` já instalados (GAB-16).
2. Schema desenhado e versionado em [`DATABASE.md`](./DATABASE.md) + `supabase/migrations/00000000000001…05_*.sql` (GAB-17). **Aguardando aprovação do CEO antes de aplicar.**
3. Após aprovação: aplicar migrations no Supabase (`supabase db push` ou via dashboard).
4. Adicionar `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` no Vercel (já vinculados no projeto local via integração GitHub).
5. Gerar tipos: `supabase gen types typescript > src/types/supabase.ts`.
6. Criar `src/lib/supabase.ts` (clients server-only e browser) e reescrever `src/lib/expenses.ts` para usar Supabase atrás da mesma interface — API routes não mudam.
7. Smoke test golden path: signup → onboard (phone) → criar expense → ver no feed.

Índices, RLS e plano de evolução V1→V3 estão detalhados em [`DATABASE.md`](./DATABASE.md). Esta seção não duplica essa informação intencionalmente.

### 8.2 Autenticação — NextAuth ou Clerk

**Clerk** recomendado para MVP 1 (mais rápido de integrar com Next.js App Router).

```
Fluxo de auth:
  Browser → Clerk (OAuth/Magic Link) → JWT → middleware.ts verifica → API routes
```

Adicionar em `middleware.ts`:
```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
const isPublicRoute = createRouteMatcher(['/api/whatsapp/webhook(.*)']);
export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) auth().protect();
});
```

### 8.3 Fila para Mensagens WhatsApp — BullMQ

Em volume alto, o webhook não deve processar sincronamente (timeouts do Twilio = 10s).

```
WhatsApp → POST /api/whatsapp/webhook
              │
              └─► Enfileira job no Redis (BullMQ)
                      │
                      └─► Worker: parse + Claude Haiku + salva + responde
```

**Implementação:**
1. `npm install bullmq ioredis`
2. Webhook faz `whatsappQueue.add('process-message', { phone, rawText })`
3. Worker separado (pode rodar como Vercel Serverless com trigger agendado ou como Node.js separado)

### 8.4 Rate Limiting e Custos de IA

- **llama-3.1-8b-instant:** latência < 0.5s; sem cache necessário na maioria dos casos; custo negligenciável
- **llama-3.3-70b-versatile:** gerado uma vez por mês por usuário, persistido em `AIInsight` para evitar chamadas redundantes
- Adicionar `rate-limiter-flexible` na rota de webhook para evitar spam
- Groq tem limite de tokens por minuto no tier gratuito (aprox. 30k TPM) — irrelevante para MVP

### 8.5 Mapa de Variáveis de Ambiente

```bash
# .env.example

# IA — Groq (https://console.groq.com)
GROQ_API_KEY=gsk_...

# WhatsApp — provedor TBD (candidatos: Evolution API, WAHA)
# Evolution API (self-hosted, open-source)
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=...
EVOLUTION_INSTANCE_NAME=grana

# WAHA (alternativa gerenciada — preencher quando decidido)
# WAHA_URL=...
# WAHA_API_KEY=...

# Banco de dados — Supabase (V1+)
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # apenas no servidor, nunca exposto ao client

# Auth — Clerk (V1+)
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...

# App
NEXT_PUBLIC_APP_URL=https://grana.vercel.app
```

---

## Referência Rápida de Decisões

| Decisão | Escolha MVP 0 | Caminho V1+ |
|---|---|---|
| Persistência | Mock em memória (`data/mock.ts`) | **Supabase** (Postgres gerenciado) ✓ |
| Auth | Sem auth (usuário único) | Clerk |
| WhatsApp | Webhook mockado | **TBD**: Evolution API ou WAHA — decisão pendente |
| IA Categorização | Keyword match + fallback **Groq llama-3.1-8b-instant** | Groq llama-3.1-8b-instant ✓ |
| IA Análise | Texto mock hardcoded | **Groq llama-3.3-70b-versatile** agendado mensalmente ✓ |
| Deploy | Vercel (Hobby) | Vercel (Pro) + Redis (Upstash) |
| Monitoramento | Vercel logs | Sentry + Datadog (ou Axiom) |
