# Moneda — Documentação de Produto

> **"Seu dinheiro, finalmente claro."**

---

## 1. Nome e Tagline

| Campo     | Valor                               |
|-----------|-------------------------------------|
| Nome      | **Moneda**                           |
| Tagline   | *"Seu dinheiro, finalmente claro."* |
| Domínio   | App de controle de gastos pessoais  |
| Mercado   | Brasil                              |

---

## 2. Problema que Resolve

### Problema 1 — Lançar gasto é chato demais
A maioria dos apps exige que o usuário abra o app, navegue por menus, preencha categoria, valor, data e descrição. Resultado: as pessoas desistem depois de 3 dias. A planilha do Excel fica mais tempo aberta que qualquer app de finanças.

### Problema 2 — Ninguém entende o próprio dinheiro
Os apps mostram gráficos e tabelas, mas não explicam *o que fazer*. O usuário fecha o painel sabendo que gastou R$ 1.200 em alimentação, mas sem ideia de se isso é muito, pouco, ou como melhorar.

### Problema 3 — Julgamento e culpa bloqueiam a ação
Categorias chamadas "Gastos supérfluos" e notificações do tipo "Você gastou 40% acima do orçamento!" criam ansiedade financeira, não consciência. As pessoas evitam o app porque se sentem culpadas ao abri-lo.

---

## 3. Público-Alvo

**Foco principal:** Brasileiros entre 22–40 anos, com renda entre R$ 2.000–10.000/mês, que têm consciência de que deveriam controlar os gastos mas nunca conseguiram manter o hábito por mais de duas semanas.

**Perfil comportamental:**
- Usam WhatsApp diariamente (mais de 2h/dia)
- Já tentaram pelo menos um app de finanças e abandonaram
- Não têm dívidas graves, mas sentem que o dinheiro "some"
- Preferem mensagem de texto a preencher formulários
- Reagem bem a linguagem direta, sem jargão financeiro

---

## 4. Proposta de Valor e Diferenciação

### Proposta Central
Moneda é o único app de controle de gastos que funciona *de onde você já está* — o WhatsApp — e usa IA para te explicar seu dinheiro sem julgamentos.

### Pilares de Diferenciação

| Diferencial             | Moneda                                     | GuiaBolso / Mobills          | Planilha Excel              |
|-------------------------|-------------------------------------------|------------------------------|-----------------------------|
| Canal de entrada        | WhatsApp (zero fricção)                   | App próprio                  | Desktop / mobile            |
| Lançamento              | Mensagem de texto natural                 | Formulário por categoria     | Digitação manual            |
| IA / insights           | Explica, sugere, conversa                 | Relatórios estáticos         | Nenhum                      |
| Tom                     | Sem julgamentos, direto ao ponto          | Neutro / técnico             | Nenhum                      |
| Tempo p/ primeiro valor | < 60 segundos                             | 5–15 minutos (onboarding)    | Horas de setup              |

---

## 5. Funcionalidades do MVP Enxuto (V0)

O MVP é validação de hipótese, não produto completo. Foco em: usuário consegue lançar um gasto via WhatsApp e ver um resumo simples.

### Núcleo obrigatório

- [ ] **Lançamento via WhatsApp** — usuário envia mensagem como "gastei 35 no ifood" e o Moneda interpreta
- [ ] **Parsing de linguagem natural via Claude API** — extrai valor, categoria inferida e data
- [ ] **Feed de gastos** — lista cronológica dos lançamentos com valor, categoria e data
- [ ] **Resumo mensal** — total gasto no mês, divisão por categoria (top 3)
- [ ] **Dados mock no MVP 0** — sem banco de dados real; estado salvo em memória/JSON local
- [ ] **Interface web mínima** — visualização do feed e resumo (Next.js 14 + Tailwind)

### Fora do escopo do MVP
Tudo que não está listado acima está fora. Inclusive: contas bancárias, login/auth, notificações, metas, histórico multi-mês, exportação de dados.

---

## 6. Funcionalidades Fora do MVP (Backlog)

Ordenadas por impacto estimado no engajamento e retenção:

### V1 (próxima entrega)
- Autenticação e persistência real (Supabase)
- Histórico completo multi-mês com busca
- **🎙️ Áudio via WhatsApp** — transcrição automática com Groq Whisper
- **📈 Previsor do fim do mês** — alerta proativo no dia 20
- **🤖 CFO conversacional básico** — responde perguntas simples via WhatsApp

### V2
- Insights proativos semanais via WhatsApp
- Metas mensais por categoria
- Categorias customizáveis
- **💑 Modo Casal / Conta Compartilhada**
- **🔄 Detector de assinaturas e recorrências**
- Export para CSV / planilha

