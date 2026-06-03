import { unstable_cache } from 'next/cache';
import type { Category, Expense, ExpenseFilters, ExpenseInput, ExpensePaymentMethod, DashboardMetrics, SpendingTimelineBucket, SpendingTimelineData } from '@/types';
import type { Database, Json } from '@/types/supabase';
import { createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { getCategories, getCategoriesByIds } from '@/lib/categories';
import { getBudgets } from '@/lib/budgets';
import { cacheTags } from '@/lib/cache';
import { getMonthlyBudgetCents } from '@/lib/monthlyBudget';
import {
  BILLING_CYCLE_RULE_VERSION,
  getBillingCycleForPeriod,
  getBillingPeriodForDate,
} from '@/lib/billingCycle';

type ExpensesRow = Database['public']['Tables']['expenses']['Row'];
type ExpensesInsert = Database['public']['Tables']['expenses']['Insert'];
type ExpensesUpdate = Database['public']['Tables']['expenses']['Update'];
type ExpenseSeriesRow = Database['public']['Tables']['expense_series']['Row'];
type ExpenseSeriesInsert = Database['public']['Tables']['expense_series']['Insert'];
type ExpenseSeriesUpdate = Database['public']['Tables']['expense_series']['Update'];
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

const PAYMENT_METHODS = new Set<ExpensePaymentMethod>([
  'pix',
  'debit',
  'credit',
  'cash',
  'boleto',
  'transfer',
  'other',
]);

const EXPENSE_SELECT =
  'id,amount_cents,category_id,description,occurred_at,source,payment_method,metadata,tags,is_recurring,series_id,series_occurrence_index,receipt_path,receipt_file_name,receipt_mime_type,receipt_size_bytes,receipt_uploaded_at,updated_at,created_at';

function isJsonObject(value: Json | null | undefined): value is Record<string, Json> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function periodFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function periodFromIso(iso: string): string {
  return periodFromDate(new Date(iso));
}

function currentPeriod(): string {
  return periodFromDate(new Date());
}

function monthsBetweenPeriods(startPeriod: string, endPeriod: string): number {
  const [startY, startM] = startPeriod.split('-').map(Number);
  const [endY, endM] = endPeriod.split('-').map(Number);
  return (endY - startY) * 12 + (endM - startM);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function addMonthsClamped(date: Date, months: number, preferredDay = date.getDate()): Date {
  const year = date.getFullYear();
  const monthIndex = date.getMonth() + months;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonthIndex = ((monthIndex % 12) + 12) % 12;
  const day = Math.min(preferredDay, daysInMonth(targetYear, targetMonthIndex));
  return new Date(
    targetYear,
    targetMonthIndex,
    day,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

function occurrenceDate(series: ExpenseSeriesRow, occurrenceIndex: number): Date {
  return addMonthsClamped(new Date(series.start_at), occurrenceIndex - 1, series.day_of_month);
}

function seriesKindFromExpense(row: Pick<ExpensesRow, 'series_id' | 'is_recurring' | 'payment_method' | 'metadata'>): Expense['seriesKind'] {
  if (!row.series_id) return null;
  const creditDetails = normalizePaymentMethod(row.payment_method) === 'credit'
    ? readCreditDetails(row.metadata)
    : null;
  if (creditDetails?.purchaseType === 'installment') return 'installment';
  if (row.is_recurring) return 'recurring';
  return null;
}

function buildInstallmentMetadata(
  baseMetadata: Json | null | undefined,
  occurrenceIndex: number,
  totalOccurrences: number,
): Json {
  const base = isJsonObject(baseMetadata) ? baseMetadata : {};
  return {
    ...base,
    credit_purchase_type: 'installment',
    installment_current: occurrenceIndex,
    installment_total: totalOccurrences,
  };
}

function normalizePaymentMethod(value: unknown): ExpensePaymentMethod {
  return typeof value === 'string' && PAYMENT_METHODS.has(value as ExpensePaymentMethod)
    ? (value as ExpensePaymentMethod)
    : 'other';
}

function readCreditDetails(metadata: Json | null | undefined): Expense['creditDetails'] {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const purchaseType = metadata.credit_purchase_type;
  if (purchaseType === 'single') return { purchaseType: 'single' };
  if (purchaseType !== 'installment') return null;

  const installmentCurrent = Number(metadata.installment_current);
  const installmentTotal = Number(metadata.installment_total);
  if (
    !Number.isInteger(installmentCurrent) ||
    !Number.isInteger(installmentTotal) ||
    installmentCurrent < 1 ||
    installmentTotal < 2 ||
    installmentCurrent > installmentTotal
  ) {
    return null;
  }

  return {
    purchaseType: 'installment',
    installmentCurrent,
    installmentTotal,
  };
}

function buildExpenseMetadata(input: Pick<ExpenseInput, 'paymentMethod' | 'creditDetails'>): Json | undefined {
  if (input.paymentMethod !== 'credit' || !input.creditDetails) return undefined;
  if (input.creditDetails.purchaseType === 'single') {
    return { credit_purchase_type: 'single' };
  }
  return {
    credit_purchase_type: 'installment',
    installment_current: input.creditDetails.installmentCurrent ?? 1,
    installment_total: input.creditDetails.installmentTotal ?? 2,
  };
}

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

function isInstallmentInput(input: Pick<ExpenseInput, 'paymentMethod' | 'creditDetails'>): boolean {
  return input.paymentMethod === 'credit' && input.creditDetails?.purchaseType === 'installment';
}

function seriesStartForInput(input: ExpenseInput, occurredAt: string): string {
  if (!isInstallmentInput(input)) return occurredAt;
  const current = input.creditDetails?.installmentCurrent ?? 1;
  return addMonthsClamped(new Date(occurredAt), -(current - 1)).toISOString();
}

function buildSeriesInsert(input: ExpenseInput, occurredAt: string): ExpenseSeriesInsert | null {
  const installment = isInstallmentInput(input);
  const recurring = input.isRecurring === true && !installment;
  if (!installment && !recurring) return null;

  const occurredDate = new Date(occurredAt);
  return {
    user_id: input.userId!,
    kind: installment ? 'installment' : 'recurring',
    amount_cents: input.amount,
    category_id: input.category,
    description: input.description,
    payment_method: input.paymentMethod ?? 'other',
    source: input.source,
    tags: input.tags,
    metadata: buildExpenseMetadata(input) ?? {},
    start_at: seriesStartForInput(input, occurredAt),
    day_of_month: occurredDate.getDate(),
    total_occurrences: installment ? input.creditDetails?.installmentTotal ?? 2 : null,
  };
}

function buildOccurrenceInsert(
  series: ExpenseSeriesRow,
  occurrenceIndex: number,
): ExpensesInsert {
  const installmentTotal = series.kind === 'installment' ? series.total_occurrences ?? 2 : null;
  const metadata = installmentTotal
    ? buildInstallmentMetadata(series.metadata, occurrenceIndex, installmentTotal)
    : series.metadata;

  return {
    user_id: series.user_id,
    amount_cents: series.amount_cents,
    category_id: series.category_id,
    description: series.description,
    source: series.source,
    payment_method: series.payment_method,
    metadata,
    tags: series.tags,
    occurred_at: occurrenceDate(series, occurrenceIndex).toISOString(),
    is_recurring: series.kind === 'recurring',
    series_id: series.id,
    series_occurrence_index: occurrenceIndex,
  };
}

function buildExpenseUpdateFromSeries(
  series: ExpenseSeriesRow,
  occurrenceIndex: number,
): ExpensesUpdate {
  const insert = buildOccurrenceInsert(series, occurrenceIndex);
  return {
    amount_cents: insert.amount_cents,
    category_id: insert.category_id,
    description: insert.description,
    source: insert.source,
    payment_method: insert.payment_method,
    metadata: insert.metadata,
    tags: insert.tags,
    occurred_at: insert.occurred_at,
    is_recurring: insert.is_recurring,
  };
}

function periodFromExpenseFilters(filters: ExpenseFilters): string {
  const iso = filters.endDate ?? filters.startDate;
  return iso ? periodFromIso(iso) : currentPeriod();
}

async function ensureExpenseSeriesMaterialized(userId: string, throughPeriod: string): Promise<void> {
  const db = createServiceClient();
  const [throughY, throughM] = throughPeriod.split('-').map(Number);
  const throughEnd = new Date(throughY, throughM, 0, 23, 59, 59).toISOString();

  const { data, error } = await db
    .from('expense_series')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .lte('start_at', throughEnd);

  if (error) throw new Error(`ensureExpenseSeriesMaterialized: ${error.message}`);

  const inserts: ExpensesInsert[] = [];
  for (const series of (data ?? []) as ExpenseSeriesRow[]) {
    const startPeriod = periodFromIso(series.start_at);
    const months = monthsBetweenPeriods(startPeriod, throughPeriod);
    if (months < 0) continue;

    let maxOccurrence = months + 1;
    if (series.kind === 'installment') {
      maxOccurrence = Math.min(maxOccurrence, series.total_occurrences ?? 0);
    }
    if (series.ended_at) {
      const endedMonths = monthsBetweenPeriods(startPeriod, periodFromIso(series.ended_at));
      maxOccurrence = Math.min(maxOccurrence, endedMonths + 1);
    }

    for (let index = 1; index <= maxOccurrence; index += 1) {
      inserts.push(buildOccurrenceInsert(series, index));
    }
  }

  if (inserts.length === 0) return;

  const { error: insertError } = await db
    .from('expenses')
    .upsert(inserts, {
      onConflict: 'series_id,series_occurrence_index',
      ignoreDuplicates: true,
    });

  if (insertError) {
    throw new Error(`materializeExpenseSeries: ${insertError.message}`);
  }
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
    paymentMethod: normalizePaymentMethod(row.payment_method),
    creditDetails: normalizePaymentMethod(row.payment_method) === 'credit'
      ? readCreditDetails(row.metadata)
      : null,
    tags: row.tags,
    isRecurring: (row as any).is_recurring ?? false,
    seriesId: row.series_id,
    seriesKind: seriesKindFromExpense(row),
    seriesOccurrenceIndex: row.series_occurrence_index,
    seriesTotalOccurrences: readCreditDetails(row.metadata)?.installmentTotal ?? null,
    receipt: row.receipt_path
      ? {
          path: row.receipt_path,
          fileName: row.receipt_file_name ?? 'Comprovante',
          mimeType: row.receipt_mime_type ?? 'application/octet-stream',
          sizeBytes: row.receipt_size_bytes ?? 0,
          uploadedAt: new Date(row.receipt_uploaded_at ?? row.updated_at ?? row.created_at),
        }
      : null,
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
  if (!filters.onlyFuture) {
    await ensureExpenseSeriesMaterialized(
      userId,
      filters.includeFuture ? periodFromExpenseFilters(filters) : currentPeriod(),
    );
  }
  const nowIso = new Date().toISOString();

  let query = db
    .from('expenses')
    .select(EXPENSE_SELECT)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('occurred_at', { ascending: false });

  if (filters.category) query = query.eq('category_id', filters.category);
  if (filters.paymentMethod) query = query.eq('payment_method', filters.paymentMethod);
  if (filters.startDate) query = query.gte('occurred_at', filters.startDate);
  if (filters.endDate) query = query.lte('occurred_at', filters.endDate);
  if (filters.onlyFuture) {
    query = query.gt('occurred_at', nowIso);
  } else if (!filters.includeFuture) {
    query = query.lte('occurred_at', nowIso);
  }
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

  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const seriesInsert = buildSeriesInsert(input, occurredAt);
  if (seriesInsert) {
    const { data: seriesData, error: seriesError } = await db
      .from('expense_series')
      .insert(seriesInsert)
      .select()
      .single();

    if (seriesError) throw new Error(`createExpenseSeries: ${seriesError.message}`);

    const series = seriesData as ExpenseSeriesRow;
    const occurrenceIndex = series.kind === 'installment'
      ? input.creditDetails?.installmentCurrent ?? 1
      : 1;
    const insert = {
      ...buildOccurrenceInsert(series, occurrenceIndex),
      occurred_at: occurredAt,
    };

    const { data, error } = await db
      .from('expenses')
      .insert(insert)
      .select()
      .single();

    if (error) throw new Error(`createExpense: ${error.message}`);
    return rowToExpense(data as ExpensesRow);
  }

  const insert: ExpensesInsert = {
    user_id: input.userId,
    amount_cents: input.amount,
    category_id: input.category,
    description: input.description,
    source: input.source,
    payment_method: input.paymentMethod ?? 'other',
    ...(buildExpenseMetadata(input) !== undefined && { metadata: buildExpenseMetadata(input) }),
    tags: input.tags,
    occurred_at: occurredAt,
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
  await ensureExpenseSeriesMaterialized(userId, period);

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
      payment_method?: string | null;
      metadata?: Json | null;
      tags: string[];
      is_recurring: boolean;
      receipt_path?: string | null;
      receipt_file_name?: string | null;
      receipt_mime_type?: string | null;
      receipt_size_bytes?: number | null;
      receipt_uploaded_at?: string | null;
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
        paymentMethod: normalizePaymentMethod(e.payment_method),
        creditDetails: normalizePaymentMethod(e.payment_method) === 'credit'
          ? readCreditDetails(e.metadata)
          : null,
        tags: e.tags ?? [],
        isRecurring: e.is_recurring ?? false,
        seriesId: null,
        seriesKind: e.is_recurring ? 'recurring' : readCreditDetails(e.metadata)?.purchaseType === 'installment' ? 'installment' : null,
        seriesOccurrenceIndex: readCreditDetails(e.metadata)?.installmentCurrent ?? null,
        seriesTotalOccurrences: readCreditDetails(e.metadata)?.installmentTotal ?? null,
        receipt: e.receipt_path
          ? {
              path: e.receipt_path,
              fileName: e.receipt_file_name ?? 'Comprovante',
              mimeType: e.receipt_mime_type ?? 'application/octet-stream',
              sizeBytes: e.receipt_size_bytes ?? 0,
              uploadedAt: new Date(e.receipt_uploaded_at ?? e.occurred_at),
            }
          : null,
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
  closingDay: number,
): Promise<DashboardMetrics> {
  const db = createServiceClient();
  await ensureExpenseSeriesMaterialized(userId, period);
  const cycle = getBillingCycleForPeriod(period, closingDay);

  const { data, error } = await db
    .from('expenses')
    .select(EXPENSE_SELECT)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('occurred_at', cycle.start.toISOString())
    .lt('occurred_at', cycle.endExclusive.toISOString());

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
  period: string,
  closingDay: number,
): Promise<DashboardMetrics> {
  return getDashboardMetricsFromDBViaQuery(userId, period, closingDay);
}

// ---------------------------------------------------------------------------
// Mock fallback implementations (unchanged from before)
// ---------------------------------------------------------------------------
function getExpensesFromMock(filters: ExpenseFilters): Expense[] {
  const userId = filters.userId ?? MOCK_USER.id;
  let expenses = mockGetAll(userId);
  if (filters.category) expenses = expenses.filter((e) => e.category === filters.category);
  if (filters.paymentMethod) expenses = expenses.filter((e) => e.paymentMethod === filters.paymentMethod);
  if (filters.startDate) {
    const start = new Date(filters.startDate);
    expenses = expenses.filter((e) => new Date(e.createdAt) >= start);
  }
  if (filters.endDate) {
    const end = new Date(filters.endDate);
    expenses = expenses.filter((e) => new Date(e.createdAt) <= end);
  }
  const now = new Date();
  if (filters.onlyFuture) {
    expenses = expenses.filter((e) => new Date(e.createdAt) > now);
  } else if (!filters.includeFuture) {
    expenses = expenses.filter((e) => new Date(e.createdAt) <= now);
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

function getDashboardMetricsFromMock(userId: string, period: string, closingDay: number): DashboardMetrics {
  const cycle = getBillingCycleForPeriod(period, closingDay);
  const expenses = getExpensesByPeriod(userId, period).filter((e) => {
    const d = new Date(e.createdAt);
    return d >= cycle.start && d < cycle.endExclusive;
  });
  const sessionAll = mockGetAll(userId);
  const periodExpenses = sessionAll.filter((e) => {
    const d = new Date(e.createdAt);
    return d >= cycle.start && d < cycle.endExclusive;
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
function buildDirectExpenseUpdates(input: Partial<ExpenseInput>): ExpensesUpdate {
  const updates: ExpensesUpdate = {};
  if (input.amount !== undefined) updates.amount_cents = input.amount;
  if (input.category !== undefined) updates.category_id = input.category;
  if (input.description !== undefined) updates.description = input.description;
  if (input.occurredAt !== undefined) updates.occurred_at = input.occurredAt;
  if (input.isRecurring !== undefined) updates.is_recurring = input.isRecurring;
  if (input.paymentMethod !== undefined) updates.payment_method = input.paymentMethod;
  if (input.creditDetails !== undefined) {
    updates.metadata = input.paymentMethod === 'credit' && input.creditDetails
      ? buildExpenseMetadata(input as Pick<ExpenseInput, 'paymentMethod' | 'creditDetails'>) ?? {}
      : {};
  }
  return updates;
}

async function convertExistingExpenseToSeries(
  existing: ExpensesRow,
  input: Partial<ExpenseInput>,
): Promise<Expense | null> {
  const db = createServiceClient();
  const next: ExpenseInput = {
    userId: existing.user_id,
    amount: input.amount ?? existing.amount_cents,
    category: input.category ?? existing.category_id,
    description: input.description ?? existing.description,
    source: input.source ?? (existing.source as Expense['source']),
    paymentMethod: input.paymentMethod ?? normalizePaymentMethod(existing.payment_method),
    creditDetails: input.creditDetails !== undefined
      ? input.creditDetails
      : normalizePaymentMethod(existing.payment_method) === 'credit'
        ? readCreditDetails(existing.metadata)
        : null,
    tags: input.tags ?? existing.tags,
    occurredAt: input.occurredAt ?? existing.occurred_at,
    isRecurring: input.isRecurring ?? existing.is_recurring,
  };
  const seriesInsert = buildSeriesInsert(next, next.occurredAt ?? existing.occurred_at);
  if (!seriesInsert) return null;

  const { data: seriesData, error: seriesError } = await db
    .from('expense_series')
    .insert(seriesInsert)
    .select()
    .single();

  if (seriesError) throw new Error(`createExpenseSeries: ${seriesError.message}`);

  const series = seriesData as ExpenseSeriesRow;
  const occurrenceIndex = series.kind === 'installment'
    ? next.creditDetails?.installmentCurrent ?? 1
    : 1;
  const occurrenceUpdates = {
    ...buildExpenseUpdateFromSeries(series, occurrenceIndex),
    occurred_at: next.occurredAt ?? existing.occurred_at,
    series_id: series.id,
    series_occurrence_index: occurrenceIndex,
  };

  const { data, error } = await db
    .from('expenses')
    .update(occurrenceUpdates)
    .eq('id', existing.id)
    .select()
    .single();

  if (error) throw new Error(`updateExpense: ${error.message}`);
  return rowToExpense(data as ExpensesRow);
}

async function updateExpenseSeriesFromOccurrence(
  existing: ExpensesRow,
  input: Partial<ExpenseInput>,
): Promise<Expense> {
  const db = createServiceClient();
  const occurrenceIndex = existing.series_occurrence_index ?? 1;
  const seriesId = existing.series_id;
  if (!seriesId) throw new Error('Série não encontrada para o gasto.');

  const { data: seriesData, error: seriesError } = await db
    .from('expense_series')
    .select('*')
    .eq('id', seriesId)
    .single();

  if (seriesError || !seriesData) {
    throw new Error(`getExpenseSeries: ${seriesError?.message ?? 'Série não encontrada'}`);
  }

  const series = seriesData as ExpenseSeriesRow;
  const occurrenceDateForEdit = input.occurredAt
    ? new Date(input.occurredAt)
    : occurrenceDate(series, occurrenceIndex);

  if (series.kind === 'recurring' && input.isRecurring === false) {
    const nowIso = new Date().toISOString();
    const currentUpdates = {
      ...buildDirectExpenseUpdates(input),
      is_recurring: false,
      series_id: null,
      series_occurrence_index: null,
    };

    await db
      .from('expense_series')
      .update({ status: 'ended', ended_at: occurrenceDateForEdit.toISOString() })
      .eq('id', series.id);

    await db
      .from('expenses')
      .update({ deleted_at: nowIso })
      .eq('series_id', series.id)
      .gte('series_occurrence_index', occurrenceIndex + 1)
      .is('deleted_at', null);

    const { data, error } = await db
      .from('expenses')
      .update(currentUpdates)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw new Error(`updateExpense: ${error.message}`);
    return rowToExpense(data as ExpensesRow);
  }

  const seriesUpdates: ExpenseSeriesUpdate = {};
  if (input.amount !== undefined) seriesUpdates.amount_cents = input.amount;
  if (input.category !== undefined) seriesUpdates.category_id = input.category;
  if (input.description !== undefined) seriesUpdates.description = input.description;
  if (input.paymentMethod !== undefined) seriesUpdates.payment_method = input.paymentMethod;
  if (input.source !== undefined) seriesUpdates.source = input.source;
  if (input.tags !== undefined) seriesUpdates.tags = input.tags;
  if (input.creditDetails !== undefined) {
    seriesUpdates.metadata = input.paymentMethod === 'credit' && input.creditDetails
      ? buildExpenseMetadata(input as Pick<ExpenseInput, 'paymentMethod' | 'creditDetails'>) ?? {}
      : {};
    if (series.kind === 'installment' && input.creditDetails?.purchaseType === 'installment') {
      seriesUpdates.total_occurrences = input.creditDetails.installmentTotal ?? series.total_occurrences;
    }
  }
  if (input.occurredAt !== undefined) {
    seriesUpdates.start_at = addMonthsClamped(occurrenceDateForEdit, -(occurrenceIndex - 1)).toISOString();
    seriesUpdates.day_of_month = occurrenceDateForEdit.getDate();
  }

  let nextSeries: ExpenseSeriesRow = { ...series, ...seriesUpdates } as ExpenseSeriesRow;
  if (Object.keys(seriesUpdates).length > 0) {
    const { data: updatedSeries, error: updateSeriesError } = await db
      .from('expense_series')
      .update(seriesUpdates)
      .eq('id', series.id)
      .select()
      .single();

    if (updateSeriesError) throw new Error(`updateExpenseSeries: ${updateSeriesError.message}`);
    nextSeries = updatedSeries as ExpenseSeriesRow;
  }

  const { data: futureRows, error: futureError } = await db
    .from('expenses')
    .select('id,series_occurrence_index')
    .eq('series_id', series.id)
    .gte('series_occurrence_index', occurrenceIndex)
    .is('deleted_at', null);

  if (futureError) throw new Error(`updateExpenseSeriesOccurrences: ${futureError.message}`);

  await Promise.all((futureRows ?? []).map((row) => {
    const index = row.series_occurrence_index ?? occurrenceIndex;
    return db
      .from('expenses')
      .update(buildExpenseUpdateFromSeries(nextSeries, index))
      .eq('id', row.id);
  }));

  const { data, error } = await db
    .from('expenses')
    .select('*')
    .eq('id', existing.id)
    .single();

  if (error) throw new Error(`updateExpense: ${error.message}`);
  return rowToExpense(data as ExpensesRow);
}

async function updateExpenseInDB(id: string, input: Partial<ExpenseInput>): Promise<Expense> {
  const db = createServiceClient();
  const { data: existingData, error: existingError } = await db
    .from('expenses')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (existingError) throw new Error(`getExpense: ${existingError.message}`);
  const existing = existingData as ExpensesRow;

  if (existing.series_id) {
    return updateExpenseSeriesFromOccurrence(existing, input);
  }

  if (input.isRecurring === true || isInstallmentInput(input as ExpenseInput)) {
    const converted = await convertExistingExpenseToSeries(existing, input);
    if (converted) return converted;
  }

  const { data, error } = await db
    .from('expenses')
    .update(buildDirectExpenseUpdates(input))
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`updateExpense: ${error.message}`);
  return rowToExpense(data as ExpensesRow);
}

async function deleteExpenseFromDB(id: string): Promise<void> {
  const db = createServiceClient();
  const { data: existing } = await db
    .from('expenses')
    .select('id,receipt_path,series_id,series_occurrence_index,occurred_at')
    .eq('id', id)
    .single();

  if (existing?.series_id) {
    const occurrenceIndex = existing.series_occurrence_index ?? 1;
    const nowIso = new Date().toISOString();

    const { data: futureRows } = await db
      .from('expenses')
      .select('receipt_path')
      .eq('series_id', existing.series_id)
      .gte('series_occurrence_index', occurrenceIndex)
      .is('deleted_at', null);

    await db
      .from('expense_series')
      .update({
        status: 'ended',
        ended_at: new Date(new Date(existing.occurred_at).getTime() - 1).toISOString(),
      })
      .eq('id', existing.series_id);

    const { error: seriesDeleteError } = await db
      .from('expenses')
      .update({ deleted_at: nowIso })
      .eq('series_id', existing.series_id)
      .gte('series_occurrence_index', occurrenceIndex)
      .is('deleted_at', null);

    if (seriesDeleteError) throw new Error(`deleteExpense: ${seriesDeleteError.message}`);

    const receiptPaths = (futureRows ?? [])
      .map((row) => row.receipt_path)
      .filter((path): path is string => Boolean(path));
    if (receiptPaths.length > 0) {
      await db.storage.from('expense_receipts').remove(receiptPaths);
    }
    return;
  }

  const { error } = await db
    .from('expenses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`deleteExpense: ${error.message}`);
  if (existing?.receipt_path) {
    await db.storage.from('expense_receipts').remove([existing.receipt_path]);
  }
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
    ...(input.paymentMethod !== undefined && { paymentMethod: input.paymentMethod }),
    ...(input.creditDetails !== undefined && { creditDetails: input.creditDetails }),
    ...(input.isRecurring !== undefined && { isRecurring: input.isRecurring }),
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
    paymentMethod: input.paymentMethod ?? 'other',
    creditDetails: input.paymentMethod === 'credit' ? input.creditDetails ?? null : null,
    tags: input.tags,
    isRecurring: input.isRecurring ?? false,
    seriesId: input.isRecurring || isInstallmentInput(input) ? generateId() : null,
    seriesKind: isInstallmentInput(input) ? 'installment' : input.isRecurring ? 'recurring' : null,
    seriesOccurrenceIndex: isInstallmentInput(input) ? input.creditDetails?.installmentCurrent ?? 1 : input.isRecurring ? 1 : null,
    seriesTotalOccurrences: isInstallmentInput(input) ? input.creditDetails?.installmentTotal ?? null : null,
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
  closingDay: number = 10,
): Promise<DashboardMetrics> {
  if (isSupabaseEnabled()) return getDashboardMetricsFromDB(userId, period, closingDay);
  return getDashboardMetricsFromMock(userId, period, closingDay);
}

function rehydrateExpense(raw: Expense): Expense {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    receipt: raw.receipt
      ? { ...raw.receipt, uploadedAt: new Date(raw.receipt.uploadedAt) }
      : null,
  };
}

export async function getDashboardMetrics(
  userId: string,
  period: string,
  closingDay: number = 10,
): Promise<DashboardMetrics> {
  const raw = await unstable_cache(
    () => getDashboardMetricsImpl(userId, period, closingDay),
    ['dashboard-metrics', BILLING_CYCLE_RULE_VERSION, userId, period, String(closingDay)],
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
  closingDay: number,
): Promise<MonthlyTotal[]> {
  const db = createServiceClient();
  await ensureExpenseSeriesMaterialized(userId, endPeriod);
  const startPeriod = shiftPeriod(endPeriod, months - 1);
  const startCycle = getBillingCycleForPeriod(startPeriod, closingDay);
  const endCycle = getBillingCycleForPeriod(endPeriod, closingDay);

  const { data, error } = await db
    .from('expenses')
    .select('amount_cents, occurred_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('occurred_at', startCycle.start.toISOString())
    .lt('occurred_at', endCycle.endExclusive.toISOString());

  if (error) throw new Error(`getMonthlyTotals: ${error.message}`);

  const totalsByPeriod = new Map<string, number>();
  for (let i = 0; i < months; i++) {
    totalsByPeriod.set(shiftPeriod(endPeriod, months - 1 - i), 0);
  }

  for (const row of data ?? []) {
    const d = new Date(row.occurred_at as string);
    const key = getBillingPeriodForDate(d, closingDay);
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
  closingDay: number,
): MonthlyTotal[] {
  const result: MonthlyTotal[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const period = shiftPeriod(endPeriod, i);
    const metrics = getDashboardMetricsFromMock(userId, period, closingDay);
    result.push({ period, total: metrics.totalSpent });
  }
  return result;
}

async function getMonthlyTotalsImpl(
  userId: string,
  endPeriod: string,
  months: number,
  closingDay: number = 10,
): Promise<MonthlyTotal[]> {
  if (isSupabaseEnabled()) return getMonthlyTotalsFromDB(userId, endPeriod, months, closingDay);
  return getMonthlyTotalsFromMock(userId, endPeriod, months, closingDay);
}

export async function getMonthlyTotals(
  userId: string,
  endPeriod: string,
  months: number = 6,
  closingDay: number = 10,
): Promise<MonthlyTotal[]> {
  return unstable_cache(
    () => getMonthlyTotalsImpl(userId, endPeriod, months, closingDay),
    ['monthly-totals', BILLING_CYCLE_RULE_VERSION, userId, endPeriod, String(months), String(closingDay)],
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

function buildCycleDayBuckets(period: string, closingDay: number): SpendingTimelineBucket[] {
  const cycle = getBillingCycleForPeriod(period, closingDay);
  const buckets: SpendingTimelineBucket[] = [];
  const cursor = new Date(cycle.start);
  while (cursor < cycle.endExclusive) {
    buckets.push({
      key: localDateKey(cursor),
      label: String(cursor.getDate()),
      amount: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return buckets;
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
  closingDay: number,
): Promise<SpendingTimelineData> {
  const db = createServiceClient();
  const [year, month] = period.split('-').map(Number);
  await ensureExpenseSeriesMaterialized(userId, `${year}-12`);
  const yearStart = getBillingCycleForPeriod(`${year}-01`, closingDay).start;
  const yearEndExclusive = getBillingCycleForPeriod(`${year}-12`, closingDay).endExclusive;

  const { data, error } = await db
    .from('expenses')
    .select('amount_cents, occurred_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('occurred_at', yearStart.toISOString())
    .lt('occurred_at', yearEndExclusive.toISOString());

  if (error) throw new Error(`getSpendingTimeline: ${error.message}`);

  const yearBuckets: SpendingTimelineBucket[] = Array.from({ length: 12 }, (_, i) => ({
    key: periodFromParts(year, i + 1),
    label: shortMonthLabel(year, i + 1),
    amount: 0,
  }));
  const monthBuckets = buildCycleDayBuckets(period, closingDay);
  const monthBucketMap = new Map(monthBuckets.map((bucket) => [bucket.key, bucket]));
  const hourlyByDate: Record<string, SpendingTimelineBucket[]> = {};
  for (const bucket of monthBuckets) hourlyByDate[bucket.key] = buildHourlyBuckets();

  for (const row of data ?? []) {
    const d = new Date(row.occurred_at as string);
    const amount = row.amount_cents as number;
    const bucketPeriod = getBillingPeriodForDate(d, closingDay);
    const bucketIndex = yearBuckets.findIndex((bucket) => bucket.key === bucketPeriod);
    if (bucketIndex === -1) continue;

    yearBuckets[bucketIndex].amount += amount;

    if (bucketPeriod === period) {
      const dateKey = localDateKey(d);
      const dayBucket = monthBucketMap.get(dateKey);
      if (dayBucket) dayBucket.amount += amount;
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
    selectedDay: localDateKey(getBillingCycleForPeriod(period, closingDay).start),
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
  closingDay: number,
): SpendingTimelineData {
  const [year, month] = period.split('-').map(Number);
  const yearBuckets: SpendingTimelineBucket[] = Array.from({ length: 12 }, (_, i) => {
    const bucketPeriod = periodFromParts(year, i + 1);
    const metrics = getDashboardMetricsFromMock(userId, bucketPeriod, closingDay);
    return { key: bucketPeriod, label: shortMonthLabel(year, i + 1), amount: metrics.totalSpent };
  });
  const currentMetrics = getDashboardMetricsFromMock(userId, period, closingDay);
  const monthBuckets = buildCycleDayBuckets(period, closingDay);
  const monthBucketMap = new Map(monthBuckets.map((bucket) => [bucket.key, bucket]));
  for (const day of currentMetrics.dailySpending) {
    const bucket = monthBucketMap.get(day.date);
    if (bucket) bucket.amount = day.amount;
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
    selectedDay: localDateKey(getBillingCycleForPeriod(period, closingDay).start),
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
  closingDay: number = 10,
): Promise<SpendingTimelineData> {
  if (isSupabaseEnabled()) return getSpendingTimelineFromDB(userId, period, closingDay);
  return getSpendingTimelineFromMock(userId, period, closingDay);
}

export async function getSpendingTimeline(
  userId: string,
  period: string,
  closingDay: number = 10,
): Promise<SpendingTimelineData> {
  return unstable_cache(
    () => getSpendingTimelineImpl(userId, period, closingDay),
    ['spending-timeline', BILLING_CYCLE_RULE_VERSION, userId, period, String(closingDay)],
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
