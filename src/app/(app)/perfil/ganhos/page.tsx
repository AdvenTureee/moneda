import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { createSessionClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { MOCK_USER } from '@/data/mock';
import { getIncomes } from '@/lib/incomes';
import IncomesView from './IncomesView';

export const dynamic = 'force-dynamic';

export default async function GanhosPage() {
  let userId = MOCK_USER.id;
  
  if (isSupabaseEnabled()) {
    const supabase = await createSessionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    userId = user.id;
  }

  const incomes = await getIncomes(userId);

  return (
    <AppShell>
      <IncomesView initialIncomes={incomes} />
    </AppShell>
  );
}
