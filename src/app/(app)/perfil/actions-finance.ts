'use server';

import { updateTag } from 'next/cache';
import { createSessionClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { upsertBudget } from '@/lib/budgets';
import { createIncome, deleteIncome } from '@/lib/incomes';
import { MOCK_USER } from '@/data/mock';
import type { IncomeSource } from '@/types';
import { cacheTags } from '@/lib/cache';

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export interface CategoryBudgetEntry {
  categoryId: string;
  amountCents: number;
}

/**
 * Salva ou atualiza o orçamento de uma determinada categoria para um período.
 */
export async function saveCategoryBudgetAction(
  categoryId: string,
  amountCents: number,
  period: string
): Promise<ActionResult> {
  try {
    let userId = MOCK_USER.id;
    if (isSupabaseEnabled()) {
      const supabase = await createSessionClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { ok: false, error: 'Sessão expirada. Entre novamente.' };
      userId = user.id;
    }

    await upsertBudget({
      userId,
      categoryId,
      period,
      amountCents,
    });

    // updateTag → próximo render espera dados frescos (read-your-own-writes).
    updateTag(cacheTags.budgets(userId));
    updateTag(cacheTags.metrics(userId));
    return { ok: true, message: 'Orçamento atualizado com sucesso!' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Falha ao salvar orçamento.' };
  }
}

export async function saveCategoryBudgetsAction(
  entries: CategoryBudgetEntry[],
  period: string,
  monthlyBudgetCents?: number,
): Promise<ActionResult> {
  try {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
      return { ok: false, error: 'Período inválido.' };
    }

    for (const entry of entries) {
      if (!entry.categoryId) return { ok: false, error: 'Categoria inválida.' };
      if (!Number.isFinite(entry.amountCents) || entry.amountCents < 0) {
        return { ok: false, error: 'Valor de orçamento inválido.' };
      }
    }

    if (monthlyBudgetCents !== undefined && (!Number.isFinite(monthlyBudgetCents) || monthlyBudgetCents < 0)) {
      return { ok: false, error: 'Orçamento mensal inválido.' };
    }

    let userId = MOCK_USER.id;
    if (isSupabaseEnabled()) {
      const supabase = await createSessionClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { ok: false, error: 'Sessão expirada. Entre novamente.' };
      userId = user.id;

      if (monthlyBudgetCents !== undefined) {
        const { createServiceClient } = await import('@/lib/supabase/server');
        const admin = createServiceClient();
        const { error } = await admin
          .from('profiles')
          .update({ monthly_budget_cents: monthlyBudgetCents || null })
          .eq('id', userId);
        if (error) {
          console.error('[saveCategoryBudgetsAction] monthly budget:', error);
          return { ok: false, error: 'Não foi possível salvar o orçamento mensal.' };
        }
      }
    }

    await Promise.all(entries.map((entry) => upsertBudget({
      userId,
      categoryId: entry.categoryId,
      period,
      amountCents: Math.round(entry.amountCents),
    })));

    updateTag(cacheTags.budgets(userId));
    updateTag(cacheTags.metrics(userId));
    updateTag(cacheTags.profile(userId));
    return { ok: true, message: 'Orçamentos salvos com sucesso!' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Falha ao salvar orçamentos.' };
  }
}

/**
 * Cadastra um novo ganho para o usuário logado.
 */
export async function saveIncomeAction(
  description: string,
  amountCents: number,
  source: IncomeSource,
  isRecurring: boolean,
  receivedAtString?: string
): Promise<ActionResult> {
  try {
    if (!description.trim()) {
      return { ok: false, error: 'A descrição é obrigatória.' };
    }
    if (amountCents <= 0) {
      return { ok: false, error: 'O valor deve ser maior que zero.' };
    }

    let userId = MOCK_USER.id;
    if (isSupabaseEnabled()) {
      const supabase = await createSessionClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { ok: false, error: 'Sessão expirada. Entre novamente.' };
      userId = user.id;
    }

    const receivedAt = receivedAtString ? new Date(receivedAtString) : new Date();

    await createIncome({
      userId,
      amount: amountCents,
      description: description.trim(),
      source,
      isRecurring,
      receivedAt,
    });

    // Income afeta o orçamento mensal calculado em getMonthlyBudgetCents().
    updateTag(cacheTags.profile(userId));
    updateTag(cacheTags.budgets(userId));
    return { ok: true, message: 'Ganho lançado com sucesso!' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Falha ao salvar ganho.' };
  }
}

/**
 * Remove (soft delete) um ganho do usuário.
 */
export async function deleteIncomeAction(id: string): Promise<ActionResult> {
  try {
    let userId = MOCK_USER.id;
    if (isSupabaseEnabled()) {
      const supabase = await createSessionClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { ok: false, error: 'Sessão expirada. Entre novamente.' };
      userId = user.id;
    }

    await deleteIncome(id, userId);

    updateTag(cacheTags.profile(userId));
    updateTag(cacheTags.budgets(userId));
    return { ok: true, message: 'Ganho removido com sucesso!' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Falha ao deletar ganho.' };
  }
}
