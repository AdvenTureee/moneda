import { QueryClient } from '@tanstack/react-query';

/**
 * Cliente TanStack Query para o Moneda mobile.
 *
 * Defaults pensados para:
 * - Reduzir refetches em telas de leitura (staleTime mais alto).
 * - Manter dados do dashboard "frescos" sem refetch constante.
 * - Retry silencioso: falha → toast + retry manual é melhor UX.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s
      gcTime: 5 * 60_000, // 5min
      retry: (failureCount, error) => {
        // Não retentar 4xx — só network e 5xx.
        const status = (error as { status?: number } | null)?.status;
        if (typeof status === 'number' && status >= 400 && status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
