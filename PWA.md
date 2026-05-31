# Plano de implementação PWA para o Moneda

> Objetivo: transformar o app em uma Progressive Web App instalável, confiável e com boa experiência mobile, mantendo o design e a navegação atuais. [web:33][web:38][web:49]

## Objetivo geral

Implementar suporte completo a PWA no Moneda para que o app possa ser instalado no dispositivo, aberto como aplicativo standalone, funcionar melhor em condições de rede instável e manter boa experiência em mobile. [web:33][web:38][web:41]

## Critérios mínimos para virar PWA

O app deve atender aos requisitos mínimos de instalação e operação básica como PWA: servir em HTTPS, expor um Web App Manifest válido, fornecer ícones adequados e registrar um service worker. [web:33][web:35][web:53]

### Requisitos obrigatórios
- Servir o app em **HTTPS** em produção. [web:33]
- Criar um **Web App Manifest** válido com nome, ícones, `start_url` e `display`. [web:33][web:35][web:53]
- Disponibilizar ícones pelo menos em **192x192** e **512x512**. [web:35][web:59]
- Registrar um **service worker** para cache e comportamento offline. [web:37][web:43]
- Validar que o app é instalável e abre em modo standalone. [web:35][web:38]

---

## Escopo da implementação

Implementar PWA no app existente sem alterar a estrutura principal do produto.

### Deve incluir
- instalabilidade;
- manifesto;
- ícones;
- service worker;
- fallback offline;
- cache básico do app shell;
- validação em mobile;
- testes de instalação.

### Não deve incluir neste primeiro momento
- push notifications;
- background sync avançado;
- estratégia offline completa para toda a base de dados;
- publicação em stores.

---

## Estrutura técnica esperada no Next.js

Se o projeto estiver em Next.js moderno com App Router, seguir o padrão nativo sempre que possível. O Next.js já oferece suporte para manifesto via convenção de arquivo e guia oficial para PWA. [web:49]

### Arquivos esperados
- `app/manifest.ts` ou `public/manifest.webmanifest` / `public/manifest.json`. [web:49][web:53]
- `public/icons/...` com ícones do app. [web:59]
- `public/sw.js` ou geração automatizada de service worker. [web:54][web:57]
- registro do service worker no client.
- metadados e link para o manifest corretamente expostos.

### Estrutura sugerida
```txt
/public
  /icons
    icon-192.png
    icon-512.png
    icon-maskable-512.png
  offline.html
  sw.js

/app
  manifest.ts   (se usar App Router)
```

---

## Fase 1 — Manifesto e identidade do app

Criar o manifesto do app com os metadados corretos para instalação. [web:33][web:49][web:53]

### Definir no manifest
- `name`: Moneda
- `short_name`: Moneda
- `description`: descrição curta do app
- `start_url`: `/`
- `display`: `standalone`
- `background_color`
- `theme_color`
- `icons`: 192, 512 e versão maskable. [web:56][web:59]

### Exemplo de estrutura
```json
{
  "name": "Moneda",
  "short_name": "Moneda",
  "description": "App de finanças pessoais com insights e assistência da Mo.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#10151C",
  "theme_color": "#10151C",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```
[web:35][web:53][web:56]

### Tarefas
- definir nome e descrição finais;
- gerar ícones oficiais;
- garantir consistência entre tema claro/escuro e `theme_color`;
- validar se o ícone funciona bem em Android e iOS. [web:59]

---

## Fase 2 — Ícones e assets de instalação

Criar os ícones oficiais do Moneda para instalação. Os ícones precisam existir em múltiplos tamanhos e idealmente incluir uma versão `maskable` para melhor recorte em launchers Android. [web:56][web:59]

### Tarefas
- gerar ícone 192x192;
- gerar ícone 512x512;
- gerar ícone maskable 512x512;
- validar legibilidade do símbolo em fundo sólido;
- evitar usar screenshots como ícones. [web:56][web:59]

### Critério de aceite
- ícones carregam corretamente;
- DevTools reconhece o manifest;
- instalabilidade não falha por ausência de assets. [web:35][web:51]

---

## Fase 3 — Service worker

Implementar service worker para cache e comportamento offline. O service worker é a base da confiabilidade da PWA e permite interceptar requests e armazenar recursos do app. [web:37][web:43]

### Objetivo inicial
Implementar uma versão simples e segura, com foco em:
- cache do app shell;
- cache estático de assets;
- página offline;
- atualização controlada.

### Estratégia inicial recomendada
- **App shell**: cache-first.
- **Assets estáticos**: cache-first.
- **HTML/document requests**: network-first com fallback offline.
- **APIs dinâmicas**: network-first, sem cache agressivo inicialmente. [web:37][web:42][web:47]

### Tarefas
- criar `sw.js`;
- registrar o SW no client;
- versionar cache;
- invalidar cache antigo em novas versões;
- evitar cache incorreto de respostas autenticadas sensíveis.

### Atenção
Como o Moneda lida com dados pessoais/financeiros, não cachear indiscriminadamente respostas privadas de API sem política clara. O offline inicial deve priorizar shell e UI, não persistência cega de dados sensíveis. [web:42][web:44]

---

## Fase 4 — Experiência offline mínima

