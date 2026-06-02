import { unstable_cache } from 'next/cache';
import type { Category } from '@/types';
import type { Database } from '@/types/supabase';
import { createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { CATEGORIES, addUserCategory, updateUserCategory, deleteUserCategory, getUserCategories } from '@/data/mock';
import { cacheTags } from '@/lib/cache';

type CategoryRow = Database['public']['Tables']['categories']['Row'];
type CategoryInsert = Database['public']['Tables']['categories']['Insert'];

function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    keywords: row.keywords,
  };
}

export interface CategoryWithMeta extends Category {
  is_default: boolean;
  sort_order: number;
}

async function getCategoriesFromDB(
  userId: string,
  _opts: { applyHasPetGate: boolean },
): Promise<CategoryWithMeta[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from('categories')
    .select('*')
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw new Error(`getCategories: ${error.message}`);

  return (data as CategoryRow[])
    .map((row) => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      color: row.color,
      keywords: row.keywords,
      is_default: row.is_default,
      sort_order: row.sort_order,
    }));
}

function getCategoriesFromMock(): CategoryWithMeta[] {
  const defaults = CATEGORIES.map((c, i) => ({
    ...c,
    is_default: true,
    sort_order: (i + 1) * 10,
  }));
  const userCats = getUserCategories().map((c, i) => ({
    ...c,
    is_default: false,
    sort_order: 100 + (i + 1) * 10,
  }));
  return [...defaults, ...userCats];
}

export interface GetCategoriesOptions {
  /** Compatibilidade: Pet agora aparece sempre para todos os usuários. */
  applyHasPetGate?: boolean;
}

async function getCategoriesImpl(
  userId: string,
  applyHasPetGate: boolean,
): Promise<CategoryWithMeta[]> {
  if (isSupabaseEnabled()) return getCategoriesFromDB(userId, { applyHasPetGate });
  return getCategoriesFromMock();
}

export async function getCategories(
  userId: string,
  options: GetCategoriesOptions = {},
): Promise<CategoryWithMeta[]> {
  const applyHasPetGate = options.applyHasPetGate ?? true;
  return unstable_cache(
    () => getCategoriesImpl(userId, applyHasPetGate),
    ['categories', userId, 'all'],
    {
      // Categorias mudam raríssimo → TTL longo, invalidação explícita via
      // revalidateTag em criar/editar/deletar categoria.
      tags: [cacheTags.categories(userId)],
      revalidate: 3600,
    },
  )();
}

export async function createCategory(
  userId: string,
  input: { id: string; name: string; icon: string; color: string; keywords: string[] }
): Promise<Category> {
  if (isSupabaseEnabled()) {
    const db = createServiceClient();
    const insert: CategoryInsert = {
      id: input.id,
      user_id: userId,
      name: input.name,
      icon: input.icon,
      color: input.color,
      keywords: input.keywords,
      is_default: false,
      sort_order: 100,
    };
    const { data, error } = await db.from('categories').insert(insert).select().single();
    if (error) throw new Error(`createCategory: ${error.message}`);
    return rowToCategory(data as CategoryRow);
  }

  const cat: Category = { id: input.id, name: input.name, icon: input.icon, color: input.color, keywords: input.keywords };
  addUserCategory(cat);
  return cat;
}

export async function updateCategory(
  userId: string,
  id: string,
  input: { name?: string; icon?: string; color?: string; keywords?: string[] }
): Promise<Category> {
  if (isSupabaseEnabled()) {
    const db = createServiceClient();
    const { data, error } = await db
      .from('categories')
      .update(input)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw new Error(`updateCategory: ${error.message}`);
    return rowToCategory(data as CategoryRow);
  }

  const cat: Category = { id, name: input.name ?? '', icon: input.icon ?? '', color: input.color ?? '', keywords: input.keywords ?? [] };
  updateUserCategory(cat);
  return cat;
}

export async function deleteCategory(userId: string, id: string): Promise<void> {
  if (isSupabaseEnabled()) {
    const db = createServiceClient();
    const { error } = await db.from('categories').delete().eq('id', id).eq('user_id', userId);
    if (error) throw new Error(`deleteCategory: ${error.message}`);
    return;
  }

  deleteUserCategory(id);
}

export async function getCategoriesByIds(
  userId: string,
  ids: string[],
): Promise<Map<string, Category>> {
  const map = new Map<string, Category>();
  if (ids.length === 0) return map;
  const unique = Array.from(new Set(ids));

  if (isSupabaseEnabled()) {
    const db = createServiceClient();
    const { data, error } = await db
      .from('categories')
      .select('*')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .in('id', unique);
    if (error) throw new Error(`getCategoriesByIds: ${error.message}`);
    for (const row of data as CategoryRow[]) map.set(row.id, rowToCategory(row));
    return map;
  }

  for (const c of CATEGORIES) if (unique.includes(c.id)) map.set(c.id, c);
  for (const c of getUserCategories()) if (unique.includes(c.id)) map.set(c.id, c);
  return map;
}

export async function getCategoryExpenseCount(userId: string, categoryId: string): Promise<number> {
  if (isSupabaseEnabled()) {
    const db = createServiceClient();
    const { count, error } = await db
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .is('deleted_at', null);
    if (error) throw new Error(`getCategoryExpenseCount: ${error.message}`);
    return count ?? 0;
  }

  const { getAllExpenses } = await import('@/data/mock');
  const expenses = getAllExpenses(userId);
  return expenses.filter((e) => e.category === categoryId).length;
}
