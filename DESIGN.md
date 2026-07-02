# DESIGN.md: Moneda

> Sistema de design, estrutura de navegação e especificação de telas.
> Este documento é a fonte de verdade para engenheiros implementando o MVP.

---

## 1. Design Tokens

### 1.1 Cores

```
/* Paleta Primária */
--color-brand-blue:       #A8C5E0   /* Azul-pastel — ações primárias, links, destaques */
--color-brand-blue-dark:  #7AAECF   /* Azul mais saturado — hover/pressed state */
--color-brand-green:      #5BBF8E   /* Verde-cédula — valores positivos, sucesso, ganhos */
--color-brand-green-dark: #3FA876   /* Verde mais escuro — hover/pressed state */

/* Background & Surface */
--color-bg:               #F8F9FB   /* Background principal — off-white neutro */
--color-surface:          #FFFFFF   /* Cards, modais, inputs */
--color-surface-alt:      #F1F3F7   /* Surface secundária — linhas zebra, chips, dividers */

/* Texto */
--color-text-primary:     #1A1D23   /* Corpo principal — quase-preto, baixo contraste agressivo */
--color-text-secondary:   #6B7280   /* Labels, datas, descrições secundárias */
--color-text-tertiary:    #9CA3AF   /* Placeholders, hints, disabled */
--color-text-inverse:     #FFFFFF   /* Texto sobre superfícies escuras */

/* Semântico */
--color-error:            #E07070   /* Vermelho-suave — erros, gastos negativos */
--color-error-bg:         #FDF0F0   /* Fundo de alertas de erro */
--color-success:          #5BBF8E   /* Mesmo verde-cédula — confirmações, ganhos */
--color-success-bg:       #EEF9F4   /* Fundo de confirmações */
--color-warning:          #F0A855   /* Laranja — alertas de orçamento */
--color-warning-bg:       #FEF6EB   /* Fundo de alertas de orçamento */

/* Bordas */
--color-border:           #E5E7EB   /* Bordas padrão — divisores, inputs */
--color-border-focus:     #A8C5E0   /* Borda de input em foco — azul-pastel */
```

#### Modo Escuro

O app suporta modo claro e escuro via `html[data-theme="light|dark"]`. A preferência é local ao dispositivo e deve ser salva em `localStorage` com a chave `moneda-theme`.

```
/* Dark theme */
--color-bg:               #10151C
--color-surface:          #171E27
--color-surface-alt:      #202A35
--color-text-primary:     #F5F7FA
--color-text-secondary:   #B8C1CC
--color-text-tertiary:    #8491A0
--color-border:           #2A3542
--color-error:            #F28A8A
--color-error-bg:         #3A1F24
--color-success:          #6FD4A2
--color-success-bg:       #163328
--color-warning:          #F5BE73
--color-warning-bg:       #3A2A16
```

**Regras de uso:**
- `--color-brand-blue` é a cor de ação primária (botão CTA, FAB, link ativo).
- `--color-brand-green` é exclusivo para valores financeiros positivos e estados de sucesso.
- `--color-error` (`#E07070`) é exclusivo para valores negativos, erros e alertas destrutivos.
- Nunca usar `--color-brand-green` e `--color-error` simultaneamente no mesmo card sem separação visual clara.
- Contraste mínimo de 4.5:1 para texto sobre qualquer superfície (WCAG AA).
- Novos componentes devem usar tokens semânticos (`--color-bg`, `--color-surface`, `--color-text-*`, `--color-border`) para herdar o tema automaticamente.

### 1.2 Tipografia

Fonte: **Inter** (principal) com fallback `system-ui, -apple-system, sans-serif`.

> Rationale: Inter é projetada para legibilidade em telas digitais, suporta números tabulares (`font-variant-numeric: tabular-nums`) essencial para colunas de valores financeiros, e tem ampla disponibilidade via Google Fonts / CDN.

