import type { Category } from '@/types';

export type BudgetPresetId = 'balanced' | 'essentials' | 'flexible';

export interface BudgetPreset {
  id: BudgetPresetId;
  label: string;
  description: string;
  weights: Record<string, number>;
}

export const BUDGET_PRESETS: BudgetPreset[] = [
  {
    id: 'balanced',
    label: 'Equilibrado',
    description: 'Uma divisão geral para começar sem pensar muito.',
    weights: {
      casa: 30,
      alimentacao: 25,
      transporte: 15,
      saude: 10,
      lazer: 10,
      educacao: 5,
      outros: 5,
    },
  },
  {
    id: 'essentials',
    label: 'Essenciais',
    description: 'Mais peso para casa, alimentação e deslocamento.',
    weights: {
      casa: 35,
      alimentacao: 30,
      transporte: 15,
      saude: 10,
      educacao: 5,
      outros: 5,
    },
  },
  {
    id: 'flexible',
    label: 'Flexível',
    description: 'Abre mais espaço para lazer mantendo o básico coberto.',
    weights: {
      alimentacao: 25,
      casa: 25,
      lazer: 15,
      transporte: 15,
      saude: 10,
      educacao: 5,
      outros: 5,
    },
  },
];

export function getBudgetPreset(id: BudgetPresetId): BudgetPreset {
  return BUDGET_PRESETS.find((preset) => preset.id === id) ?? BUDGET_PRESETS[0];
}

export function distributeBudgetByPreset(
  categories: Pick<Category, 'id'>[],
  totalCents: number,
  presetId: BudgetPresetId = 'balanced',
): Record<string, number> {
  const result = Object.fromEntries(categories.map((category) => [category.id, 0]));
  const preset = getBudgetPreset(presetId);
  const weightedCategories = categories
    .map((category) => ({ id: category.id, weight: preset.weights[category.id] ?? 0 }))
    .filter((category) => category.weight > 0);
  const totalWeight = weightedCategories.reduce((sum, category) => sum + category.weight, 0);

  if (totalCents <= 0 || totalWeight <= 0) return result;

  let distributed = 0;
  weightedCategories.forEach((category, index) => {
    const isLast = index === weightedCategories.length - 1;
    const amount = isLast
      ? totalCents - distributed
      : Math.round((totalCents * category.weight) / totalWeight);
    result[category.id] = Math.max(0, amount);
    distributed += amount;
  });

  return result;
}

export function roundBudgetValues(
  values: Record<string, number>,
  targetTotalCents: number,
  incrementCents: number = 1000,
): Record<string, number> {
  const entries = Object.entries(values);
  const rounded = Object.fromEntries(
    entries.map(([categoryId, amount]) => [
      categoryId,
      amount > 0 ? Math.max(incrementCents, Math.round(amount / incrementCents) * incrementCents) : 0,
    ]),
  );

  const currentTotal = Object.values(rounded).reduce((sum, amount) => sum + amount, 0);
  const difference = targetTotalCents - currentTotal;
  if (difference === 0) return rounded;

  const adjustmentTarget = entries
    .filter(([, amount]) => amount > 0)
    .sort(([, a], [, b]) => b - a)[0]?.[0];
  if (!adjustmentTarget) return rounded;

  rounded[adjustmentTarget] = Math.max(0, (rounded[adjustmentTarget] ?? 0) + difference);
  return rounded;
}
