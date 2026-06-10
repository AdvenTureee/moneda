'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import {
  createSessionClient,
  isSupabaseEnabled,
} from '@/lib/supabase/server';
import { cacheTags } from '@/lib/cache';
import { MOCK_USER, addUserCategory, addSessionExpense } from '@/data/mock';
import { upsertBudget } from '@/lib/budgets';
import { createExpense } from '@/lib/expenses';
import { getCurrentBillingPeriod } from '@/lib/billingCycle';
import { normalizeWhatsappPhone } from '@/lib/phone';
import { buildProfilePhonePiiUpdate } from '@/lib/security/profilePii';

export type OnboardingResult = { ok: true } | { ok: false; error: string };

export interface OnboardingRecurringExpense {
  description: string;
  amountCents: number;
  categoryId: string;
  occurredAt: string;
}

export interface OnboardingCustomCategory {
  clientId?: string;
  name: string;
  icon: string;
  color: string;
}

export interface OnboardingCategoryBudget {
  categoryId: string;
  amountCents: number;
}

export interface OnboardingPayload {
  monthlyBudgetCents: number;
  billingClosingDay: number;
  recurringExpenses: OnboardingRecurringExpense[];
  customCategories: OnboardingCustomCategory[];
  categoryBudgets?: OnboardingCategoryBudget[];
  whatsappPhone?: string | null;
}

function slugifyCategoryName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^([0-9])/, 'c$1');
}

function buildCustomCategoryId(userId: string, name: string, index: number): string {
  const base = slugifyCategoryName(name) || `cat${index}`;
  return `u_${userId.replace(/-/g, '').slice(0, 8)}_${base}_${index + 1}`.slice(0, 60);
}

