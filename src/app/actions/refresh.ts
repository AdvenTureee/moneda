'use server';

import { updateTag } from 'next/cache';
import { createSessionClient } from '@/lib/supabase/server';
import { allUserTags } from '@/lib/cache';

/**
 * Invalida todos os caches do usuário logado. Disparado pelo pull-to-refresh
 * antes do `router.refresh()` no client.
 *
 * Usa `updateTag` (Server Action API) para semântica read-your-own-writes:
 * a próxima request para qualquer page com essas tags vai esperar dados
 * frescos antes de renderizar.
 */
export async function refreshUserDataAction(): Promise<{ ok: boolean }> {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  for (const tag of allUserTags(user.id)) {
    updateTag(tag);
  }
  return { ok: true };
}
