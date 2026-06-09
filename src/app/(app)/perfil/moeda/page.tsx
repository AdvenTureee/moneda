import { redirect } from 'next/navigation';
import { getProfilePreferences } from '@/lib/profiles';
import { createSessionClient, isSupabaseEnabled } from '@/lib/supabase/server';
import CurrencyForm from './CurrencyForm';

export default async function MoedaPage() {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let current = 'BRL';
  if (isSupabaseEnabled()) {
    current = (await getProfilePreferences(user.id)).currency;
  }

  return <CurrencyForm initialCurrency={current} />;
}
