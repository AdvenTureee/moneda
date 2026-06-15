'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Category } from '@/types';

interface CategoryWithMeta extends Category {
  is_default: boolean;
  sort_order: number;
}

interface CacheEntry {
  data: CategoryWithMeta[];
  ts: number;
}

const STORAGE_KEY = 'grana:categories:v1';
const TTL_MS = 60 * 60 * 1000; // 1 hora

// Singleton in-memory pra dedupe quando múltiplos componentes montam ao mesmo
// tempo (ex: AddExpenseModal + Feed montados juntos).
let inflight: Promise<CategoryWithMeta[]> | null = null;
// Listeners pra propagar refresh/invalidate entre instâncias do hook.
const listeners = new Set<(data: CategoryWithMeta[]) => void>();

function readCache(): CategoryWithMeta[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.ts > TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(data: CategoryWithMeta[]): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry = { data, ts: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // sessionStorage cheio ou modo privado — segue sem cache.
  }
}

function clearCache(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}

async function fetchCategoriesOnce(): Promise<CategoryWithMeta[]> {
  if (inflight) return inflight;
  inflight = (async () => {
    const res = await fetch('/api/categories');
    if (!res.ok) {
      inflight = null;
      throw new Error('Erro ao carregar categorias');
    }
    const json = await res.json();
    const data = (json.data ?? []) as CategoryWithMeta[];
    writeCache(data);
    inflight = null;
    for (const fn of listeners) fn(data);
    return data;
  })();
  return inflight;
}

/**
 * Hook compartilhado pra `/api/categories` com cache em sessionStorage.
 *
 * Estratégia:
 * - 1ª chamada do app: lê sessionStorage; se cache válido (< 1h), retorna instant.
 * - Se cache stale/ausente: fetch e armazena.
 * - Múltiplos componentes que montam juntos compartilham 1 fetch (singleton).
 * - `invalidate()` limpa o sessionStorage. Chamar após mutation de categoria.
 * - `refresh()` força refetch.
 */
export function useCategories(initialData?: CategoryWithMeta[]) {
  const cached = readCache();
  const seed = cached ?? initialData ?? [];
  const [data, setData] = useState<CategoryWithMeta[]>(seed);
  const [loading, setLoading] = useState(cached === null && !initialData);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    if (!force) {
      const fresh = readCache();
      if (fresh) {
        setData(fresh);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCategoriesOnce();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialData && cached === null) writeCache(initialData);

    // Inscreve esta instância no broadcast pra refletir refetches feitos por outras.
    const onUpdate = (next: CategoryWithMeta[]) => setData(next);
    listeners.add(onUpdate);

    // Se não tinha cache no mount, dispara fetch agora.
    if (cached === null && !initialData) {
      void load();
    }

    return () => {
      listeners.delete(onUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(() => load(true), [load]);

  const invalidate = useCallback(() => {
    clearCache();
  }, []);

  return { data, loading, error, refresh, invalidate };
}
