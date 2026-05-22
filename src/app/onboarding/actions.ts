'use server';

import { revalidatePath } from 'next/cache';
import { createSessionClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { upsertBudget } from '@/lib/budgets';
import { MOCK_USER } from '@/data/mock';

export type OnboardingResult = { ok: true } | { ok: false; error: string };

export interface OnboardingBudgetItem {
  categoryId: string;
  amountCents: number;
}

export async function completeOnboardingAction(
  items: OnboardingBudgetItem[],
  period: string,
): Promise<OnboardingResult> {
  try {
    let userId = MOCK_USER.id;

    if (isSupabaseEnabled()) {
      const supabase = await createSessionClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { ok: false, error: 'Sessão expirada. Entre novamente.' };
      userId = user.id;

      // Persist non-zero budgets for the period.
      const nonZero = items.filter((it) => it.amountCents > 0);
      await Promise.all(
        nonZero.map((it) =>
          upsertBudget({
            userId,
            categoryId: it.categoryId,
            period,
            amountCents: it.amountCents,
          }),
        ),
      );

      // Mark the user as onboarded so the dashboard stops redirecting them here.
      const { error } = await supabase.auth.updateUser({ data: { onboarded: true } });
      if (error) {
        console.error('[completeOnboarding] updateUser:', error);
        return { ok: false, error: 'Não foi possível concluir. Tente novamente.' };
      }
    } else {
      // Mock mode — persist non-zero budgets via the in-memory store.
      const nonZero = items.filter((it) => it.amountCents > 0);
      await Promise.all(
        nonZero.map((it) =>
          upsertBudget({
            userId,
            categoryId: it.categoryId,
            period,
            amountCents: it.amountCents,
          }),
        ),
      );
    }

    revalidatePath('/');
    revalidatePath('/perfil/orcamento');
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado.';
    return { ok: false, error: message };
  }
}
