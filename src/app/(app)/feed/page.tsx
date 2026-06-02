import { redirect } from 'next/navigation';
import { createSessionClient } from '@/lib/supabase/server';
import { getBillingClosingDay } from '@/lib/profiles';
import FeedView from './FeedView';

export default async function FeedPage() {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const billingClosingDay = await getBillingClosingDay(user.id);

  return <FeedView billingClosingDay={billingClosingDay} />;
}
