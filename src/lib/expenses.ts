import { unstable_cache } from 'next/cache';
import type { Category, Expense, ExpenseFilters, ExpenseInput, DashboardMetrics, SpendingTimelineBucket, SpendingTimelineData } from '@/types';
import type { Database } from '@/types/supabase';
import { createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { getCategories, getCategoriesByIds } from '@/lib/categories';
import { getBudgets } from '@/lib/budgets';
import { cacheTags } from '@/lib/cache';
import { getMonthlyBudgetCents } from '@/lib/monthlyBudget';

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
    isRecurring: (row as any).is_recurring ?? false,
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
    .select('id,amount_cents,category_id,description,occurred_at,source,tags,is_recurring')
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
    occurred_at: input.occurredAt ?? new Date().toISOString(),
    ...(input.isRecurring !== undefined && { is_recurring: input.isRecurring }),
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

async function getDashboardMetricsFromDBViaRPC(
  userId: string,
  period: string,
): Promise<DashboardMetrics | null> {
  const db = createServiceClient();

  const { data: raw, error } = await (db as any).rpc('get_dashboard_page', {
    p_user_id: userId,
    p_period: period,
  });

  if (error) {
    return null;
  }

  const result = raw as {
    total_spent: number;
    expense_count: number;
    top_categories: Array<{ category_id: string; amount: number }>;
    daily_spending: Array<{ date: string; amount: number }>;
    all_expenses: Array<{
      id: string;
      amount: number;
      category: string;
      description: string;
      occurred_at: string;
      source: string;
      tags: string[];
      is_recurring: boolean;
    }>;
  };

  const allCategories = await getCategories(userId);
  const categories = new Map(allCategories.map((c) => [c.id, c]));

  const allExpenses: Expense[] = result.all_expenses.map((e) =>
    attachCategoryData(
      {
        id: e.id,
        userId,
        amount: e.amount,
        category: e.category,
        description: e.description,
        source: e.source as Expense['source'],
        tags: e.tags ?? [],
        isRecurring: e.is_recurring ?? false,
        createdAt: new Date(e.occurred_at),
      },
      categories,
    ),
  );

  const totalSpent = result.total_spent;

  const topCategories = result.top_categories.map((tc) => {
    const cat = categories.get(tc.category_id);
    return {
      categoryId: tc.category_id,
      categoryName: cat?.name ?? FALLBACK_CATEGORY.name,
      categoryIcon: cat?.icon ?? FALLBACK_CATEGORY.icon,
      categoryColor: cat?.color ?? FALLBACK_CATEGORY.color,
      amount: tc.amount,
      percentage: totalSpent > 0 ? Math.round((tc.amount / totalSpent) * 100) : 0,
    };
  });

  const recentExpenses = allExpenses.slice(0, 5);

  const expensesByCategory: Record<string, Expense[]> = {};
  for (const e of allExpenses) {
    (expensesByCategory[e.category] ??= []).push(e);
  }

  return {
    period,
    totalSpent,
    expenseCount: result.expense_count,
    topCategories,
    dailySpending: result.daily_spending,
    recentExpenses,
    expensesByCategory,
  };
}

async function getDashboardMetricsFromDBViaQuery(
  userId: string,
  period: string,
): Promise<DashboardMetrics> {
  const db = createServiceClient();
  const [year, month] = period.split('-').map(Number);
  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 0, 23, 59, 59).toISOString();

  const { data, error } = await db
    .from('expenses')
    .select('id,amount_cents,category_id,description,occurred_at,source,tags,is_recurring')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('occurred_at', start)
    .lte('occurred_at', end);

  if (error) throw new Error(`getDashboardMetrics: ${error.message}`);

  const rows = (data as ExpensesRow[]).map(rowToExpense);
  const allCategories = await getCategories(userId);
  const categories = new Map(allCategories.map((c) => [c.id, c]));
  const enriched = rows.map((e) => attachCategoryData(e, categories));
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

  const recentExpenses = enriched
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const expensesByCategory: Record<string, Expense[]> = {};
  for (const e of enriched) {
    (expensesByCategory[e.category] ??= []).push(e);
  }
  for (const list of Object.values(expensesByCategory)) {
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return {
    period,
    totalSpent,
    expenseCount: enriched.length,
    topCategories,
    dailySpending,
    recentExpenses,
    expensesByCategory,
  };
}

async function getDashboardMetricsFromDB(
  userId: string,
  period: string
): Promise<DashboardMetrics> {
  const viaRpc = await getDashboardMetricsFromDBViaRPC(userId, period);
  if (viaRpc) return viaRpc;
  return getDashboardMetricsFromDBViaQuery(userId, period);
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
  const expensesByCategory: Record<string, Expense[]> = {};
  for (const e of enriched) (expensesByCategory[e.category] ??= []).push(e);
  for (const list of Object.values(expensesByCategory)) {
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return { period, totalSpent, expenseCount: enriched.length, topCategories, dailySpending, recentExpenses, expensesByCategory };
}

// ---------------------------------------------------------------------------
// Update & Delete
// ---------------------------------------------------------------------------
async function updateExpenseInDB(id: string, input: Partial<ExpenseInput>): Promise<Expense> {
  const db = createServiceClient();
  const updates: Partial<ExpensesRow> & { is_recurring?: boolean } = {};
  if (input.amount !== undefined) updates.amount_cents = input.amount;
  if (input.category !== undefined) updates.category_id = input.category;
  if (input.description !== undefined) updates.description = input.description;
  if (input.occurredAt !== undefined) updates.occurred_at = input.occurredAt;
  if (input.isRecurring !== undefined) updates.is_recurring = input.isRecurring;

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
    ...(input.occurredAt !== undefined && { createdAt: new Date(input.occurredAt) }),
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
    isRecurring: input.isRecurring ?? false,
    createdAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
  };
  addSessionExpense(expense);
  return expense;
}

export async function getExpenseById(id: string): Promise<Expense | null> {
  if (isSupabaseEnabled()) return getExpenseByIdFromDB(id);
  return mockGetAll(MOCK_USER.id).find((e) => e.id === id) ?? null;
}

async function getDashboardMetricsImpl(
  userId: string,
  period: string,
): Promise<DashboardMetrics> {
  if (isSupabaseEnabled()) return getDashboardMetricsFromDB(userId, period);
  return getDashboardMetricsFromMock(userId, period);
}

function rehydrateExpense(raw: Expense): Expense {
  return { ...raw, createdAt: new Date(raw.createdAt) };
}

export async function getDashboardMetrics(
  userId: string,
  period: string,
): Promise<DashboardMetrics> {
  const raw = await unstable_cache(
    () => getDashboardMetricsImpl(userId, period),
    ['dashboard-metrics', userId, period],
    {
      tags: [cacheTags.metrics(userId), cacheTags.expenses(userId)],
      revalidate: 300,
    },
  )();
  // unstable_cache serializa Date → string. Re-hidrata as expenses aqui.
  const expensesByCategory: Record<string, Expense[]> = {};
  for (const [key, list] of Object.entries(raw.expensesByCategory)) {
    expensesByCategory[key] = list.map(rehydrateExpense);
  }
  return {
    ...raw,
    recentExpenses: raw.recentExpenses.map(rehydrateExpense),
    expensesByCategory,
  };
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

async function getMonthlyTotalsImpl(
  userId: string,
  endPeriod: string,
  months: number,
): Promise<MonthlyTotal[]> {
  if (isSupabaseEnabled()) return getMonthlyTotalsFromDB(userId, endPeriod, months);
  return getMonthlyTotalsFromMock(userId, endPeriod, months);
}

export async function getMonthlyTotals(
  userId: string,
  endPeriod: string,
  months: number = 6,
): Promise<MonthlyTotal[]> {
  return unstable_cache(
    () => getMonthlyTotalsImpl(userId, endPeriod, months),
    ['monthly-totals', userId, endPeriod, String(months)],
    {
      // Meses fechados quase nunca mudam. TTL maior; invalidação explícita
      // ocorre via revalidateTag nas mutations de expense.
      tags: [cacheTags.monthlyTotals(userId), cacheTags.expenses(userId)],
      revalidate: 300,
    },
  )();
}

function periodFromParts(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function shortMonthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'short' })
    .replace('.', '');
}

