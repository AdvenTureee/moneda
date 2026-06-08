# Moneda — Especificação da Landing Page (com Mo + Design do App)

Landing page do Moneda, alinhada 100% com o design system do app e com a mascote **Mo** como personagem central da narrativa.  
Serve como base para design (Figma) e implementação (Next.js + Tailwind + Motion).

---

## 1. Objetivo da Landing Page

- **Posicionamento**: Moneda é o app de controle de gastos que vive no WhatsApp e usa IA (a Mo) para explicar o dinheiro sem julgamentos.
- **Meta principal**: levar o visitante a **iniciar a jornada via WhatsApp** (“Começar pelo WhatsApp”).
- **Meta secundária**: gerar confiança mostrando:
  - A própria UI real (chat, waffle, histograma, feed).
  - A mascote Mo guiando a experiência.[web:109][web:112]

---

## 2. Identidade Visual da LP (espelhando o APP)

A landing deve parecer claramente parte do mesmo produto que o app (web/mobile), reaproveitando tokens de cor, tipografia, espaçamento e motion.

### 2.1 Cores (tokens)

Usar exatamente os tokens já definidos no DESIGN.md:

- **Brand / ações**:
  - `--color-brand-blue` (`#A8C5E0`) – CTA primário, links e destaques da LP.
  - `--color-brand-blue-dark` – hover/pressed em CTAs.
  - `--color-brand-green` (`#5BBF8E`) – reforço visual para estados positivos (badges de “Gratuito”, trechos de “sem culpa”, etc.).
- **Fundo e superfícies**:
  - `--color-bg` – background geral da página.
  - `--color-surface` – cards (chat, gráficos, feed).
  - `--color-surface-alt` – chips, barras de seção, backgrounds suaves.
- **Texto**:
  - `--color-text-primary` – headlines, copy principal.
  - `--color-text-secondary` – descrições, datas, microcopy.
- **Semânticas**:
  - `--color-success`, `--color-warning`, `--color-error` – usados em exemplos de métricas e estados (nunca exagerar vermelho).

Modo escuro da LP pode ser opcional no V0, mas se existir, deve consumir os mesmos tokens de dark theme do app.

### 2.2 Tipografia

- Fonte principal: **Inter**, mesma do app.
- Escala:
  - Hero headline: `--text-2xl` ou `--text-3xl`.
  - Subheadline: `--text-md` ou `--text-lg`.
  - Corpo: `--text-base`.
  - Valores (prints, exemplos): `--text-md` com `font-variant-numeric: tabular-nums`.

Regra: máximo 3 tamanhos de texto por seção para manter hierarquia clara.

### 2.3 Espaçamento, Radius e Shadows

- Espaçamento: múltiplos de 4px (`--space-*`) como no app.
- Radius:
  - Cards: `--radius-md` ou `--radius-lg`.
  - Botões pill: `--radius-full`.
- Shadows:
  - Cards normais: `--shadow-xs` / `--shadow-sm`.
  - Destaques (hero card, chat da Mo): `--shadow-md`.

---

## 3. Mo — Mascote e Personagem da LP

Mo é a mascote/IA do Moneda — precisa aparecer de forma consistente na landing e no produto:

### 3.1 Papel da Mo na LP

- **Guia da narrativa**: Mo aparece sempre que há explicação, insight ou ajuda (hero, seção de “Como funciona”, chat demo, FAQ).[web:105][web:106]
- **Conector visual**: mesma personagem nos:
  - Prints do app (balão com avatar da Mo).
  - Ilustrações da LP.
  - Empty states/insights.

Mascote que aparece só na home vira decoração; aqui, Mo deve estar em múltiplos touchpoints.[web:104][web:110]

### 3.2 Estilo visual da Mo

- Flat illustration, coerente com a paleta:
  - Azul-pastel e verde-cédula presentes nos detalhes (roupa, acessórios).
  - Traços simples, legível em tamanhos pequenos.
- Expressões:
  - Curiosa (perguntando sobre seus gastos).
  - Tranquila/otimista (ao mostrar progresso).
  - Nunca “brava”/envergonhando o usuário.

### 3.3 Onde Mo aparece na LP

- Hero: ao lado do chat/mini dashboard, olhando para os dados ou “apontando” para o CTA.
- Seção “A solução”: em uma vinheta mostrando Mo como “CFO pessoal”.
- Histórias (personas): pequena Mo no canto do card, como se estivesse aconselhando Marina/Rafael.
- Seção de gráficos: Mo ao lado dos gráficos, com uma seta/balão explicando o insight.
- Chat demo: avatar da Mo como remetente das respostas.
- FAQ: ícone da Mo em miniatura ao lado do título, reforçando que as respostas vêm dela.[web:104][web:110]

---

