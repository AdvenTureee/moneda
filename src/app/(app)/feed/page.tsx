import { redirect } from 'next/navigation';
import { createSessionClient } from '@/lib/supabase/server';
import { getBillingClosingDay } from '@/lib/profiles';
import { getCurrentBillingPeriod, getBillingCycleForPeriod } from '@/lib/billingCycle';
import { getCategories } from '@/lib/categories';
import { getFeedExpensesPage } from '@/lib/expenses';
import { FEED_PAGE_SIZE } from '@/lib/feedQuery';
import FeedView from './FeedView';

export default async function FeedPage() {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [billingClosingDay, initialCategories] = await Promise.all([
    getBillingClosingDay(user.id),
    getCategories(user.id),
  ]);
  const currentCycle = getBillingCycleForPeriod(
    getCurrentBillingPeriod(billingClosingDay),
    billingClosingDay,
  );
  const initialFeedPage = await getFeedExpensesPage({
    userId: user.id,
    startDate: currentCycle.start.toISOString(),
    endDate: currentCycle.end.toISOString(),
    order: 'history',
    limit: FEED_PAGE_SIZE,
  });

  return (
    <FeedView
      billingClosingDay={billingClosingDay}
      initialCategories={initialCategories}
      initialFeedPage={initialFeedPage}
    />
  );
}
