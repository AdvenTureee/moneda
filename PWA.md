# PWA do Moneda

Este app esta preparado para instalacao como PWA em iOS/iPadOS e Android, com cache conservador para preservar dados financeiros.

## O que fica habilitado

- Manifest em `public/manifest.json` com `start_url`, `scope`, `display`, idioma, categoria e atalhos.
- Metadata no `src/app/layout.tsx` para Apple Web App, icons e viewport com safe area.
- Service worker em `public/sw.js`, registrado por `src/components/PWARegistrar.tsx` apenas em producao.
- Pagina offline em `public/offline.html`.
- Icones derivados do arquivo mestre `moico-png.png`.

## Icones

Arquivos principais:

- `public/apple-touch-icon.png` - 180x180 opaco para iOS/iPadOS.
- `public/moico-192.png` e `public/moico-512.png` - requisitos basicos de instalacao Android/Chrome.
- `public/moico-maskable-512.png` - icone com safe zone para adaptive icons Android.
- `public/moico-monochrome-512.png` - icone para themed icons Android.

Tamanhos extras publicados no manifest: 72, 96, 128, 144, 152, 180, 192, 256, 384 e 512.

## Estrategia de cache

O service worker nao cacheia `/api/*` nem respostas de navegacao autenticadas. Isso evita guardar dados financeiros pessoais no cache do navegador.

Ele faz cache de:

- pagina offline;
- manifest;
- icones;
- imagens, fontes, estilos, scripts e assets de `/_next/static/` com stale-while-revalidate.

Quando o usuario abre uma rota sem internet, a requisicao tenta a rede primeiro e cai em `offline.html` se falhar.

## Checklist de validacao

1. Rodar `npm run build`.
2. Servir a build com HTTPS ou localhost.
3. Abrir DevTools > Application > Manifest e confirmar que nao ha erros de instalabilidade.
4. Verificar Service Workers > `sw.js` ativo.
5. Testar modo offline: rotas devem cair em `offline.html`, enquanto dados financeiros nao devem ser servidos de cache antigo.
6. Em Android, conferir se o icone maskable nao corta o desenho.
7. Em iOS/iPadOS, adicionar a tela inicial e conferir nome, splash/background e icone opaco.
