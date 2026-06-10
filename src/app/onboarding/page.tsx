import { redirect } from 'next/navigation';
import {
  createSessionClient,
  isSupabaseEnabled,
} from '@/lib/supabase/server';
import { getCategories } from '@/lib/categories';
import { decryptProfilePii, getDisplayNameFromUser } from '@/lib/security/profilePii';
import { MOCK_USER } from '@/data/mock';
import { TERMS_VERSION } from '@/lib/legal';
import OnboardingView from './OnboardingView';


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
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarded,terms_accepted_at,terms_version,name_ciphertext,name_iv,name_tag,email_ciphertext,email_iv,email_tag,phone_ciphertext,phone_iv,phone_tag')
      .eq('id', userId)
      .single();
    if (!profile?.terms_accepted_at || profile.terms_version !== TERMS_VERSION) {
      redirect('/feed');
    }
    if (profile?.onboarded === true) {
      redirect('/feed');
    }

    const fullName = profile
      ? decryptProfilePii(profile).name || getDisplayNameFromUser(user)
      : getDisplayNameFromUser(user);
    if (fullName) firstName = fullName.split(' ')[0];
  }

  // Pet agora é categoria default para todos.
  const categories = await getCategories(userId, { applyHasPetGate: false });
  const defaultCategories = categories.filter((c) => c.is_default);

  return (
    <OnboardingView
      defaultCategories={defaultCategories}
      firstName={firstName}
    />
  );
}
