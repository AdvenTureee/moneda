# Levantamento de seguranca e performance - 2026-06-14

Escopo: app Next.js 16.2.6 com Supabase, rotas API, PWA/landing e integracoes de IA. Nao foram feitas alteracoes de codigo neste levantamento.

## Resumo executivo

- Build, TypeScript e testes automatizados passaram.
- Next.js esta em `16.2.6`, versao corrigida para o pacote de seguranca de maio/2026. Ainda ha patch mais novo (`16.2.9`).
- APIs privadas testadas como anonimas retornaram `401`; `/app` redirecionou para `/login`.
- `npm audit` encontrou vulnerabilidade moderada transitiva em `postcss` dentro de `next`.
- `secretlint` nos arquivos rastreados passou limpo; `.env` esta ignorado.
- Principais riscos: funcao Supabase `security definer` antiga ainda presente, headers de seguranca ausentes, rate limit incompleto, upload validando MIME sem magic bytes, middleware/proxy global custando performance e cache, e landing com JS/imagens pesados.

## Achados priorizados

### Alta - Funcao Supabase perigosa permanece apos migracao de correcao

Evidencia:
- `supabase/migrations/20260610215153_unlink_google_identity.sql` cria `public.unlink_google_identity(target_user_id uuid)` como `security definer`.
- `supabase/migrations/20260610215933_fix_unlink_google_identity.sql` cria uma versao sem argumento usando `auth.uid()`, mas nao remove a overload antiga.

Impacto: se a funcao antiga ainda existir no banco, uma chamada RPC com `target_user_id` pode remover identidade Google de outro usuario. Por ser `security definer` em schema `public`, deve ser tratada como exposicao critica ate confirmar no banco.

Recomendacao:

```sql
drop function if exists public.unlink_google_identity(uuid);
revoke execute on function public.unlink_google_identity() from public, anon;
grant execute on function public.unlink_google_identity() to authenticated;
```

Depois, testar RPC autenticado do proprio usuario e chamada com parametro antigo.

### Media/Alta - Headers HTTP de seguranca incompletos

Evidencia:
- `next.config.ts` nao define `headers()`.
- `curl -I https://www.moneda.info/` mostrou HSTS via Vercel, mas nao mostrou `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` nem `Permissions-Policy`.
- Localmente ainda apareceu `X-Powered-By: Next.js`.

Recomendacao:
- Adicionar headers globais no `next.config.ts`.
- Definir `poweredByHeader: false`.
- Comecar CSP em `Content-Security-Policy-Report-Only`, porque ha script inline de tema em `src/app/layout.tsx`.

### Media - Middleware efetivo esta deprecated e aplica auth/no-store globalmente

Evidencia:
- Build: `"middleware" file convention is deprecated. Please use "proxy" instead.`
- `.next/server/middleware-manifest.json` usa o matcher do `middleware.ts` da raiz.
- Existe tambem `src/middleware.ts`, mas ele nao e o efetivo no build atual.
- `middleware.ts` chama Supabase antes de decidir se a rota e publica e aplica `Cache-Control: no-store` tambem na home.

Impacto: custo extra em rotas publicas, pior cache/browser performance, confusao operacional por dois middlewares e risco futuro em Next 16+.

Recomendacao:
- Migrar para `proxy.ts`.
- Manter um unico arquivo.
- Fazer bypass cedo para assets e rotas publicas que nao precisam detectar usuario.
- Nao aplicar `no-store` na landing publica.
- Nao depender do proxy como unica autorizacao; manter checks dentro das rotas, como ja ocorre em varias APIs.

### Media - Rate limiting incompleto e nao distribuido

Evidencia:
- `src/app/api/ai/chat/route.ts` tem limite de 12/min por usuario.
- `src/lib/rateLimit.ts` usa `Map` em memoria, por instancia.
- Rotas caras sem limite equivalente: `api/ai/categorize`, `api/ai/summary`, `api/ai/mo-tips`, uploads de avatar/comprovante.

Impacto: abuso por usuario autenticado pode gerar custo de IA/storage/CPU; limite em memoria nao funciona bem em serverless multi-instancia.

Recomendacao:
- Usar rate limit persistente/distribuido por user id e IP, com Redis/Upstash/Vercel KV/Supabase table.
- Aplicar limites separados para IA, upload e troca de email.
- Retornar `Retry-After` consistentemente.

### Media - Upload confia em `file.type`

Evidencia:
- `src/app/api/upload-avatar/route.ts` valida MIME, mas se `sharp()` falhar mantem o buffer original.
- `src/app/api/expenses/receipt/route.ts` aceita imagens/PDF por MIME declarado, sem validar magic bytes.