## 4. Estrutura da LP (Seções) — Atualizada com Mo

### 4.1 Hero

**Objetivo**: explicar em 3 segundos o que é o Moneda e mostrar Mo + UI real.

**Texto:**

- Headline (H1):  
  `Seu dinheiro, finalmente claro.`
- Subheadline:  
  `Controle seus gastos direto do WhatsApp com a Mo, sua CFO pessoal de bolso — uma IA que explica seu mês sem julgamentos.`
- CTA primário (btn):  
  `Começar pelo WhatsApp`
  - Cor: `--color-brand-blue` com hover `--color-brand-blue-dark`.
- CTA secundário (link ou ghost):  
  `Ver como funciona`

**Visual:**

- Layout split:
  - Esquerda: texto + CTAs.
  - Direita: card grande com:
    - **Chat do WhatsApp** (UI real ou mock) com Mo:
      - Usuário: “gastei 42 no almoço”.
      - Mo: resposta confirmando + pequena explicação.
    - Mini painel sobreposto com:
      - Waffle simples.
      - Histograma simples.
    - Mo ilustrada “interagindo” com esses elementos (apontando para o waffle, olhando para o histograma).[web:109][web:112]

**Animação:**

- Hero card (chat+dashboard):
  - Motion: `initial={{ opacity: 0, y: 24 }}` → `whileInView={{ opacity: 1, y: 0 }}` (springs suaves).
- Indicador “digitando” da Mo:
  - Três bolinhas animadas com `animate-pulse` e delays.
- Mo pode ter um micro-movimento sutil (floating/hover breathing) com amplitude bem baixa para não poluir.

---

### 4.2 Seção “O problema”

3 blocos, sem Mo em destaque (para o foco ficar na dor, não na solução):

1. **Lançar gasto é chato demais** – ícone de formulário.
2. **Ninguém entende o próprio dinheiro** – gráfico confuso.
3. **Culpa e ansiedade** – carinha tensa/ansiosa (não a Mo).

Layout em 3 colunas (desktop) / 1 coluna (mobile). Cards usando `--color-surface` e `--shadow-xs`.

---

### 4.3 Seção “A virada”

Título:  
`E se controlar seu dinheiro fosse tão simples quanto mandar uma mensagem no WhatsApp?`

- Visual:
  - Card grande de conversa de WhatsApp com avatar da Mo.
  - Mo ilustrada ao lado, com expressão amigável.

Animação: card entra com slide leve da direita; balões da Mo aparecem com scale/opacity.

---

### 4.4 Seção “A solução: Moneda + Mo”

Título:  
`Moneda: o único app de finanças que vive no seu WhatsApp (e fala a sua língua).`

- Coluna esquerda: bullets sobre:
  - Lançamentos por texto e áudio.
  - IA que explica, não que julga (Mo).
  - Resumo semanal.
- Coluna direita:
  - Card de “Insight da Mo” (UI real) com balão de fala da Mo.

Mo aparece em ilustração/ícone no topo da seção, reforçando que ela é o “rosto” da solução.[web:105][web:106]

---

### 4.5 Histórias (Marina & Rafael) com Mo

Para cada persona:

- Card com:
  - Foto/ilustração da persona.
  - Mini Mo em algum canto, como se estivesse interagindo (apontando para um gasto ou segurando um gráfico pequeno).
- Texto curto (perfil, dores, como usa o Moneda, job-to-be-done).

Mo ajuda a humanizar a jornada e criar narrativa contínua entre LP e produto.[web:106][web:109]

---

### 4.6 “Como funciona na prática”

3 passos, cada um com Mo conectando o fluxo:

1. **Você manda um gasto pelo WhatsApp**
   - Print de chat com Mo.
   - Mo ilustrada em pose “escutando”/“digitando”.

2. **O app organiza tudo pra você**
   - Print do feed com cards seguindo o design do app.
   - Mo olhando pro feed ou apontando para algum gasto.

3. **A Mo te explica seu dinheiro**
   - Print da aba de insights com texto da Mo.
   - Mo em pose de “CFO” (talvez com uma prancheta ou tablet).

Animação: passos entram com stagger (Motion). Mo pode ter micro-motions individuais (ex.: leve tilt/scale on hover).

---

### 4.7 Seção de Gráficos (Waffle + Histograma)

Título:  
`Veja seu mês em um olhar.`

- Coluna esquerda: **Waffle Chart** (UI real) com texto:
  - “Entrega e alimentação já são 38 % dos seus gastos este mês.”
- Coluna direita: **Histograma** com texto:
  - “Suas maiores explosões de gasto acontecem nas sextas e sábados.”

**Mo na seção**:

- Mo posicionada entre os dois gráficos, com balão:  
  `“Aqui você vê onde o dinheiro se concentra e quando ele some.”`

