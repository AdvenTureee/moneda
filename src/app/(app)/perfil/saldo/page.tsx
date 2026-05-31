import { redirect } from 'next/navigation';
import { createServiceClient, createSessionClient, isSupabaseEnabled } from '@/lib/supabase/server';
import BalanceForm from './BalanceForm';

export default async function SaldoPage() {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let currentBalanceCents = 0;
  let updatedAt: string | null = null;

  if (isSupabaseEnabled()) {
    const admin = createServiceClient();
    const { data } = await admin
      .from('profiles')
      .select('current_balance_cents, updated_at')
      .eq('id', user.id)
      .single();
    currentBalanceCents = data?.current_balance_cents ?? 0;
    updatedAt = data?.updated_at ?? null;
  }

  return (
    <BalanceForm
      initialBalanceCents={currentBalanceCents}
      updatedAt={updatedAt}
    />
  );
}