Impacto: cliente customizado pode enviar conteudo diferente do MIME informado. Dependendo dos headers do Storage, isso pode virar XSS/content sniffing ou armazenamento de arquivo invalido.

Recomendacao:
- Validar assinatura dos arquivos (`ffd8` JPEG, PNG, WebP, `%PDF-`).
- Para avatar, rejeitar se `sharp` nao conseguir decodificar/converter.
- Salvar sempre avatar convertido para formato controlado.
- Para PDF, servir com `Content-Disposition: attachment` quando possivel.

### Media - Redirect de reset depende de Host/X-Forwarded-Host

Evidencia:
- `src/app/(app)/perfil/actions.ts` monta `origin` a partir de headers para `resetPasswordForEmail`.

Impacto: se a allowlist de redirect do Supabase estiver ampla, pode haver host header injection em link de reset.

Recomendacao:
- Usar origem fixa de env, por exemplo `APP_URL=https://www.moneda.info`, ou allowlist explicita.

### Baixa/Media - CSV export vulneravel a formula injection

Evidencia:
- `src/app/api/export/route.ts` escapa aspas, mas nao neutraliza campos que comecam com `=`, `+`, `-`, `@`, tab ou CR.

Impacto: ao abrir o CSV no Excel/Sheets, dados controlados pelo usuario ou integracoes futuras podem virar formula.

Recomendacao:
- Prefixar campos perigosos com `'` antes de escapar CSV.

### Baixa/Operacional - `supabase/.temp/*` esta rastreado

Evidencia:
- `git ls-files` mostra `supabase/.temp/linked-project.json`, `pooler-url`, `project-ref`, versoes etc.
- `.env` esta ignorado e nao rastreado.

Impacto: nao e service role key, mas expoe metadados de projeto e pooler. Ruido sensivel em repositorio.

Recomendacao:
- Adicionar `supabase/.temp/` ao `.gitignore`.
- Remover do indice com `git rm --cached -r supabase/.temp`.

## Performance

### Principais gargalos

- Landing inteira e client component: `src/components/home/HomeLanding.tsx` usa `framer-motion`, muitos icones e bastante estado/interacao.
- Bundle estatico: `.next/static/chunks` tem cerca de 2.3 MB de JS bruto e 164 KB de CSS bruto; gzip agregado de JS+CSS ficou em ~698 KB.
- Imagens grandes em `public/`: `dash-light.PNG` 1.3 MB e `feed-light.PNG` 1.0 MB.
- `PreviewCarousel` marca dois screenshots como `priority`, entao a home pre-carrega `dash-light.PNG` e `feed-light.PNG`.
- Middleware aplica `no-store` na home e roda em rota publica.

### Recomendacoes

- Separar landing em Server Component e mover apenas carousel/tema/interacoes para ilhas client.
- Remover `priority` do segundo screenshot do carousel; deixar apenas a imagem LCP real.
- Converter screenshots para WebP/AVIF e revisar dimensoes reais.
- Trocar `<img>` decorativos por `next/image` ou inline SVG controlado quando fizer sentido.
- Remover `no-store` de rotas publicas; aplicar apenas em paginas/API privadas.
- Adicionar `@next/bundle-analyzer` e budget de JS/CSS no CI.

## Checks executados

```bash
npm audit --json
npm run test
npx tsc --noEmit
npm run build
npx secretlint ... # preset recomendado nos arquivos rastreados
bash security-audit-dispatcher.sh <project>
curl -I https://www.moneda.info/
curl http://localhost:3000/api/dashboard
curl http://localhost:3000/api/expenses
curl -X POST http://localhost:3000/api/ai/categorize
curl http://localhost:3000/app
```

Resultados:
- Testes: 10/10 passaram.
- TypeScript: passou.
- Build: passou.
- Scanner JS do skill: sem `eval`, `innerHTML`, `document.write`, `Function`, `postMessage` suspeito ou `Math.random`.
- Secrets: `secretlint` limpo nos arquivos rastreados; regex manual sem chaves reais fora de `.env`.
- Lighthouse CLI: nao executado porque o ambiente nao tem Chrome instalado.

## Proximos passos sugeridos

1. Corrigir/drop da funcao Supabase antiga `unlink_google_identity(uuid)` e validar grants.
2. Adicionar headers de seguranca e desativar `X-Powered-By`.
3. Migrar `middleware.ts` para `proxy.ts`, removendo o middleware duplicado em `src/`.
4. Implementar rate limit distribuido para IA/uploads.
5. Endurecer upload com magic bytes e conversao obrigatoria.
6. Criar CI com `npm audit --audit-level=high`, typecheck, testes, secretlint/gitleaks e Lighthouse CI.