```
/* Escala de Tipo */
--text-xs:   11px / 1.4  font-weight: 400   /* Micro-labels, badges */
--text-sm:   13px / 1.5  font-weight: 400   /* Descrições, datas, labels secundários */
--text-base: 15px / 1.6  font-weight: 400   /* Corpo de texto padrão */
--text-md:   17px / 1.5  font-weight: 500   /* Itens de lista, valores de gasto */
--text-lg:   20px / 1.4  font-weight: 600   /* Títulos de seção, totais */
--text-xl:   24px / 1.3  font-weight: 700   /* Valor principal do mês */
--text-2xl:  32px / 1.2  font-weight: 700   /* Hero metric — tela de dashboard */
--text-3xl:  40px / 1.1  font-weight: 800   /* Valor em destaque máximo (modal de adição) */

/* Pesos utilizados */
400 Regular   → corpo, descrições
500 Medium    → itens de lista, valores
600 SemiBold  → títulos de seção, labels de categoria
700 Bold      → métricas principais, totais
800 ExtraBold → hero metric (sparingly)
```

**Regras de uso:**
- Valores monetários sempre com `font-variant-numeric: tabular-nums` para alinhamento vertical.
- Máximo 3 tamanhos por tela para manter hierarquia clara (Cognição & Percepção: Hierarquia Visual).
- Nunca usar peso `< 400` nem texto com tamanho `< 11px`.

### 1.3 Espaçamento

Base: **4px**. Todos os valores de margin, padding e gap devem ser múltiplos de 4.

```
--space-1:   4px
--space-2:   8px
--space-3:   12px
--space-4:   16px
--space-5:   20px
--space-6:   24px
--space-8:   32px
--space-10:  40px
--space-12:  48px
--space-16:  64px
--space-20:  80px
```

**Usos canônicos:**
- Padding interno de card: `--space-4` (16px)
- Gap entre cards em lista: `--space-3` (12px)
- Padding horizontal de tela: `--space-4` (16px mobile) / `--space-6` (24px tablet+)
- Padding vertical de seção: `--space-6` (24px) topo, `--space-4` (16px) base
- Gap entre label e valor: `--space-1` (4px)
- Gap entre ícone e texto: `--space-2` (8px)
- Margin da bottom nav: `0` (gruda no fundo, safe-area via CSS `env(safe-area-inset-bottom)`)

### 1.4 Border Radius

```
--radius-sm:   6px    /* Chips, badges, tags */
--radius-md:   10px   /* Cards de gasto, inputs */
--radius-lg:   16px   /* Cards de destaque, modal sheet */
--radius-xl:   24px   /* Bottom sheet (borda superior) */
--radius-full: 9999px /* Avatares, FAB, pill buttons */
```

### 1.5 Shadows

```
/* Sombras sutis — estética pastel/minimalista requer leveza */
--shadow-xs:  0 1px 2px rgba(0, 0, 0, 0.04)
--shadow-sm:  0 2px 8px rgba(0, 0, 0, 0.06)
--shadow-md:  0 4px 16px rgba(0, 0, 0, 0.08)
--shadow-lg:  0 8px 32px rgba(0, 0, 0, 0.12)
--shadow-fab: 0 4px 20px rgba(91, 191, 142, 0.35)   /* FAB com halo verde */
```

**Regras de uso:**
- Cards em lista: `--shadow-xs` (quase imperceptível, evitar noise visual).
- Cards de destaque / modal: `--shadow-md`.
- FAB (botão de ação flutuante): `--shadow-fab`, halo verde reforça ação positiva.
- Bottom nav: `border-top: 1px solid var(--color-border)` sem shadow, não elevar a nav.

### 1.6 Motion

```
--duration-instant:  80ms   /* Feedback tátil imediato (press state) */
--duration-fast:     150ms  /* Transições de estado de componentes */
--duration-normal:   250ms  /* Modais, sheets, page transitions */
--duration-slow:     400ms  /* Animações de entrada de conteúdo */

--easing-standard:   cubic-bezier(0.4, 0, 0.2, 1)   /* Maioria das transições */
--easing-enter:      cubic-bezier(0, 0, 0.2, 1)      /* Elementos entrando */
--easing-exit:       cubic-bezier(0.4, 0, 1, 1)      /* Elementos saindo */
--easing-spring:     cubic-bezier(0.34, 1.56, 0.64, 1) /* FAB, confirmações */
```

**Princípio:** animações existem para comunicar causalidade e estado, não decoração. Respeitar `prefers-reduced-motion: reduce`, reduzir a `opacity`-only em 80ms.

---

## 2. Estrutura de Navegação

### 2.1 Decisão: Bottom Navigation

