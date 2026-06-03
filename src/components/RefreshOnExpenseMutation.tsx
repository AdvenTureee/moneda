'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const EXPENSE_MUTATION_FLAG = 'moneda:expense-mutated';

export default function RefreshOnExpenseMutation() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasMutation = window.sessionStorage.getItem(EXPENSE_MUTATION_FLAG) === '1';
    if (!hasMutation) return;

    window.sessionStorage.removeItem(EXPENSE_MUTATION_FLAG);
    router.refresh();
  }, [router]);

  return null;
}
