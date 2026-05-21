import type { Expense, ExpenseFilters, ExpenseInput, DashboardMetrics } from '@/types';
import type { Database } from '@/types/supabase';
import { createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';

type ExpensesRow = Database['public']['Tables']['expenses']['Row'];
type ExpensesInsert = Database['public']['Tables']['expenses']['Insert'];
import {
  getAllExpenses as mockGetAll,
  addSessionExpense,
  CATEGORIES,
  getCategoryById,
  getExpensesByPeriod,
  MOCK_USER,
} from '@/data/mock';
import { generateId, getCurrentPeriod } from '@/lib/utils';

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
  const userId = filters.userId ?? MOCK_USER.id;

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
  return (data as ExpensesRow[]).map(rowToExpense);
}

async function createExpenseInDB(input: ExpenseInput): Promise<Expense> {
  const db = createServiceClient();

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
  const totalSpent = rows.reduce((sum, e) => sum + e.amount, 0);

  const byCat: Record<string, number> = {};
  for (const e of rows) {
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

  const byDay: Record<string, number> = {};
  for (const e of rows) {
    const d = new Date(e.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    byDay[key] = (byDay[key] ?? 0) + e.amount;
  }

  const dailySpending = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }));

  const recentExpenses = [...rows]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return {
    period,
    totalSpent,
    expenseCount: rows.length,
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
  return expenses;
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
  const totalSpent = allPeriod.reduce((sum, e) => sum + e.amount, 0);
  const byCat: Record<string, number> = {};
  for (const e of allPeriod) byCat[e.category] = (byCat[e.category] ?? 0) + e.amount;
  const topCategories = Object.entries(byCat)
    .sort(([, a], [, b]) => b - a)
    .map(([catId, amount]) => {
      const cat = getCategoryById(catId);
      return { categoryId: catId, categoryName: cat?.name ?? catId, categoryIcon: cat?.icon ?? '📦', categoryColor: cat?.color ?? '#6B7280', amount, percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0 };
    });
  const byDay: Record<string, number> = {};
  for (const e of allPeriod) {
    const d = new Date(e.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    byDay[key] = (byDay[key] ?? 0) + e.amount;
  }
  const dailySpending = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount }));
  const recentExpenses = allPeriod.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  return { period, totalSpent, expenseCount: allPeriod.length, topCategories, dailySpending, recentExpenses };
}

// ---------------------------------------------------------------------------
// Public API — same signatures as before
// ---------------------------------------------------------------------------
export async function getExpenses(filters: ExpenseFilters): Promise<Expense[]> {
  if (isSupabaseEnabled()) return getExpensesFromDB(filters);
  return getExpensesFromMock(filters);
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  if (isSupabaseEnabled()) return createExpenseInDB(input);
  const expense: Expense = { id: generateId(), ...input, createdAt: new Date() };
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


