import { requireUserId } from '@/lib/supabase/server';
import { getIncomes } from '@/lib/incomes';
import IncomesView from './IncomesView';

export default async function GanhosPage() {
  const userId = await requireUserId();

  const incomes = await getIncomes(userId);

  return <IncomesView initialIncomes={incomes} />;
}