Adicionar comportamento offline básico para o usuário não cair em tela quebrada quando estiver sem internet. Boas PWAs oferecem ao menos uma página offline customizada e feedback claro em condições ruins de rede. [web:38][web:42][web:54]

### Escopo mínimo offline
- tela offline customizada;
- shell principal carregando;
- mensagem de “sem conexão” em rotas não disponíveis;
- tentativa de recuperar conteúdo ao voltar a internet.

### Tarefas
- criar `offline.html` ou tela offline equivalente;
- exibir UI amigável com identidade do Moneda;
- informar claramente que alguns dados exigem conexão;
- permitir retry manual.

### Regra de UX
A experiência offline deve ser útil, honesta e consistente com o produto. Não fingir que tudo funciona offline se os dados financeiros ainda dependem do backend. [web:42][web:44]

---

## Fase 5 — Instalação do app

Fazer o app ser instalável e comunicar isso da forma certa. A instalação depende de manifest válido, HTTPS e critérios do navegador. [web:33][web:35]

### Tarefas
- confirmar que o app atende aos critérios de installability;
- testar prompt de instalação no Android/Chrome;
- testar “Adicionar à Tela de Início” no iPhone/Safari;
- garantir abertura em modo standalone;
- opcionalmente criar CTA interno de instalação.

### Recomendação
Se for adicionar CTA de instalação, fazer isso com discrição e somente quando a instalação estiver realmente disponível. [web:38][web:47]

---

## Fase 6 — Responsividade e comportamento mobile

Uma boa PWA precisa funcionar muito bem em mobile, com viewport correta, safe areas e experiência parecida com app nativo. [web:38][web:44]

### Tarefas
- revisar viewport mobile;
- respeitar `safe-area-inset-*`;
- validar bottom nav em modo standalone;
- garantir que modais, sheets e FAB não quebrem na instalação;
- revisar splash/opening feel.

### Telas prioritárias para validação
- Dashboard
- Feed
- Insights
- Perfil
- Adicionar gasto
- Onboarding/login

---

## Fase 7 — Performance e app shell

Uma boa PWA deve abrir rápido e continuar rápida. O checklist do web.dev enfatiza rapidez, confiabilidade e adaptação a qualquer dispositivo. [web:38][web:41]

### Tarefas
- otimizar carregamento inicial;
- reduzir peso de imagens;
- garantir lazy loading onde necessário;
- evitar JS desnecessário no first load;
- melhorar tempo de carregamento do shell principal.

### Meta prática
- primeira abertura rápida;
- navegação entre telas fluida;
- funcionamento aceitável em rede lenta.

---

## Fase 8 — Segurança e dados do usuário

Como o Moneda trabalha com finanças pessoais, a PWA precisa manter segurança e previsibilidade no tratamento dos dados. HTTPS é obrigatório e a política de cache precisa respeitar o caráter privado das informações. [web:33][web:44]

### Tarefas
- garantir HTTPS em produção;
- revisar cabeçalhos e políticas de cache;
- não armazenar respostas sensíveis de forma insegura no service worker;
- revisar comportamento em logout para limpar dados locais/caches se necessário.

### Regra obrigatória
Nada de reaproveitar dados de um usuário para outro via cache de sessão.

---

## Fase 9 — Validação e testes

Validar a implementação com DevTools, Lighthouse e testes reais em dispositivo. Lighthouse e as documentações recomendam verificar manifest, service worker e installability explicitamente. [web:35][web:38][web:51][web:54]

### Checklist técnico de validação
- [ ] `manifest` carrega corretamente. [web:33][web:53]
- [ ] ícones 192 e 512 estão válidos. [web:35][web:59]
- [ ] service worker está ativo. [web:37][web:51]
- [ ] app instala no Chrome/Android. [web:35][web:38]
- [ ] app abre em standalone. [web:35]
- [ ] fallback offline aparece quando necessário. [web:42][web:54]
- [ ] Lighthouse sem erros críticos de PWA. [web:35][web:54]
- [ ] comportamento mobile continua íntegro após instalação. [web:38][web:44]

### Testes em dispositivos
- Android + Chrome
- iPhone + Safari
- Desktop Chrome/Edge
- modo claro e escuro

---

## Entregáveis esperados

Ao final, o agent deve entregar:

- manifest implementado;
- ícones oficiais do app;
- service worker funcional;
- fallback offline básico;
- registro do SW no app;
- validação de instalação;
- checklist final com pendências e limitações.

---

## Critério de pronto

Considerar a implementação concluída quando:

- o Moneda puder ser instalado como app;
- abrir em modo standalone;
- tiver manifesto e ícones válidos;
- possuir service worker ativo;
- apresentar experiência offline mínima;
- manter segurança e isolamento adequado dos dados do usuário;
- passar por validação básica de Lighthouse e testes reais. [web:35][web:38][web:44][web:49]

---

## Instrução final para o agent IA

Implemente suporte PWA completo no Moneda usando Next.js, com manifesto válido, ícones de instalação, service worker, fallback offline básico, abertura standalone e validação real em mobile. Preserve o design system e a navegação atual do app, e trate com cuidado o cache de dados financeiros para não expor informações privadas nem misturar contexto entre usuários. [web:33][web:37][web:38][web:49]