### V3
- Open Banking (leitura de extratos)
- **📸 Foto de comprovante via WhatsApp** (Groq Vision / OCR)
- **🤖 CFO conversacional completo** (histórico multi-mês, perguntas complexas)
- Conta familiar / multi-usuário
- Comparação anônima com pares ("Pessoas com renda similar gastam X em X")

### V4
- Simulações de economia
- Integração com investimentos (visão de patrimônio)
- App mobile nativo (iOS / Android)
- Relatório anual para IR
- **💼 Modo MEI / Freelancer** — gastos profissionais, cálculo de impostos, relatório dedutível
- API pública para parceiros

---

## 7. Roadmap

### V0 — Validação de Conceito *(MVP mínimo)*
**Objetivo:** Provar que usuários lançam gastos via WhatsApp e voltam no dia seguinte.

- Lançamento via WhatsApp com parsing de linguagem natural
- Feed de gastos sem autenticação
- Dados mock (sem banco)
- Deploy na Vercel
- Stack: Next.js 14, TypeScript, Tailwind, **Groq API**

**Critério de saída:** 10 usuários reais lançam ao menos 5 gastos em 7 dias.

---

### V1 — Produto Básico Funcional + Diferenciais de Canal
**Objetivo:** Usuário tem conta, dados persistidos e vê o Moneda como o app mais conveniente que já usou — porque funciona 100% no WhatsApp.

- Autenticação (Magic Link ou Google OAuth)
- Banco de dados real (**Supabase** — Postgres gerenciado)
- Histórico completo e busca
- **🎙️ Áudio via WhatsApp** — usuário manda voz, Groq Whisper transcreve e registra o gasto automaticamente (nenhum concorrente tem isso)
- **📈 Previsor do fim do mês** — alerta automático no dia 20: "no ritmo atual você vai gastar R$ X — R$ Y acima do mês passado"
- **🤖 CFO conversacional básico** — usuário pode perguntar via WhatsApp: "quanto gastei essa semana?", "qual minha maior categoria?", "estou dentro do orçamento?"
- Primeiro insight automático via IA (Groq `llama-3.3-70b-versatile`)
- UX polish: empty states, loading states, mobile-first

**Critério de saída:** 30-day retention > 40%.

---

### V2 — Engajamento, Inteligência e Vida Social do Dinheiro
**Objetivo:** Moneda começa a surpreender o usuário com insights que ele não pediu, e vira ferramenta de casal.

- Insights proativos semanais via WhatsApp
- Metas mensais por categoria com acompanhamento em tempo real
- Categorias customizáveis pelo usuário
- Dashboard com gráficos de evolução mês a mês
- Notificações de alerta de orçamento
- **💑 Modo Casal / Conta Compartilhada** — dois números WhatsApp vinculados, dashboard consolidado, notificação quando o casal passa de meta (principal vetor de indicação viral)
- **🔄 Detector de assinaturas e recorrências** — identifica gastos que se repetem, avisa quando o valor muda ("sua Netflix subiu de R$ 44,90 para R$ 55,90 esse mês")

**Critério de saída:** DAU/MAU > 20%.

---

### V3 — Conexão Bancária, Automação e Zero Fricção Total
**Objetivo:** Zero esforço de lançamento — o Moneda importa, lê fotos e responde qualquer pergunta.

- Open Banking (leitura de extratos bancários)
- Lançamento automático de transações bancárias
- Detecção de duplicatas (manual vs automático)
- **📸 Foto de comprovante / cupom fiscal** — usuário manda foto via WhatsApp, Groq Vision lê total, estabelecimento e data e registra automaticamente
- **🤖 CFO conversacional completo** — histórico multi-mês, perguntas complexas: "qual foi meu mês mais barato em 2026?", "quando foi a última vez que gastei mais de R$ 200 de uma vez?", "quanto economizei nos últimos 3 meses?"
- Conta familiar / multi-usuário

**Critério de saída:** 60% dos usuários ativos têm ao menos uma conta bancária conectada ou foto de comprovante enviada.

---

### V4 — Plataforma Financeira Pessoal + Profissional
**Objetivo:** Moneda vira a referência financeira do usuário — não apenas controle, mas orientação — e expande para autônomos e MEIs.

- Simulações ("Se eu cortar delivery, quanto poupo em 6 meses?")
- Integração com investimentos (visão de patrimônio)
- App mobile nativo
- Relatório anual para IR
- API pública para parceiros
- **💼 Modo MEI / Freelancer** — separa gastos pessoais de profissionais com tag simples, calcula quanto separar de imposto (tabela Simples Nacional / MEI), gera relatório de despesas dedutíveis mensais

**Critério de saída:** NPS > 60, churn mensal < 3%.

---

## 8. Métricas de Sucesso (KPIs)

### Métricas de Produto