function validatePayload(p: OnboardingPayload): string | null {
  if (!Number.isFinite(p.monthlyBudgetCents) || p.monthlyBudgetCents < 0) {
    return 'Orçamento mensal inválido.';
  }
  if (!Number.isInteger(p.billingClosingDay) || p.billingClosingDay < 1 || p.billingClosingDay > 28) {
    return 'Dia de fechamento deve estar entre 1 e 28.';
  }
  for (const r of p.recurringExpenses) {
    if (!r.description.trim()) return 'Cada gasto recorrente precisa de uma descrição.';
    if (!Number.isFinite(r.amountCents) || r.amountCents <= 0) return 'Valor do gasto inválido.';
    if (!r.categoryId) return 'Selecione uma categoria para cada gasto.';
    if (!r.occurredAt || Number.isNaN(new Date(r.occurredAt).getTime())) return 'Data do gasto recorrente inválida.';
  }
  for (const b of p.categoryBudgets ?? []) {
    if (!b.categoryId) return 'Categoria de orçamento inválida.';
    if (!Number.isFinite(b.amountCents) || b.amountCents < 0) return 'Valor de orçamento inválido.';
  }
  if (p.whatsappPhone && !normalizeWhatsappPhone(p.whatsappPhone)) {
    return 'Telefone do WhatsApp inválido.';
  }
  for (const c of p.customCategories) {
    if (!c.name.trim()) return 'Categoria personalizada precisa de um nome.';
    if (!/^#[0-9A-Fa-f]{6}$/.test(c.color)) return 'Cor de categoria inválida.';
    if (!c.icon.trim()) return 'Selecione um ícone para a categoria.';
  }
  return null;
}

export async function completeOnboardingAction(
  payload: OnboardingPayload,
): Promise<OnboardingResult> {
  const validationError = validatePayload(payload);
  if (validationError) return { ok: false, error: validationError };

  try {
    if (isSupabaseEnabled()) {
      const supabase = await createSessionClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { ok: false, error: 'Sessão expirada. Entre novamente.' };
      const userId = user.id;
      const normalizedWhatsappPhone = normalizeWhatsappPhone(payload.whatsappPhone);

      // 1. Profile fields (incluindo o flag `onboarded` — fica em profiles
      //    porque user_metadata é sobrescrito a cada login OAuth).
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          monthly_budget_cents: payload.monthlyBudgetCents || null,
          billing_closing_day: payload.billingClosingDay,
          has_pet: true,
          onboarded: true,
          ...(normalizedWhatsappPhone
            ? buildProfilePhonePiiUpdate(normalizedWhatsappPhone)
            : {}),
        })
        .eq('id', userId);
      if (profileError) {
        console.error('[completeOnboarding] profile update:', profileError);
        return { ok: false, error: 'Não foi possível salvar seu perfil.' };
      }
      revalidateTag(cacheTags.profile(userId), { expire: 0 });

      // 2. Custom categories
      const customCategoryIdMap = new Map<string, string>();
      if (payload.customCategories.length > 0) {
        const inserts = payload.customCategories.map((c, i) => ({
          id: buildCustomCategoryId(userId, c.name, i),
          user_id: userId,
          name: c.name.trim(),
          icon: c.icon,
          color: c.color,
          keywords: [] as string[],
          is_default: false,
          sort_order: 1000 + i,
        }));
        const { error: catError } = await supabase.from('categories').insert(inserts);
        if (catError) {
          console.error('[completeOnboarding] custom categories:', catError);
          return { ok: false, error: 'Não foi possível criar suas categorias.' };
        }
        payload.customCategories.forEach((category, index) => {
          if (category.clientId) customCategoryIdMap.set(category.clientId, inserts[index].id);
        });
      }
      const resolveCategoryId = (categoryId: string) => customCategoryIdMap.get(categoryId) ?? categoryId;

      // 3. Category budgets
      if ((payload.categoryBudgets ?? []).length > 0) {
        const period = getCurrentBillingPeriod(payload.billingClosingDay);
        await Promise.all((payload.categoryBudgets ?? []).map((budget) => upsertBudget({
          userId,
          categoryId: resolveCategoryId(budget.categoryId),
          period,
          amountCents: Math.round(budget.amountCents),
        })));
        revalidateTag(cacheTags.budgets(userId), { expire: 0 });
        revalidateTag(cacheTags.metrics(userId), { expire: 0 });
      }

      // 4. Recurring expenses
      if (payload.recurringExpenses.length > 0) {
        try {
          await Promise.all(payload.recurringExpenses.map((r) => createExpense({
            userId,
            amount: r.amountCents,
            category: resolveCategoryId(r.categoryId),
            description: r.description.trim(),
            paymentMethod: 'other',
            source: 'manual',
            tags: [],
            occurredAt: r.occurredAt,
            isRecurring: true,
          })));
        } catch (expError) {
          console.error('[completeOnboarding] recurring expenses:', expError);
          return { ok: false, error: 'Não foi possível salvar seus gastos recorrentes.' };
        }
        revalidateTag(cacheTags.expenses(userId), { expire: 0 });
        revalidateTag(cacheTags.metrics(userId), { expire: 0 });
        revalidateTag(cacheTags.monthlyTotals(userId), { expire: 0 });
      }

      // (onboarded já gravado em profiles no passo 1 — não usamos
      // auth.updateUser porque user_metadata é sobrescrito por providers OAuth.)
    } else {
      // Mock mode: persist via in-memory store.
      const userId = MOCK_USER.id;
      const customCategoryIdMap = new Map<string, string>();
      payload.customCategories.forEach((c, i) => {
        const id = buildCustomCategoryId(userId, c.name, i);
        addUserCategory({
          id,
          name: c.name.trim(),
          icon: c.icon,
          color: c.color,
          keywords: [],
        });
        if (c.clientId) customCategoryIdMap.set(c.clientId, id);
      });
      const resolveCategoryId = (categoryId: string) => customCategoryIdMap.get(categoryId) ?? categoryId;
      if ((payload.categoryBudgets ?? []).length > 0) {
        const period = getCurrentBillingPeriod(payload.billingClosingDay);
        await Promise.all((payload.categoryBudgets ?? []).map((budget) => upsertBudget({
          userId,
          categoryId: resolveCategoryId(budget.categoryId),
          period,
          amountCents: Math.round(budget.amountCents),
        })));
      }
      payload.recurringExpenses.forEach((r) => {
        addSessionExpense({
          id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          userId,
          amount: r.amountCents,
          category: resolveCategoryId(r.categoryId),
          description: r.description.trim(),
          source: 'manual',
          paymentMethod: 'other',
          tags: [],
          isRecurring: true,
          createdAt: new Date(r.occurredAt),
        });
      });
    }

    revalidatePath('/feed');
    revalidatePath('/perfil');
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado.';
    return { ok: false, error: message };
  }
}
