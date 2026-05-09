import type { Expense, ExpenseFilters, ExpenseInput, DashboardMetrics } from '@/types';
import {
  getAllExpenses,
  addSessionExpense,
  CATEGORIES,
  getCategoryById,
  getExpensesByPeriod,
  MOCK_USER,
} from '@/data/mock';
import { generateId, getCurrentPeriod } from '@/lib/utils';

export async function getExpenses(filters: ExpenseFilters): Promise<Expense[]> {
  const userId = filters.userId ?? MOCK_USER.id;
  let expenses = getAllExpenses(userId);

  if (filters.category) {
    expenses = expenses.filter((e) => e.category === filters.category);
  }

  if (filters.startDate) {
    const start = new Date(filters.startDate);
    expenses = expenses.filter((e) => new Date(e.createdAt) >= start);
  }

  if (filters.endDate) {
    const end = new Date(filters.endDate);
    expenses = expenses.filter((e) => new Date(e.createdAt) <= end);
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    expenses = expenses.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        (getCategoryById(e.category)?.name.toLowerCase().includes(q) ?? false)
    );
  }

  expenses = expenses.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (filters.limit) {
    expenses = expenses.slice(0, filters.limit);
  }

  return expenses;
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const expense: Expense = {
    id: generateId(),
    ...input,
    createdAt: new Date(),
  };
  addSessionExpense(expense);
  return expense;
}

export async function getExpenseById(id: string): Promise<Expense | null> {
  const all = getAllExpenses(MOCK_USER.id);
  return all.find((e) => e.id === id) ?? null;
}

export async function getDashboardMetrics(
  userId: string,
  period: string
): Promise<DashboardMetrics> {
  const expenses = getExpensesByPeriod(userId, period);

  // Include session expenses from same period
  const sessionAll = getAllExpenses(userId);
  const [year, month] = period.split('-').map(Number);
  const periodExpenses = sessionAll.filter((e) => {
    const d = new Date(e.createdAt);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

  // Deduplicate (session may overlap with MOCK_EXPENSES for current period)
  const seen = new Set<string>();
  const allPeriod = periodExpenses.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  const totalSpent = allPeriod.reduce((sum, e) => sum + e.amount, 0);

  // Aggregate by category
  const byCat: Record<string, number> = {};
  for (const e of allPeriod) {
    byCat[e.category] = (byCat[e.category] ?? 0) + e.amount;
  }

  const topCategories = Object.entries(byCat)
    .sort(([, a], [, b]) => b - a)
    .map(([catId, amount]) => {
      const cat = getCategoryById(catId);
      return {
        categoryId: catId,
        categoryName: cat?.name ?? catId,
        categoryIcon: cat?.icon ?? '📦',
        categoryColor: cat?.color ?? '#6B7280',
        amount,
        percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0,
      };
    });

  // Daily spending
  const byDay: Record<string, number> = {};
  for (const e of allPeriod) {
    const d = new Date(e.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    byDay[key] = (byDay[key] ?? 0) + e.amount;
  }

  const dailySpending = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }));

  const recentExpenses = allPeriod
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return {
    period,
    totalSpent,
    expenseCount: allPeriod.length,
    topCategories,
    dailySpending,
    recentExpenses,
  };
}

export { CATEGORIES, getCategoryById };
