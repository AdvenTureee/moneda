'use client';

import { useCallback, useState } from 'react';
import ExpenseCard from '@/components/ExpenseCard';
import UpcomingInstallmentsModal from '@/components/UpcomingInstallmentsModal';
import { hasUpcomingInstallments } from '@/lib/installments';
import type { Expense } from '@/types';

interface RecentInstallmentExpensesProps {
  expenses: Expense[];
  billingClosingDay: number;
}

export default function RecentInstallmentExpenses({
  expenses,
  billingClosingDay,
}: RecentInstallmentExpensesProps) {
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const handleExpenseClick = useCallback((expense: Expense) => {
    if (!hasUpcomingInstallments(expense)) return;
    setSelectedExpense(expense);
  }, []);

  return (
    <>
      <div className="space-y-2">
        {expenses.map((expense, i) => (
          <div key={expense.id} className={`animate-fade-up delay-${Math.min(i + 8, 9)}`}>
            <ExpenseCard
              expense={expense}
              variant="compact"
              onClick={hasUpcomingInstallments(expense) ? () => handleExpenseClick(expense) : undefined}
            />
          </div>
        ))}
      </div>
      <UpcomingInstallmentsModal
        isOpen={selectedExpense !== null}
        expense={selectedExpense}
        billingClosingDay={billingClosingDay}
        onClose={() => setSelectedExpense(null)}
      />
    </>
  );
}
