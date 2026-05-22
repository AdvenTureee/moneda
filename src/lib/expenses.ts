import type { Category, Expense, ExpenseFilters, ExpenseInput, DashboardMetrics } from '@/types';
import type { Database } from '@/types/supabase';
import { createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { getCategoriesByIds } from '@/lib/categories';

type ExpensesRow = Database['public']['Tables']['expenses']['Row'];
type ExpensesInsert = Database['public']['Tables']['expenses']['Insert'];
import {
  getAllExpenses as mockGetAll,
  addSessionExpense,
  removeSessionExpense,
  updateSessionExpense,
  getCategoryById,
  getExpensesByPeriod,
  MOCK_USER,
} from '@/data/mock';
import { generateId } from '@/lib/utils';

const FALLBACK_CATEGORY: Pick<Category, 'name' | 'icon' | 'color'> = {
  name: 'Outros',
  icon: 'Package',
  color: '#6B7280',
};

function attachCategoryData(expense: Expense, categories: Map<string, Category>): Expense {
  const cat = categories.get(expense.category);
  return {
    ...expense,
    categoryData: {
      id: expense.category,
      name: cat?.name ?? FALLBACK_CATEGORY.name,
      icon: cat?.icon ?? FALLBACK_CATEGORY.icon,
      color: cat?.color ?? FALLBACK_CATEGORY.color,
    },
  };
}

async function enrichWithCategoriesFromDB(
  userId: string,
  expenses: Expense[],
): Promise<{ expenses: Expense[]; categories: Map<string, Category> }> {
  const ids = expenses.map((e) => e.category);
  const categories = await getCategoriesByIds(userId, ids);
  return { expenses: expenses.map((e) => attachCategoryData(e, categories)), categories };
}

function enrichWithCategoriesFromMock(expenses: Expense[]): {
  expenses: Expense[];
  categories: Map<string, Category>;
} {
  const categories = new Map<string, Category>();
  for (const e of expenses) {
    if (categories.has(e.category)) continue;
    const cat = getCategoryById(e.category);
    if (cat) categories.set(e.category, cat);
  }
  return { expenses: expenses.map((e) => attachCategoryData(e, categories)), categories };
}

// ---------------------------------------------------------------------------
// Row → App type mapping
// ---------------------------------------------------------------------------
function rowToExpense(row: ExpensesRow): Expense {
  return {
    id: row.id,
    userId: row.user_id,
    amount: row.amount_cents,
    category: row.category_id,
    description: row.description,
    source: row.source as import('@/types').ExpenseSource,
    tags: row.tags,
    createdAt: new Date(row.occurred_at),
  };
}

// ---------------------------------------------------------------------------
// Supabase implementations
// ---------------------------------------------------------------------------
async function getExpensesFromDB(filters: ExpenseFilters): Promise<Expense[]> {
  const db = createServiceClient();
  if (!filters.userId) {
    throw new Error('userId é obrigatório para buscar despesas do banco');
  }
  const userId = filters.userId;

  let query = db
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('occurred_at', { ascending: false });

  if (filters.category) query = query.eq('category_id', filters.category);
  if (filters.startDate) query = query.gte('occurred_at', filters.startDate);
  if (filters.endDate) query = query.lte('occurred_at', filters.endDate);
  if (filters.search) {
    query = query.ilike('description', `%${filters.search}%`);
  }
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw new Error(`getExpenses: ${error.message}`);
  const expenses = (data as ExpensesRow[]).map(rowToExpense);
  const enriched = await enrichWithCategoriesFromDB(userId, expenses);
  return enriched.expenses;
}

async function createExpenseInDB(input: ExpenseInput): Promise<Expense> {
  const db = createServiceClient();
  if (!input.userId) {
    throw new Error('userId é obrigatório para cadastrar despesa');
  }

  const insert: ExpensesInsert = {
    user_id: input.userId,
    amount_cents: input.amount,
    category_id: input.category,
    description: input.description,
    source: input.source,
    tags: input.tags,
    occurred_at: new Date().toISOString(),
  };

  const { data, error } = await db
    .from('expenses')
    .insert(insert)
    .select()
    .single();

  if (error) throw new Error(`createExpense: ${error.message}`);
  return rowToExpense(data as ExpensesRow);
}

async function getExpenseByIdFromDB(id: string): Promise<Expense | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from('expenses')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) return null;
  return rowToExpense(data as ExpensesRow);
}