**Escolha: Bottom Nav (5 abas) em mobile, sem sidebar no MVP.**

**Rationale (Fitts's Law + Jakob's Law):**
- Usuários de finanças pessoais acessam o app em movimento, com uma mão. A Bottom Nav garante que todas as ações principais estejam na zona de alcance do polegar (thumb zone inferior).
- Apps de referência no domínio (Nubank, Mobills, Guiabolso) utilizam bottom nav, Jakob's Law: usuários esperam que isso funcione assim.
- Sidebar (hamburger) esconde funcionalidades, aumenta cognitive load e viola o princípio de Recognition over Recall.
- Com 5 abas, ainda respeitamos Miller's Law (7 ± 2) e o limite prático de bottom navs.

### 2.2 Abas da Bottom Nav

```
[ Dashboard ] [ Feed ] [ + Gasto ] [ Insights ] [ Perfil ]
   (casa)     (lista)    (FAB)       (gráfico)  (usuário)
```

| Aba | Ícone | Rota | Descrição |
|-----|-------|------|-----------|
| Dashboard | `home` | `/` | Visão geral do mês, total gasto, insight rápido |
| Feed | `list` | `/feed` | Timeline cronológica de todos os gastos |
| + Gasto | `plus-circle` | Modal | FAB central, abre modal de lançamento rápido |
| Insights | `pie-chart` | `/insights` | Gráficos por categoria, tendências, comparativo |
| Perfil | `user` | `/perfil` | Config, categorias personalizadas, exportar dados |

**Observação de implementação:** a aba "+ Gasto" não navega para uma tela, abre um `BottomSheet` modal. O item da nav deve ter estilo visual diferenciado (FAB elevado ou ícone maior com cor verde) para sinalizar ação primária vs navegação.

### 2.3 Mapa de Telas

```
App
├── Bottom Nav (persistente)
│   ├── Dashboard (/)
│   │   └── → Detalhe de Gasto (/gastos/:id)
│   ├── Feed (/feed)
│   │   ├── → Detalhe de Gasto (/gastos/:id)
│   │   └── → Filtros (sheet modal)
│   ├── [Modal] Adicionar Gasto
│   │   └── → Seleção de Categoria (sheet modal aninhado)
│   ├── Insights (/insights)
│   │   └── → Detalhe por Categoria (/insights/categoria/:slug)
│   └── Perfil (/perfil)
│       ├── → Gerenciar Categorias (/perfil/categorias)
│       ├── → Notificações (/perfil/notificacoes)
│       └── → Exportar Dados (/perfil/exportar)
│
└── Auth (fora da nav)
    ├── Onboarding (/onboarding)
    ├── Login (/login)
    └── Cadastro (/cadastro)
```

### 2.4 Hierarquia de Profundidade

```
Nível 0 — Auth/Onboarding (primeira vez)
Nível 1 — Abas principais (Dashboard, Feed, Insights, Perfil)
Nível 2 — Sub-telas (Detalhe de Gasto, Detalhe por Categoria, Config sections)
Nível 3 — Modais/Sheets (Add Gasto, Filtros, Seleção de Categoria)
```

Regra: máximo 2 níveis de push navigation + modais. Nunca empilhar modais sobre modais (exceto sheets aninhadas de seleção, que fecham automaticamente ao confirmar).

---

## 3. Principais Telas

### 3.1 Dashboard (`/`)

**Objetivo:** dar ao usuário uma leitura imediata do mês em ≤ 3 segundos. (Doherty Threshold aplicado à percepção de informação, não apenas performance técnica.)

