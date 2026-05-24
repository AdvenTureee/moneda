'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PullToRefresh from '@/components/PullToRefresh';
import { useCategories } from '@/hooks/useCategories';
import { refreshUserDataAction } from '@/app/actions/refresh';

interface PageRefreshWrapperProps {
  children: React.ReactNode;
  disabled?: boolean;
}

/**
 * Wrapper client para envolver pages (Server Components) com o gesto de
 * pull-to-refresh. Limpa o cache de categorias do sessionStorage, dispara
 * `updateTag` server-side para invalidar `unstable_cache`, e re-renderiza
 * via `router.refresh()`.
 */
export default function PageRefreshWrapper({
  children,
  disabled,
}: PageRefreshWrapperProps) {
  const router = useRouter();
  const { invalidate, refresh: refreshCategories } = useCategories();

  const handleRefresh = useCallback(async () => {
    invalidate();
    await refreshUserDataAction();
    // Em paralelo: refetch categorias do client + re-render server.
    await Promise.all([
      refreshCategories(),
      Promise.resolve(router.refresh()),
    ]);
  }, [invalidate, refreshCategories, router]);

  return (
    <PullToRefresh onRefresh={handleRefresh} disabled={disabled}>
      {children}
    </PullToRefresh>
  );
}