async function getDashboardMetricsFromDB(
  userId: string,
  period: string
): Promise<DashboardMetrics> {
  const db = createServiceClient();
  const [year, month] = period.split('-').map(Number);
  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 0, 23, 59, 59).toISOString();

  const { data, error } = await db
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('occurred_at', start)
    .lte('occurred_at', end);

  if (error) throw new Error(`getDashboardMetrics: ${error.message}`);

  const rows = (data as ExpensesRow[]).map(rowToExpense);
  const { expenses: enriched, categories } = await enrichWithCategoriesFromDB(userId, rows);
  const totalSpent = enriched.reduce((sum, e) => sum + e.amount, 0);

  const byCat: Record<string, number> = {};
  for (const e of enriched) {
    byCat[e.category] = (byCat[e.category] ?? 0) + e.amount;
  }

  const topCategories = Object.entries(byCat)
    .sort(([, a], [, b]) => b - a)
    .map(([catId, amount]) => {
      const cat = categories.get(catId);
      return {
        categoryId: catId,
        categoryName: cat?.name ?? FALLBACK_CATEGORY.name,
        categoryIcon: cat?.icon ?? FALLBACK_CATEGORY.icon,
        categoryColor: cat?.color ?? FALLBACK_CATEGORY.color,
        amount,
        percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0,
      };
    });

  const byDay: Record<string, number> = {};
  for (const e of enriched) {
    const d = new Date(e.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    byDay[key] = (byDay[key] ?? 0) + e.amount;
  }

  const dailySpending = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }));

  const recentExpenses = [...enriched]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return {
    period,
    totalSpent,
    expenseCount: enriched.length,
    topCategories,
    dailySpending,
    recentExpenses,
  };
}

// ---------------------------------------------------------------------------
// Mock fallback implementations (unchanged from before)
// ---------------------------------------------------------------------------
function getExpensesFromMock(filters: ExpenseFilters): Expense[] {
  const userId = filters.userId ?? MOCK_USER.id;
  let expenses = mockGetAll(userId);
  if (filters.category) expenses = expenses.filter((e) => e.category === filters.category);
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
  if (filters.limit) expenses = expenses.slice(0, filters.limit);
  return enrichWithCategoriesFromMock(expenses).expenses;
}

function getDashboardMetricsFromMock(userId: string, period: string): DashboardMetrics {
  const expenses = getExpensesByPeriod(userId, period);
  const sessionAll = mockGetAll(userId);
  const [year, month] = period.split('-').map(Number);
  const periodExpenses = sessionAll.filter((e) => {
    const d = new Date(e.createdAt);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });
  const seen = new Set<string>();
  const allPeriod = periodExpenses.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
  // Also merge mock expenses from getExpensesByPeriod
  for (const e of expenses) {
    if (!seen.has(e.id)) { seen.add(e.id); allPeriod.push(e); }
  }
  const { expenses: enriched, categories } = enrichWithCategoriesFromMock(allPeriod);
  const totalSpent = enriched.reduce((sum, e) => sum + e.amount, 0);
  const byCat: Record<string, number> = {};
  for (const e of enriched) byCat[e.category] = (byCat[e.category] ?? 0) + e.amount;
  const topCategories = Object.entries(byCat)
    .sort(([, a], [, b]) => b - a)
    .map(([catId, amount]) => {
      const cat = categories.get(catId);
      return { categoryId: catId, categoryName: cat?.name ?? FALLBACK_CATEGORY.name, categoryIcon: cat?.icon ?? FALLBACK_CATEGORY.icon, categoryColor: cat?.color ?? FALLBACK_CATEGORY.color, amount, percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0 };
    });
  const byDay: Record<string, number> = {};
  for (const e of enriched) {
    const d = new Date(e.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    byDay[key] = (byDay[key] ?? 0) + e.amount;
  }
  const dailySpending = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount }));
  const recentExpenses = enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  return { period, totalSpent, expenseCount: enriched.length, topCategories, dailySpending, recentExpenses };
}