Animações:

- Waffle:
  - Quadradinhos “preenchendo” quando entram em viewport.
- Histograma:
  - Barras crescendo de height 0 → height real.

---

### 4.8 Seção Feed de Gastos

Título:  
`Uma linha do tempo clara de tudo que você já gastou.`

Visual:

- Card grande mostrando 3–4 itens do feed com o design exato do app:
  - Ícone de categoria, descrição, forma de pagamento, data, valor alinhado à direita.
- Mo em tamanho pequeno, “segurando” uma lupa, reforçando ideia de clareza.

Animação:

- Linhas entram com fade+translate e `staggerChildren`.
- Hover: linha ganha `bg-surface-alt`, leve escala, ícone da categoria se desloca 2–4px.

---

### 4.9 Seção “Fale com a Mo agora” (Chat Demo)

Título:  
`Fale com a Mo agora.`

Texto:  
`Teste como é conversar com a sua CFO pessoal sem criar conta.`

Visual:

- Card central com:
  - Header com avatar da Mo + título “Mo · sua CFO pessoal”.
  - Corpo: componente de chat real ou embed do próprio app, mostrando:
    - Pergunta de exemplo.
    - Resposta da Mo.

Animação:

- Card entra com Motion.
- Cada mensagem aparece com scale/opacity.
- Indicador “digitando” da Mo em tempo real quando a API está respondendo.

---

### 4.10 “Como começar em 60 segundos”

Duas colunas:

- **Opção 1 – WhatsApp (recomendado)**:
  - 4 passos (clique no botão, abrir conversa com a Mo, mandar “Quero organizar meu mês”, responder perguntas básicas).
  - Mo ilustrada acenando para o botão/QR.

- **Opção 2 – App web**:
  - 4 passos (criar conta, definir orçamento, conectar WhatsApp, lançar primeiro gasto).

CTA repetido: `Começar pelo WhatsApp`.

---

### 4.11 Prova Social & Confiança

Bloco duplo:

1. **Depoimentos**:
   - Cards com frases curtas, foto/initials do usuário e mini Mo como selo “Aprovado pela Mo”.
2. **Privacidade e segurança**:
   - Lista clara (criptografia, uso interno, opção de apagar conta).
   - Ícone da Mo com um cadeado amigável (não ameaçador).

---

### 4.12 FAQ com Mo

Título:  
`Perguntas que a Mo responde todo dia.`

Formato:

- Acordeon para 5–7 perguntas principais.
- Cada pergunta com ícone mini da Mo à esquerda.
- Respostas diretas, em tom de Mo falando com o usuário.

---

### 4.13 CTA Final

Reforço do hero:

- Headline:  
  `Pronto para finalmente entender para onde seu dinheiro está indo?`
- Subtexto curto.
- CTA primário (grande): `Começar pelo WhatsApp`.
- Mo em pose comemorando (ex.: jogando confetes, segurando uma moeda).

---

## 5. Animação e Motion (LP)

### 5.1 Stack

- **Motion (Framer Motion / Motion for React)** para:
  - Entradas de seções.
  - Stagger em listas (passos, feed).
  - Layout animations discretas.
- **Tailwind + animações (`animate-*`, `transition`, `motion-safe`)** para:
  - Hovers, pulses, microfeedback.[web:89][web:90][web:95][web:96]

### 5.2 Guidelines

- Usar `motion-safe:` / `motion-reduce:` para respeitar `prefers-reduced-motion`.
- Duração:
  - Entradas: 250–400ms.
  - Hovers: 150–200ms.
- Mo nunca deve ter animações exageradas que disputem atenção com o CTA ou com os dados financeiros.

---

## 6. Implementação (alto nível)

### 6.1 Stack sugerida

- **Next.js 14+ (App Router)**.
- Tailwind CSS com tokens mapeados via CSS variables (os mesmos do app).
- Motion para animações.
- MDX para integrar este conteúdo em componentes.

### 6.2 Componentização

- `<Hero />` (Mo + chat + mini dashboard).
- `<ProblemSection />`.
- `<TurnSection />`.
- `<SolutionSection />` (Mo como CFO).
- `<StoriesSection />` (personas + Mo).
- `<HowItWorksSection />`.
- `<AnalyticsSection />` (waffle + histograma + Mo).
- `<FeedSection />`.
- `<ChatDemoSection />` (Mo em tempo real).
- `<OnboardingStepsSection />`.
- `<SocialProofSection />`.
- `<FaqSection />`.
- `<FinalCtaSection />`.

Cada componente usa:

- Tokens de cor/typography do DESIGN.md.
- Motion para entrada/hover.
- Ilustrações ou avatar da Mo consistentes com o app (mesmo estilo e proporções).[web:106][web:108][web:113]

---