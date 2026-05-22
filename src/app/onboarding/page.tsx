import { redirect } from 'next/navigation';
import { createSessionClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { getCategories } from '@/lib/categories';
import { getCurrentPeriod } from '@/lib/utils';
import { MOCK_USER } from '@/data/mock';
import OnboardingView from './OnboardingView';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  let userId = MOCK_USER.id;
  let firstName = 'pessoa';

  if (isSupabaseEnabled()) {
    const supabase = await createSessionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // If already onboarded, don't trap them here.
    if (user.user_metadata?.onboarded === true) {
      redirect('/');
    }

    userId = user.id;
    const fullName =
      (user.user_metadata?.name as string | undefined) ??
      (user.user_metadata?.full_name as string | undefined) ??
      '';
    if (fullName) firstName = fullName.split(' ')[0];
  }

  const period = getCurrentPeriod();
  const categories = await getCategories(userId);

  return (
    <OnboardingView
      categories={categories}
      period={period}
      firstName={firstName}
    />
  );
}
