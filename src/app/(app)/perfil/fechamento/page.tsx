import { redirect } from 'next/navigation';
import { createSessionClient } from '@/lib/supabase/server';
import { getNullableBillingClosingDay } from '@/lib/profiles';
import { normalizeBillingClosingDay } from '@/lib/billingCycle';
import BillingClosingDayForm from './BillingClosingDayForm';

export default async function FechamentoPage() {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const current = await getNullableBillingClosingDay(user.id);

  return (
    <BillingClosingDayForm
      initialDay={normalizeBillingClosingDay(current)}
      wasMissing={current === null}
    />
  );
}