```
┌─────────────────────────────────────┐
│ ← Maio 2026                    [👤] │  ← Header: mês navegável + avatar
├─────────────────────────────────────┤
│                                     │
│  Gasto total este mês               │  ← text-sm secondary
│  R$ 2.847,50                        │  ← text-2xl bold, color-text-primary
│  ↑ 12% em relação a abril           │  ← text-sm, color-error (tendência negativa)
│                                     │
│  ┌──────────┐  ┌──────────┐         │
│  │ Orçamento│  │Restante  │         │  ← 2 cards de métrica secundária
│  │ R$ 3.500 │  │ R$ 652,50│         │
│  └──────────┘  └──────────┘         │
│                                     │
├─────────────────────────────────────┤
│  Por categoria              Ver tudo │  ← Seção + link
│                                     │
│  [Donut chart - 180px height]       │  ← Gráfico de pizza/donut
│                                     │
│  ● Alimentação    R$ 890   31%      │
│  ● Transporte     R$ 540   19%      │
│  ● Lazer          R$ 420   15%      │
│  ● Outros         R$ 997   35%      │
│                                     │
├─────────────────────────────────────┤
│  💡 Insight da Mo                    │  ← Banner de IA
│  "Você gasta 40% a mais em lazer   │
│   nas sextas. Quer criar uma meta?" │
│                              [→]    │
├─────────────────────────────────────┤
│  Últimos gastos                     │
│  ┌─────────────────────────────┐   │
│  │ 🍕 iFood      Hoje  -R$45  │   │  ← SpendCard component
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ 🚗 Uber       Ontem -R$23  │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ 🛒 Mercado  3 Mai  -R$187  │   │
│  └─────────────────────────────┘   │
│                           Ver feed  │
│                                     │
└─────────────────────────────────────┘
│ 🏠    📋    ➕    📊    👤 │  ← Bottom Nav
└─────────────────────────────────────┘
```

**Comportamentos:**
- Swipe horizontal no header navega entre meses (gesture para poder vir veer meses anteriores).
- Tap nos segmentos do donut filtra a lista de últimos gastos por aquela categoria.
- Tap em "Ver feed" navega para a aba Feed.
- Tap em qualquer SpendCard → Detalhe de Gasto.
- Insight banner: tap em `[→]` → ação contextual (criar meta, ver categoria, etc.).

**Estados:**
- **Loading:** skeletons para o valor total, donut (círculo cinza pulsante), e 3 SpendCards skeleton.
- **Mês sem gastos:** empty state com ilustração e CTA "Lance seu primeiro gasto".
- **Orçamento não definido:** card "Restante" mostra "" e link "Definir orçamento".

---

### 3.2 Feed / Timeline (`/feed`)

**Objetivo:** navegação cronológica completa de todos os gastos com capacidade de busca e filtro.

```
┌─────────────────────────────────────┐
│  Feed de Gastos                     │  ← Header fixo
│  ┌──────────────────────────────┐  │
│  │ 🔍 Buscar gasto...           │  │  ← SearchBar (inline, não modal)
│  └──────────────────────────────┘  │
│  [Todos] [Alimentação] [Transporte] │  ← FilterChips horizontais scrolláveis
│  [Lazer] [+ Filtros]               │
├─────────────────────────────────────┤
│                                     │
│  Hoje · 8 Mai                       │  ← DateSection header (sticky)
│  ┌─────────────────────────────┐   │
│  │ 🍕 iFood                    │   │
│  │    Alimentação · 14h32      │   │
│  │                    -R$ 45,00│   │
│  └─────────────────────────────┘   │
│                                     │
│  Ontem · 7 Mai                      │  ← DateSection header (sticky)
│  ┌─────────────────────────────┐   │
│  │ 🚗 Uber                     │   │
│  │    Transporte · 20h15       │   │
│  │                    -R$ 23,50│   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ ☕ Starbucks                │   │
│  │    Alimentação · 09h20      │   │
│  │                    -R$ 18,00│   │
│  └─────────────────────────────┘   │
│                                     │
│  5 Mai — Segunda                    │
│  ┌─────────────────────────────┐   │
│  │ 🛒 Mercado Extra            │   │
│  │    Mercado · 11h00          │   │
│  │                   -R$ 187,40│   │
│  └─────────────────────────────┘   │
│                                     │
│           [Carregar mais]           │  ← Paginação (não infinite scroll infinito)
│                                     │
└─────────────────────────────────────┘
│ 🏠    📋    ➕    📊    👤 │
└─────────────────────────────────────┘
```

**Sheet de Filtros Avançados (modal):**
```
┌─────────────────────────────────────┐
│  ────────────────  (drag handle)    │
│  Filtrar                  [Limpar]  │
│                                     │
│  Período                            │
│  [Este mês ▾]                       │
│                                     │
│  Categorias                         │
│  [✓ Alimentação] [✓ Transporte]    │
│  [✓ Lazer] [ Moradia] [+ mais]     │
│                                     │
│  Valor                              │
│  Mín: [R$ ____]   Máx: [R$ ____]  │
│                                     │
│  [  Aplicar filtros  ]  ← CTA verde│
└─────────────────────────────────────┘
```