| Métrica                         | V0 Target       | V1 Target       | V2 Target       |
|----------------------------------|-----------------|-----------------|-----------------|
| Ativação (≥1 gasto no D1)       | > 70%           | > 75%           | > 80%           |
| Retenção D7                     | > 40%           | > 50%           | > 55%           |
| Retenção D30                    | —               | > 35%           | > 45%           |
| DAU/MAU                         | —               | > 15%           | > 20%           |
| Gastos lançados / usuário / mês | > 5             | > 15            | > 25            |
| NPS                             | > 30            | > 45            | > 55            |

### Métricas de Negócio

| Métrica                 | Descrição                                              |
|-------------------------|--------------------------------------------------------|
| CAC                     | Custo por usuário ativo adquirido                      |
| LTV                     | Receita projetada por usuário no ciclo de vida         |
| Churn mensal            | % de usuários ativos que param de usar em 30 dias      |
| Conversão freemium→pago | % de usuários gratuitos que migram para plano pago     |

### North Star Metric
> **Número de gastos lançados por usuários ativos mensais.**  
> Reflete engajamento real, não apenas cadastro.

---

## 9. Personas

### Persona 1 — Marina, 28 anos, Analista de Marketing

**Perfil:** Mora em São Paulo, ganha R$ 5.500/mês, paga aluguel de R$ 1.800 e tem uma assinatura de academia que nunca usa. Trabalha em regime híbrido, pede delivery 4x por semana.

**Dores:**
- Sente que o dinheiro some sem saber para onde
- Já baixou Mobills e GuiaBolso, abandonou em menos de 2 semanas
- Odia preencher categorias e fica com preguiça de abrir o app

**Motivações:**
- Quer fazer uma viagem para a Europa em 18 meses
- Se sente bem quando tem clareza sobre seus gastos
- Usa WhatsApp mais de 3h por dia

**Como usa o Moneda:**
Manda mensagem no WhatsApp enquanto ainda está no iFood: "gastei 42 no almoço". Abre o app uma vez por semana pra ver o resumo. Adora quando a IA diz "você gastou menos que na semana passada".

**Jobs to Be Done:** *"Quando peço delivery, quero registrar sem abrir outro app para que não perca o controle do mês sem perceber."*

---

### Persona 2 — Rafael, 35 anos, Servidor Público

**Perfil:** Mora em Belo Horizonte com esposa e filho de 3 anos. Renda familiar de R$ 9.000/mês. Tem parcela de carro, financiamento de apartamento e gastos com escola particular. "Parece que nunca sobra nada."

**Dores:**
- Tenta usar planilha do Excel mas perde o fio entre os meses
- Discute com a esposa sobre gastos pois nenhum dos dois sabe ao certo quanto gastaram
- Se sente culpado quando vê o total mensal e não consegue agir

**Motivações:**
- Quer construir uma reserva de emergência
- Precisa de clareza, não de mais dados
- Prefere uma explicação simples a um relatório complexo

**Como usa o Moneda:**
Usa o WhatsApp para lançar compras no supermercado e despesas da escola. Consulta o resumo semanal que o Moneda manda. Valoriza quando a IA diz "vocês estão dentro do esperado para o mês" — ou o alerta antes de extrapolar.

**Jobs to Be Done:** *"Quando pago uma conta, quero saber se ainda estou dentro do orçamento para que minha família não seja pega de surpresa no fim do mês."*

---

## Stack de Referência

| Camada       | Tecnologia                                    |
|--------------|-----------------------------------------------|
| Frontend     | Next.js 14+ (App Router)                      |
| Linguagem    | TypeScript                                    |
| Estilo       | Tailwind CSS                                  |
| IA / NLP     | **Groq API** (`llama-3.1-8b-instant` / `llama-3.3-70b-versatile`) |
| Dados (V0)   | Mock em memória / JSON local                  |
| Dados (V1+)  | **Supabase** (Postgres gerenciado)            |
| Deploy       | Vercel                                        |
| Canal input  | WhatsApp — provedor **TBD** (Evolution API ou WAHA) |

---

## Decisões e Princípios de Produto

1. **Zero fricção no lançamento.** Se o usuário precisar abrir o app para lançar um gasto, fracassamos no problema número 1.
2. **IA que explica, não que julga.** Nenhuma linguagem de culpa, shame ou comparação negativa.
3. **WhatsApp é o produto.** A interface web é a tela de acompanhamento, não o canal principal.
4. **Progressivo.** O usuário começa simples e descobre profundidade quando quiser.
5. **Privacidade por padrão.** Coletamos apenas o mínimo necessário para o serviço funcionar.

---

*Documento mantido pelo time de produto. Última atualização: 2026-05-09. Roadmap expandido com 7 novas features confirmadas (V1–V4).*
