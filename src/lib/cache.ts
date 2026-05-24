/**
 * Tags de cache do Next (`unstable_cache` + `revalidateTag`).
 *
 * Todas as tags são escopadas por `userId` para que invalidar dados de um
 * usuário nunca afete outros. Usado pelos getters em `src/lib/*.ts` e pelas
 * mutations em `src/app/api/**` / `src/app/**\/actions*.ts`.
 *
 * Convenção: `user:<id>:<recurso>` — ler como "todos os caches do recurso X
 * do usuário Y".
 *
 * NOTA Next 16: estamos no "previous caching model" (sem `cacheComponents`).
 * Quando migrar pra `'use cache'` directive, esses helpers viram chamadas
 * para `cacheTag(...)`.
 */
export const cacheTags = {
  metrics: (userId: string) => `user:${userId}:metrics`,
  categories: (userId: string) => `user:${userId}:categories`,
  budgets: (userId: string) => `user:${userId}:budgets`,
  insights: (userId: string) => `user:${userId}:insights`,
  expenses: (userId: string) => `user:${userId}:expenses`,
  monthlyTotals: (userId: string) => `user:${userId}:monthlyTotals`,
  profile: (userId: string) => `user:${userId}:profile`,
} as const;

/**
 * Conjunto canônico de tags a invalidar quando o pull-to-refresh dispara
 * — invalida tudo do usuário.
 */
export function allUserTags(userId: string): string[] {
  return [
    cacheTags.metrics(userId),
    cacheTags.categories(userId),
    cacheTags.budgets(userId),
    cacheTags.insights(userId),
    cacheTags.expenses(userId),
    cacheTags.monthlyTotals(userId),
    cacheTags.profile(userId),
  ];
}