**Comportamentos:**
- FilterChips horizontais scrolláveis, aplicam filtro imediatamente (sem botão Aplicar para os chips rápidos).
- SearchBar busca por descrição e categoria em tempo real (debounce 300ms).
- DateSection headers ficam sticky enquanto a seção está visível.
- Swipe left em SpendCard → ação "Deletar" (com confirmação).
- Swipe right em SpendCard → ação "Editar".

---

### 3.3 Adicionar Gasto (Modal / Bottom Sheet)

**Objetivo:** lançar uma despesa em ≤ 2 toques a partir de qualquer tela. (Princípio UX core do produto.)

**Fluxo de 2 toques:**
1. Toque no FAB `+` na bottom nav → sheet abre
2. Digite o valor → selecione categoria (lista rápida) → toque em "Salvar"

```
┌─────────────────────────────────────┐
│  ────────────────  (drag handle)    │
│                                     │
│            Adicionar Gasto          │
│                                     │
│  ┌──────────────────────────────┐  │
│  │       R$  0,00               │  │  ← Input de valor — text-3xl, teclado numérico
│  └──────────────────────────────┘  │
│                                     │
│  Categoria                          │
│  ┌──┐ ┌────┐ ┌──────┐ ┌──────┐   │
│  │🍕│ │🚗 │ │🛒    │ │🏠    │   │  ← Grid de chips de categoria (4 por linha)
│  │  │ │    │ │      │ │      │   │
│  └──┘ └────┘ └──────┘ └──────┘   │
│  ┌──┐ ┌────┐ ┌──────┐ ┌──────┐   │
│  │☕│ │🎮 │ │💊    │ │+    │   │  ← último chip: "Mais categorias"
│  │  │ │    │ │      │ │      │   │
│  └──┘ └────┘ └──────┘ └──────┘   │
│                                     │
│  Descrição (opcional)               │
│  ┌──────────────────────────────┐  │
│  │ Ex: iFood, Posto Shell...    │  │  ← Input text, placeholder
│  └──────────────────────────────┘  │
│                                     │
│  Data · Hoje, 8 Mai        [mudar] │  ← Default: hoje. Tap abre date picker.
│                                     │
│  ┌──────────────────────────────┐  │
│  │        Salvar Gasto          │  │  ← CTA primário, cor verde, full-width
│  └──────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

**Comportamentos:**
- Sheet abre com teclado numérico já ativo no campo de valor.
- Input de valor formata automaticamente como moeda BRL enquanto o usuário digita (masking).
- Categoria selecionada fica com background `--color-brand-green` e texto branco.
- Ao salvar: sheet fecha, toast de confirmação aparece por 2s, item aparece no topo do Feed (optimistic UI).
- Drag down ou tap fora → fecha sem salvar (com `hapticFeedback` em mobile).
- Se o usuário sair sem salvar com valor preenchido: alert "Descartar gasto?" (Forgiveness principle).

---

### 3.4 Detalhe de Gasto (`/gastos/:id`)

**Objetivo:** visualizar, editar ou deletar um gasto específico.

```
┌─────────────────────────────────────┐
│ ←                       [Editar]   │  ← Navegação: back + ação secundária
├─────────────────────────────────────┤
│                                     │
│  🍕                                 │  ← Ícone de categoria — grande (48px)
│  Alimentação                        │  ← Nome da categoria
│                                     │
│  R$ 45,00                           │  ← Valor — text-2xl
│                                     │
│  iFood                              │  ← Descrição
│  Hoje, 8 Mai às 14:32               │  ← Data e hora
│                                     │
├─────────────────────────────────────┤
│  Detalhes                           │
│  ┌──────────────────────────────┐  │
│  │  Categoria     Alimentação   │  │
│  │  ─────────────────────────  │  │
│  │  Data          08/05/2026   │  │
│  │  ─────────────────────────  │  │
│  │  Hora          14:32        │  │
│  │  ─────────────────────────  │  │
│  │  Notas         —            │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │       Deletar gasto          │  │  ← Ação destrutiva — cor error, outline
│  └──────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
│ 🏠    📋    ➕    📊    👤 │
└─────────────────────────────────────┘
```

**Comportamentos:**
- "Editar" abre o mesmo sheet de Adicionar Gasto pré-preenchido com os dados existentes.
- "Deletar gasto": confirmation dialog ("Tem certeza? Isso não pode ser desfeito.") com botão "Deletar" vermelho e "Cancelar" cinza.
- Após deletar: navega para o Feed com toast "Gasto deletado" + botão "Desfazer" (janela de 4s para undo).

---

### 3.5 Perfil / Configurações (`/perfil`)

**Objetivo:** configurações básicas e personalização do app.

```
┌─────────────────────────────────────┐
│  Perfil                             │  ← Header
├─────────────────────────────────────┤
│                                     │
│  ┌──────────────────────────────┐  │
│  │ 👤 Gabriel Mauro             │  │  ← Avatar inicial + nome
│  │    gabriel@fieldcorp.com.br  │  │
│  └──────────────────────────────┘  │
│                                     │
│  Orçamento Mensal                   │  ← Seção
│  ┌──────────────────────────────┐  │
│  │ Orçamento          R$ 3.500  >│  │
│  └──────────────────────────────┘  │
│                                     │
│  Categorias                         │
│  ┌──────────────────────────────┐  │
│  │ Gerenciar categorias         >│  │
│  └──────────────────────────────┘  │
│                                     │
│  Preferências                       │
│  ┌──────────────────────────────┐  │
│  │ Notificações                 >│  │
│  │ ──────────────────────────── │  │
│  │ Moeda              BRL (R$)  >│  │
│  └──────────────────────────────┘  │
│                                     │
│  Dados                              │
│  ┌──────────────────────────────┐  │
│  │ Exportar dados (CSV)         >│  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │         Sair da conta        │  │  ← Outline, cor error
│  └──────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
│ 🏠    📋    ➕    📊    👤 │
└─────────────────────────────────────┘
```

---

## 4. Componentes UI

### 4.1 SpendCard

Card de gasto individual, usado em Dashboard (preview) e Feed (full).

```
Props:
  icon: string (emoji ou ícone da categoria)
  category: string
  description?: string
  amount: number (negativo para gastos, positivo para receitas)
  date: Date
  variant: 'compact' | 'full'

