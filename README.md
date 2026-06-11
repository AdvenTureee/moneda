# Moneda 💸

> Controle seus gastos pelo WhatsApp, com IA que entende português brasileiro.

Moneda é um assistente financeiro pessoal que vive no WhatsApp. Manda uma mensagem como _"almoço 35 ifood"_ e ele registra, categoriza e te dá um resumo inteligente dos seus gastos — sem planilhas, sem formulários.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) |
| Linguagem | TypeScript strict |
| Estilo | Tailwind CSS |
| Banco de dados | Supabase (Postgres) |
| Autenticação | Clerk |
| IA | Groq API (`llama-3.1-8b-instant` / `llama-3.3-70b-versatile`) |
| WhatsApp | Evolution API / WAHA (TBD) |
| Deploy | Vercel — [moneda.info](https://moneda.info) |

---

## Primeiros passos

### 1. Pré-requisitos

- Node.js 20+
- `npm` ou `pnpm`

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Copie o template e preencha as chaves:

```bash
cp .env.example .env.local
```

```bash
# IA — Groq
GROQ_API_KEY=       # https://console.groq.com

# Banco de dados — Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Autenticação — Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# WhatsApp (quando integrado)
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
```

### 4. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Documentação

| Documento | Descrição |
|---|---|
| [PRODUCT.md](docs/PRODUCT.md) | Visão de produto, personas, roadmap e métricas |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, estrutura de pastas, fluxos e decisões técnicas |
| [DATABASE.md](docs/DATABASE.md) | Schema Supabase, migrations, RLS e plano de evolução |
| [DESIGN.md](docs/DESIGN.md) | Design system, tokens, componentes e guia visual |
| [PWA.md](docs/PWA.md) | Configuração e estratégia de PWA |
| [MELHORIAS-GRAFICOS.md](docs/MELHORIAS-GRAFICOS.md) | Backlog de melhorias nos gráficos |
| [ciclo-cartao-bancos-e-prompt.md](docs/ciclo-cartao-bancos-e-prompt.md) | Ciclo de cartão, bancos e prompts de IA |
| [problemas-modo-escuro.md](docs/problemas-modo-escuro.md) | Issues conhecidos de dark mode |
| [COMO-FAZER-LOGO.md](docs/COMO-FAZER-LOGO.md) | Guia de criação do logotipo |
| [CRIAR-PAGINA-HOME.md](docs/CRIAR-PAGINA-HOME.md) | Especificação da landing page |

---

## Status do projeto

> **MVP 1** — Dashboard com banco real, autenticação e deploy em produção. Integração WhatsApp em andamento.

- [x] Dashboard com gráficos e categorias
- [x] PWA configurada
- [x] Supabase (banco real)
- [x] Autenticação (Supabase)
- [x] Deploy produção em [moneda.info](https://moneda.info)
- [ ] Integração WhatsApp (Evolution API / WAHA)

---

## Licença

Privado — todos os direitos reservados.