async function getPlannedMonthlyBudget(userId: string, period: string): Promise<number> {
  const monthlyBudget = await getMonthlyBudgetCents(userId, period);
  if (monthlyBudget > 0) return monthlyBudget;
  const budgets = await getBudgets(userId, period);
  return budgets.reduce((sum, budget) => sum + budget.amountCents, 0);
}

function buildMonthBuckets(year: number, month: number): SpendingTimelineBucket[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { key, label: String(day), amount: 0 };
  });
}

function buildHourlyBuckets(): SpendingTimelineBucket[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    key: String(hour).padStart(2, '0'),
    label: `${String(hour).padStart(2, '0')}h`,
    amount: 0,
  }));
}

async function getSpendingTimelineFromDB(
  userId: string,
  period: string,
): Promise<SpendingTimelineData> {
  const db = createServiceClient();
  const [year, month] = period.split('-').map(Number);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const { data, error } = await db
    .from('expenses')
    .select('amount_cents, occurred_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('occurred_at', yearStart.toISOString())
    .lt('occurred_at', yearEnd.toISOString());

  if (error) throw new Error(`getSpendingTimeline: ${error.message}`);

  const yearBuckets: SpendingTimelineBucket[] = Array.from({ length: 12 }, (_, i) => ({
    key: periodFromParts(year, i + 1),
    label: shortMonthLabel(year, i + 1),
    amount: 0,
  }));
  const monthBuckets = buildMonthBuckets(year, month);
  const hourlyByDate: Record<string, SpendingTimelineBucket[]> = {};
  for (const bucket of monthBuckets) hourlyByDate[bucket.key] = buildHourlyBuckets();

  for (const row of data ?? []) {
    const d = new Date(row.occurred_at as string);
    const amount = row.amount_cents as number;
    if (d.getFullYear() !== year) continue;

    yearBuckets[d.getMonth()].amount += amount;

    if (d.getMonth() + 1 === month) {
      const dateKey = localDateKey(d);
      const dayIndex = d.getDate() - 1;
      if (monthBuckets[dayIndex]) monthBuckets[dayIndex].amount += amount;
      const hourBucket = hourlyByDate[dateKey]?.[d.getHours()];
      if (hourBucket) hourBucket.amount += amount;
    }
  }

  const plannedByMonth = await Promise.all(
    yearBuckets.map((bucket) => getPlannedMonthlyBudget(userId, bucket.key)),
  );
  plannedByMonth.forEach((planned, index) => {
    yearBuckets[index].planned = planned;
  });
  const monthlyPlanned = plannedByMonth[month - 1] ?? 0;
  const annualPlanned = plannedByMonth.reduce((sum, value) => sum + value, 0);

  return {
    period,
    selectedDay: `${period}-01`,
    monthlyPlanned,
    annualPlanned,
    year: yearBuckets,
    month: monthBuckets,
    hourlyByDate,
  };
}

function getSpendingTimelineFromMock(
  userId: string,
  period: string,
): SpendingTimelineData {
  const [year, month] = period.split('-').map(Number);
  const yearBuckets: SpendingTimelineBucket[] = Array.from({ length: 12 }, (_, i) => {
    const bucketPeriod = periodFromParts(year, i + 1);
    const metrics = getDashboardMetricsFromMock(userId, bucketPeriod);
    return { key: bucketPeriod, label: shortMonthLabel(year, i + 1), amount: metrics.totalSpent };
  });
  const currentMetrics = getDashboardMetricsFromMock(userId, period);
  const monthBuckets = buildMonthBuckets(year, month);
  for (const day of currentMetrics.dailySpending) {
    const [, , dayStr] = day.date.split('-');
    const index = Number(dayStr) - 1;
    if (monthBuckets[index]) monthBuckets[index].amount = day.amount;
  }

  const hourlyByDate: Record<string, SpendingTimelineBucket[]> = {};
  for (const bucket of monthBuckets) hourlyByDate[bucket.key] = buildHourlyBuckets();
  for (const expense of Object.values(currentMetrics.expensesByCategory).flat()) {
    const d = new Date(expense.createdAt);
    const dateKey = localDateKey(d);
    if (hourlyByDate[dateKey]) hourlyByDate[dateKey][d.getHours()].amount += expense.amount;
  }

  return {
    period,
    selectedDay: `${period}-01`,
    monthlyPlanned: 0,
    annualPlanned: 0,
    year: yearBuckets,
    month: monthBuckets,
    hourlyByDate,
  };
}

async function getSpendingTimelineImpl(
  userId: string,
  period: string,
): Promise<SpendingTimelineData> {
  if (isSupabaseEnabled()) return getSpendingTimelineFromDB(userId, period);
  return getSpendingTimelineFromMock(userId, period);
}

export async function getSpendingTimeline(
  userId: string,
  period: string,
): Promise<SpendingTimelineData> {
  return unstable_cache(
    () => getSpendingTimelineImpl(userId, period),
    ['spending-timeline', userId, period],
    {
      tags: [
        cacheTags.expenses(userId),
        cacheTags.budgets(userId),
        cacheTags.profile(userId),
      ],
      revalidate: 300,
    },
  )();
}