Visual:
  [ícone] [Descrição / Categoria] .... [data]
                                        [valor]

Especificação:
  - Container: background surface, radius-md, shadow-xs, padding space-4
  - Ícone: 40px × 40px, background color da categoria (20% opacity), radius-full
  - Valor negativo: color-error, prefixo '−'
  - Valor positivo: color-success, prefixo '+'
  - font: text-md medium para valor; text-sm secondary para categoria+data
```

### 4.2 CategoryChip

Chip selecionável com ícone e cor, usado no modal de adição e filtros.

```
Props:
  icon: string (emoji)
  label: string
  color: string (hex — cor da categoria)
  selected: boolean
  size: 'sm' | 'md'

Visual (md, unselected):
  [ícone] Label
  background: color-surface-alt, border: color-border, radius-full

Visual (md, selected):
  [ícone] Label
  background: color-brand-green, text: white, sem border

Especificação:
  - Padding: space-2 vertical, space-3 horizontal
  - Gap ícone/label: space-1
  - Press state: scale(0.95) em 80ms
```

### 4.3 DonutChart

Gráfico de pizza/donut de categorias, Dashboard e Insights.

```
Props:
  segments: Array<{ category: string, amount: number, color: string }>
  size: 'sm' (120px) | 'md' (180px) | 'lg' (240px)
  centerLabel?: string (ex: "Total")
  centerValue?: string (ex: "R$ 2.847")
  interactive: boolean

Visual:
  - Stroke-width: 20% do raio (anel moderado, não muito fino nem grosso)
  - Gap entre segmentos: 2px (arc gap)
  - Hover/tap em segmento: escala para 1.04, opacidade dos outros segmentos para 0.4
  - Animação de entrada: arcos crescem de 0 com easing-enter em 400ms (staggered 50ms por segmento)

