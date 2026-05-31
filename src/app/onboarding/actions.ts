'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import {
  createSessionClient,
  createServiceClient,
  isSupabaseEnabled,
} from '@/lib/supabase/server';
import { cacheTags } from '@/lib/cache';
import { MOCK_USER, addUserCategory, addSessionExpense } from '@/data/mock';
import { upsertBudget } from '@/lib/budgets';
import { getCurrentPeriod } from '@/lib/utils';
import { normalizeWhatsappPhone } from '@/lib/phone';
import { buildProfilePhonePiiUpdate } from '@/lib/security/profilePii';

export type OnboardingResult = { ok: true } | { ok: false; error: string };

export interface OnboardingRecurringExpense {
  description: string;
  amountCents: number;
  categoryId: string;
}

export interface OnboardingCustomCategory {
  name: string;
  icon: string;
  color: string;
}

export interface OnboardingCategoryBudget {
  categoryId: string;
  amountCents: number;
}

export interface OnboardingPayload {
  currentBalanceCents: number;
  monthlyBudgetCents: number;
  billingClosingDay: number;
  hasPet: boolean;
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
  return `u_${userId.replace(/-/g, '').slice(0, 8)}_${base}`.slice(0, 60);
}

function validatePayload(p: OnboardingPayload): string | null {
  if (!Number.isFinite(p.currentBalanceCents) || p.currentBalanceCents < 0) {
    return 'Saldo atual inválido.';
  }
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
      const admin = createServiceClient();
      const normalizedWhatsappPhone = normalizeWhatsappPhone(payload.whatsappPhone);

      // 1. Profile fields (incluindo o flag `onboarded` — fica em profiles
      //    porque user_metadata é sobrescrito a cada login OAuth).
      const { error: profileError } = await admin
        .from('profiles')
        .update({
          current_balance_cents: payload.currentBalanceCents || null,
          monthly_budget_cents: payload.monthlyBudgetCents || null,
          billing_closing_day: payload.billingClosingDay,
          has_pet: payload.hasPet,
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
        const { error: catError } = await admin.from('categories').insert(inserts);
        if (catError) {
          console.error('[completeOnboarding] custom categories:', catError);
          return { ok: false, error: 'Não foi possível criar suas categorias.' };
        }
      }

      // 3. Recurring expenses
      if ((payload.categoryBudgets ?? []).length > 0) {
        const period = getCurrentPeriod();
        await Promise.all((payload.categoryBudgets ?? []).map((budget) => upsertBudget({
          userId,
          categoryId: budget.categoryId,
          period,
          amountCents: Math.round(budget.amountCents),
        })));
        revalidateTag(cacheTags.budgets(userId), { expire: 0 });
        revalidateTag(cacheTags.metrics(userId), { expire: 0 });
      }

      // 4. Recurring expenses
      if (payload.recurringExpenses.length > 0) {
        const nowIso = new Date().toISOString();
        const inserts = payload.recurringExpenses.map((r) => ({
          user_id: userId,
          amount_cents: r.amountCents,
          category_id: r.categoryId,
          description: r.description.trim(),
          payment_method: 'other',
          source: 'manual',
          occurred_at: nowIso,
          is_recurring: true,
        }));
        const { error: expError } = await admin.from('expenses').insert(inserts);
        if (expError) {
          console.error('[completeOnboarding] recurring expenses:', expError);
          return { ok: false, error: 'Não foi possível salvar seus gastos recorrentes.' };
        }
      }

      // (onboarded já gravado em profiles no passo 1 — não usamos
      // auth.updateUser porque user_metadata é sobrescrito por providers OAuth.)
    } else {
      // Mock mode: persist via in-memory store.
      const userId = MOCK_USER.id;
      payload.customCategories.forEach((c, i) => {
        addUserCategory({
          id: buildCustomCategoryId(userId, c.name, i),
          name: c.name.trim(),
          icon: c.icon,
          color: c.color,
          keywords: [],
        });
      });
      if ((payload.categoryBudgets ?? []).length > 0) {
        const period = getCurrentPeriod();
        await Promise.all((payload.categoryBudgets ?? []).map((budget) => upsertBudget({
          userId,
          categoryId: budget.categoryId,
          period,
          amountCents: Math.round(budget.amountCents),
        })));
      }
      payload.recurringExpenses.forEach((r) => {
        addSessionExpense({
          id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          userId,
          amount: r.amountCents,
          category: r.categoryId,
          description: r.description.trim(),
          source: 'manual',
          paymentMethod: 'other',
          tags: [],
          createdAt: new Date(),
        });
      });
    }

    revalidatePath('/');
    revalidatePath('/perfil');
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado.';
    return { ok: false, error: message };
  }
}
