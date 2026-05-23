import { redirect } from 'next/navigation';
import {
  createSessionClient,
  createServiceClient,
  isSupabaseEnabled,
} from '@/lib/supabase/server';
import { getCategories } from '@/lib/categories';
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
    userId = user.id;

    // If already onboarded (per profiles.onboarded), don't trap them here.
    // Não usamos user_metadata porque provedores OAuth sobrescrevem a cada login.
    const admin = createServiceClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('onboarded')
      .eq('id', userId)
      .single();
    if (profile?.onboarded === true) {
      redirect('/');
    }

    const fullName =
      (user.user_metadata?.name as string | undefined) ??
      (user.user_metadata?.full_name as string | undefined) ??
      '';
    if (fullName) firstName = fullName.split(' ')[0];
  }

  // Pet precisa ser visível no passo 3 caso o usuário escolha "Sim",
  // então pulamos o gate de has_pet aqui (decisão é client-side).
  const categories = await getCategories(userId, { applyHasPetGate: false });
  const defaultCategories = categories.filter((c) => c.is_default);

  return (
    <OnboardingView
      defaultCategories={defaultCategories}
      firstName={firstName}
    />
  );
}
