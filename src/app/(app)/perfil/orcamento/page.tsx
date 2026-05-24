import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { createSessionClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { MOCK_USER } from '@/data/mock';
import { getBudgets } from '@/lib/budgets';
import { getCurrentPeriod } from '@/lib/utils';
import BudgetForm from './BudgetForm';

export const dynamic = 'force-dynamic';

export default async function OrcamentoPage() {
  let userId = MOCK_USER.id;
  
  if (isSupabaseEnabled()) {
    const supabase = await createSessionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    userId = user.id;
  }

  const period = getCurrentPeriod();
  const budgets = await getBudgets(userId, period);

  return (
    <AppShell>
      <BudgetForm initialBudgets={budgets} period={period} />
    </AppShell>
  );
}