Implementação recomendada: SVG direto (não biblioteca de gráficos pesada).
Segmento mínimo renderizável: 3% (segmentos menores são agrupados em "Outros").
```

### 4.4 QuickAddModal (Bottom Sheet)

Sheet de lançamento rápido de gasto, componente central do produto.

```
Props:
  initialAmount?: number
  initialCategory?: string
  editingExpense?: Expense (para edição)
  onSave: (expense: ExpenseInput) => void
  onClose: () => void

Comportamento:
  - Abre com translateY animation de baixo para cima em 250ms (easing-enter)
  - Backdrop: rgba(0,0,0,0.32), tap fecha
  - Drag-to-close: velocidade > 500px/s ou posição > 40% da altura → fecha
  - Keyboard avoidance: sheet sobe junto com o teclado (iOS: adjustResize; Android: windowSoftInputMode)
  - Altura padrão: 65vh; expansível para 90vh se categoria grid expandir
```

### 4.5 AIInsightBanner

Banner de insight gerado por IA, Dashboard.

```
Props:
  icon: string (💡 padrão)
  message: string
  cta?: { label: string, action: () => void }
  dismissible: boolean

Visual:
  - Background: linear-gradient(135deg, #EEF6FF, #E8F5EF) — azul-pastel para verde suave
  - Border: 1px solid color-brand-blue (20% opacity)
  - Radius: radius-lg
  - Padding: space-4
  - Ícone 💡: 20px, float left
  - Texto: text-sm, color-text-primary, max 2 linhas (depois trunca com "...")
  - CTA [→]: text-sm, color-brand-blue, bold, tap area 44×44px mínimo

Acessibilidade: `role="complementary"`, `aria-label="Insight da Mo"`.
Dismiss: ícone × no canto superior direito, tap area 44×44px, `aria-label="Fechar insight"`.
```

### 4.6 TrendIndicator

Indicador de tendência com seta e percentual.

```
Props:
  value: number (percentual de mudança, ex: 12.4)
  direction: 'up' | 'down'
  inverse: boolean (true = up é ruim / gastos; false = up é bom / receita)

Visual:
  ↑ 12%   → direction up, inverse true → color-error
  ↓ 8%    → direction down, inverse true → color-success
  ↑ 5%    → direction up, inverse false → color-success
  ↓ 3%    → direction down, inverse false → color-error

Especificação:
  - Ícone seta: 12px
  - Texto: text-xs, font-weight 600
  - Gap ícone/texto: space-1
  - Nunca exibir sem contexto — sempre acompanhar o valor de referência
```

### 4.7 DateSectionHeader

Cabeçalho de seção de data no Feed.

```
Props:
  date: Date
  totalAmount?: number (total da seção)

Visual:
  "Hoje · 8 Mai"                        "R$ 68,50"
  ─────────────────────────────────────────────────

Especificação:
  - Background: color-bg (opaca para sticky funcionar)
  - Texto data: text-sm, color-text-secondary, font-weight 600
  - Texto total: text-sm, color-error (gastos do dia)
  - Padding: space-2 vertical, space-4 horizontal
  - Divider: border-bottom 1px solid color-border
  - Sticky: position sticky, top: header-height (56px)
```

### 4.8 EmptyState

Estado vazio para listas e telas sem dados.

```
Props:
  illustration: string (caminho SVG ou emoji grande)
  title: string
  description: string
  cta?: { label: string, action: () => void }

Visual (centralizado, vertical):

         🧾
    Nenhum gasto ainda
  Lance sua primeira despesa
  e comece a entender pra onde
       vai o seu dinheiro.

  [  + Adicionar primeiro gasto  ]

Especificação:
  - Ilustração: 80px × 80px, grayscale 20% (não competir com CTA)
  - Title: text-lg, font-weight 600, text-center
  - Description: text-sm, color-text-secondary, text-center, max-width 260px
  - CTA: botão primário verde, min-width 200px
  - Padding: space-16 vertical
```

---

## 5. Princípios UX

### 5.1 Escaneabilidade acima de tudo

A leitura financeira é uma tarefa de alta frequência realizada em contextos de baixa atenção (trânsito, fila, pausa). O layout deve comunicar a situação financeira em ≤ 3 segundos.

**Como aplicar:**
- Hierarquia de tamanho de texto agressiva: o número mais importante é sempre o maior.
- Valores à direita (alinhados à direita), texto descritivo à esquerda, cria coluna visual de números.
- Cores semânticas são não-negociáveis: vermelho = gasto/negativo, verde = positivo/ok.
- Nunca colocar mais de 4 informações no mesmo card sem agrupamento visual (Chunking).
- F-pattern scanning: informação crítica no topo esquerdo de cada seção.

### 5.2 Máximo 2 toques para lançar uma despesa

O FAB `+` na bottom nav é a ação mais importante do app. Qualquer fricção nesse fluxo é um bug de UX.

**Como aplicar:**
- Toque 1: FAB → sheet abre com cursor no campo de valor e teclado numérico ativo.
- Toque 2: digitar valor + selecionar categoria (basta um tap no chip) → Salvar.
- Descrição e data são opcionais e ficam visualmente subordinadas (não pedir mais do que o mínimo necessário, Tesler's Law).
- O teclado deve aparecer em < 100ms após o toque no FAB (Doherty Threshold).
- Categoria mais usada aparece primeiro (personalização baseada em frequência, Goal-Gradient Effect).

### 5.3 Feedback visual imediato

Cada ação deve ter confirmação visual em ≤ 80ms. O usuário nunca deve questionar se o toque foi registrado.

**Como aplicar:**
- Press states: `scale(0.97)` + `opacity(0.85)` em 80ms para botões e cards tocáveis.
- Salvar gasto: toast de confirmação verde "Gasto adicionado" aparece em 150ms (optimistic UI, não esperar resposta da API).
- Deletar: feedback imediato de remoção da lista + toast com undo.
- Erro de rede: toast vermelho "Erro ao salvar. Tentando novamente...", nunca silencioso.
- Loading de dados: skeletons sempre, nunca spinners bloqueantes sobre conteúdo existente.
- Animações de confirmação (scale-spring no botão Salvar, check animado) reforçam o loop de recompensa.

### 5.4 Tom amigo, sem julgamentos

O app lida com dinheiro, assunto sensível. O tom de voz nunca deve envergonhar, culpar ou alarmisticamente exagerar.

**Como aplicar:**
- Insights de IA: fraseados como observações, não julgamentos ("Você gastou mais com lazer este mês" ≠ "Você está gastando demais").
- Orçamento estourado: alerta amigável, não vermelho alarmante todo-caps.
- Empty states: tom encorajador ("Comece a entender pra onde vai o seu dinheiro").
- Erros: linguagem humana ("Algo deu errado, tentando novamente" ≠ "Error 500: Internal Server Error").

### 5.5 Acessibilidade como padrão

- Contraste mínimo 4.5:1 para texto normal, 3:1 para texto grande (WCAG AA).
- Nunca usar cor como único comunicador de estado, sempre acompanhar com texto ou ícone.
- Tap targets mínimos 44×44px para todos os elementos interativos (Apple HIG / Material).
- `prefers-reduced-motion`: substituir animações por transições de opacidade simples.
- Labels `aria-label` em todos os ícones standalone, valores monetários e gráficos.
- Suporte a Dynamic Type (iOS) e font scale (Android), layouts que não quebram em 200% de zoom.

---

## 6. Referências de Implementação

### 6.1 Stack assumida (MVP)

- **Framework:** React Native (Expo) ou React Web (Next.js), a ser confirmado pelo CTO.
- **Fontes:** `@fontsource/inter` ou Google Fonts CDN.
- **Ícones:** Lucide React (coerente, limpo, licença MIT).
- **Gráficos:** SVG direto para o DonutChart (evitar bundlesize de bibliotecas pesadas no MVP).
- **Animações:** React Native Reanimated (mobile) / Framer Motion (web).

### 6.2 Checklist de entrega por tela

Cada tela deve ser considerada concluída quando:

- [ ] Renderiza corretamente em viewport 390×844px (iPhone 14) e 375×667px (iPhone SE).
- [ ] Renderiza corretamente em viewport 393×852px (iPhone 15 Pro).
- [ ] Todos os tokens de cor e tipografia referenciados existem no design system.
- [ ] Estados de loading (skeleton), vazio (empty state) e erro estão implementados.
- [ ] Tap targets mínimos de 44×44px verificados.
- [ ] Contraste verificado em todos os pares texto/background.
- [ ] Funciona sem animações (`prefers-reduced-motion`).

---

*Documento criado por UXDesigner, GAB-14 · Moneda MVP · Maio 2026*
