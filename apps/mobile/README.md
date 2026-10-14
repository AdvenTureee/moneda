# Moneda — Mobile

App nativo do Moneda (Expo / React Native + Expo Router + NativeWind).

> **Status:** PR-A (fundação). Login real funciona contra o Supabase do
> Moneda; telas internas são placeholders que serão preenchidas nos
> PRs seguintes.

## Pré-requisitos

- Node.js 24+ (mesma versão do web — ver `.node-version`/`package.json` raiz)
- Expo CLI (instalada automaticamente pelo `npm install`)
- iOS: Xcode + simulador iOS (macOS) ou Expo Go
- Android: Android Studio + emulador ou Expo Go

## Setup

Da raiz do monorepo:

```bash
# 1. Instalar dependências (npm workspaces → instala tudo: web + mobile + packages)
npm install

# 2. Garantir que o .env raiz tem EXPO_PUBLIC_SUPABASE_URL,
#    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY e EXPO_PUBLIC_API_BASE_URL.
#    (Já adicionado durante o PR-A.)
cat .env | grep EXPO_PUBLIC

# 3. Rodar o mobile
npm run mobile:start
# ou
cd apps/mobile && npx expo start
```

## Scripts

| Comando (raiz) | O que faz |
| --- | --- |
| `npm run mobile:dev` | Expo start |
| `npm run mobile:ios` | Abre no simulador iOS |
| `npm run mobile:android` | Abre no emulador Android |
| `npm run mobile:typecheck` | TypeScript estrito |
| `npm run mobile:test` | Testes (vitest/RNTL — em construção) |

## Estrutura

```
apps/mobile/
├── app/                  # Expo Router (file-based)
│   ├── _layout.tsx       # Providers raiz
│   ├── index.tsx         # Splash + redirect por sessão
│   ├── (auth)/           # Rotas públicas
│   └── (app)/            # Rotas autenticadas (tabs)
├── components/           # UI compartilhada (Money, Button, HelloMo)
├── lib/                  # supabase client, query-client, theme, session-provider
├── assets/               # Ícones/splash (criar em PR de polimento)
├── app.json              # Expo config (scheme "moneda://", bundle/app ids)
├── babel.config.js       # babel-preset-expo + reanimated
├── metro.config.js       # monorepo-friendly Metro
├── global.css            # stub (Tailwind entra em PR-F)
├── tsconfig.json         # Estende raiz + paths p/ @moneda/shared, @moneda/ui-tokens
└── package.json
```

> **Estilização:** PR-A usa StyleSheet nativo do React Native. NativeWind v4 + Tailwind
> entram no PR-F (polimento), pois a integração com Babel/MDX do SDK 53 ainda exige
> decisões que podem quebrar o bundle web. Manter simples por agora.

## Compartilhamento com o web

| Símbolo | De | Para quê |
| --- | --- | --- |
| `@moneda/shared` | `packages/shared` | Tipos, schema zod, formatadores BRL, categorias default |
| `@moneda/ui-tokens` | `packages/ui-tokens` | Cores, spacing, radii, tipografia (espelha `globals.css`) |

> O tipo `Database` do Supabase é re-exportado de `src/types/supabase.ts` no
> web — fonte única de verdade.

## Segurança

- O mobile só tem `EXPO_PUBLIC_*` no bundle — **nunca** `SUPABASE_SERVICE_ROLE_KEY`,
  `GROQ_API_KEY` ou `PII_ENCRYPTION_KEY`.
- Sessão persistente em `expo-secure-store` (Keychain iOS / Keystore Android).
- Toda chamada de IA passa pelo back (`${EXPO_PUBLIC_API_BASE_URL}/api/...`)
  com token Bearer do Supabase.

## Próximos PRs

- **PR-B** — Dashboard com dados reais, Feed, formulário de gasto, Onboarding.
- **PR-C** — Captura de voz + Groq Whisper (endpoint novo no back).
- **PR-D** — Chat com Mo e análise mensal.
- **PR-E** — Push notifications (Expo Push).
- **PR-F** — Polimento (tema, animações, testes E2E).
- **PR-G** — Build & publicação (EAS, App Store, Google Play).