// ---------------------------------------------------------------------------
// Update & Delete
// ---------------------------------------------------------------------------
async function updateExpenseInDB(id: string, input: Partial<ExpenseInput>): Promise<Expense> {
  const db = createServiceClient();
  const updates: Partial<ExpensesRow> = {};
  if (input.amount !== undefined) updates.amount_cents = input.amount;
  if (input.category !== undefined) updates.category_id = input.category;
  if (input.description !== undefined) updates.description = input.description;

  const { data, error } = await db
    .from('expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`updateExpense: ${error.message}`);
  return rowToExpense(data as ExpensesRow);
}

async function deleteExpenseFromDB(id: string): Promise<void> {
  const db = createServiceClient();
  const { error } = await db
    .from('expenses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`deleteExpense: ${error.message}`);
}

function updateExpenseFromMock(id: string, input: Partial<ExpenseInput>): Expense | null {
  const all = mockGetAll(MOCK_USER.id);
  const existing = all.find((e) => e.id === id);
  if (!existing) return null;

  const updated: Expense = {
    ...existing,
    ...(input.amount !== undefined && { amount: input.amount }),
    ...(input.category !== undefined && { category: input.category }),
    ...(input.description !== undefined && { description: input.description }),
  };
  updateSessionExpense(id, updated);
  return updated;
}

function deleteExpenseFromMock(id: string): void {
  removeSessionExpense(id);
}

export async function updateExpense(id: string, input: Partial<ExpenseInput>): Promise<Expense> {
  if (isSupabaseEnabled()) return updateExpenseInDB(id, input);
  const result = updateExpenseFromMock(id, input);
  if (!result) throw new Error('Despesa não encontrada');
  return result;
}

export async function deleteExpense(id: string): Promise<void> {
  if (isSupabaseEnabled()) return deleteExpenseFromDB(id);
  deleteExpenseFromMock(id);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function getExpenses(filters: ExpenseFilters): Promise<Expense[]> {
  if (isSupabaseEnabled()) return getExpensesFromDB(filters);
  return getExpensesFromMock(filters);
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  if (isSupabaseEnabled()) return createExpenseInDB(input);
  const expense: Expense = {
    id: generateId(),
    userId: input.userId ?? MOCK_USER.id,
    amount: input.amount,
    category: input.category,
    description: input.description,
    source: input.source,
    tags: input.tags,
    createdAt: new Date(),
  };
  addSessionExpense(expense);
  return expense;
}

export async function getExpenseById(id: string): Promise<Expense | null> {
  if (isSupabaseEnabled()) return getExpenseByIdFromDB(id);
  return mockGetAll(MOCK_USER.id).find((e) => e.id === id) ?? null;
}

export async function getDashboardMetrics(
  userId: string,
  period: string
): Promise<DashboardMetrics> {
  if (isSupabaseEnabled()) return getDashboardMetricsFromDB(userId, period);
  return getDashboardMetricsFromMock(userId, period);
}

// ---------------------------------------------------------------------------
// Monthly totals — last N months ending at `endPeriod` (inclusive).
// Returns oldest first. Used by the Insights monthly trend chart.
// ---------------------------------------------------------------------------
export interface MonthlyTotal {
  period: string; // 'YYYY-MM'
  total: number;  // centavos
}

function shiftPeriod(period: string, monthsBack: number): string {
  const [year, month] = period.split('-').map(Number);
  const d = new Date(year, month - 1 - monthsBack, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function getMonthlyTotalsFromDB(
  userId: string,
  endPeriod: string,
  months: number,
): Promise<MonthlyTotal[]> {
  const db = createServiceClient();
  const startPeriod = shiftPeriod(endPeriod, months - 1);
  const [startY, startM] = startPeriod.split('-').map(Number);
  const [endY, endM] = endPeriod.split('-').map(Number);
  const startIso = new Date(startY, startM - 1, 1).toISOString();
  const endIso = new Date(endY, endM, 0, 23, 59, 59).toISOString();

  const { data, error } = await db
    .from('expenses')
    .select('amount_cents, occurred_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('occurred_at', startIso)
    .lte('occurred_at', endIso);

  if (error) throw new Error(`getMonthlyTotals: ${error.message}`);

  const totalsByPeriod = new Map<string, number>();
  for (let i = 0; i < months; i++) {
    totalsByPeriod.set(shiftPeriod(endPeriod, months - 1 - i), 0);
  }

  for (const row of data ?? []) {
    const d = new Date(row.occurred_at as string);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (totalsByPeriod.has(key)) {
      totalsByPeriod.set(key, (totalsByPeriod.get(key) ?? 0) + (row.amount_cents as number));
    }
  }

  return Array.from(totalsByPeriod.entries()).map(([period, total]) => ({ period, total }));
}

function getMonthlyTotalsFromMock(
  userId: string,
  endPeriod: string,
  months: number,
): MonthlyTotal[] {
  const result: MonthlyTotal[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const period = shiftPeriod(endPeriod, i);
    const metrics = getDashboardMetricsFromMock(userId, period);
    result.push({ period, total: metrics.totalSpent });
  }
  return result;
}

export async function getMonthlyTotals(
  userId: string,
  endPeriod: string,
  months: number = 6,
): Promise<MonthlyTotal[]> {
  if (isSupabaseEnabled()) return getMonthlyTotalsFromDB(userId, endPeriod, months);
  return getMonthlyTotalsFromMock(userId, endPeriod, months);
}


