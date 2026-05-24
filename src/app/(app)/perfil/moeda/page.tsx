import { redirect } from 'next/navigation';
import { createSessionClient, createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';
import CurrencyForm from './CurrencyForm';

export default async function MoedaPage() {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let current = 'BRL';
  if (isSupabaseEnabled()) {
    const admin = createServiceClient();
    const { data } = await admin
      .from('profiles')
      .select('currency')
      .eq('id', user.id)
      .single();
    if (data?.currency) current = data.currency;
  }

  return <CurrencyForm initialCurrency={current} />;
}
