import { redirect } from 'next/navigation';
import { createSessionClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { getProfilePreferences } from '@/lib/profiles';
import { decryptProfilePii, getDisplayNameFromUser } from '@/lib/security/profilePii';
import { resolveUserHasPassword } from '@/lib/auth/password';
import ProfileView from './ProfileView';

export default async function ProfileLoader() {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const metadata = user.user_metadata ?? {};
  const avatarUrl = (metadata.avatar_url as string | undefined) ?? null;

  let currency = 'BRL';
  let billingClosingDay: number | null = null;
  let initialName = getDisplayNameFromUser(user);
  let email = user.email ?? '';
  let profileHasPassword: boolean | null = null;
  if (isSupabaseEnabled()) {
    const preferences = await getProfilePreferences(user.id);
    currency = preferences.currency;
    billingClosingDay = preferences.billingClosingDay;
    profileHasPassword = preferences.hasPassword;

    const { data } = await supabase
      .from('profiles')
      .select('name_ciphertext,name_iv,name_tag,email_ciphertext,email_iv,email_tag,phone_ciphertext,phone_iv,phone_tag')
      .eq('id', user.id)
      .single();
    if (data) {
      const pii = decryptProfilePii(data);
      initialName = pii.name || initialName;
      email = pii.email || email;
    }
  }

  // Identidades já vinculadas (ex: ['email', 'google']). Usado para mostrar
  // o estado correto do botão "Vincular Google" em ProfileView.
  const linkedProviders = (user.identities ?? [])
    .map((i) => i.provider)
    .filter((p): p is string => typeof p === 'string');

  return (
    <ProfileView
      email={email}
      initialName={initialName}
      avatarUrl={avatarUrl}
      currency={currency}
      billingClosingDay={billingClosingDay}
      allowDelete={isSupabaseEnabled()}
      linkedProviders={linkedProviders}
      hasPassword={resolveUserHasPassword(user, profileHasPassword)}
    />
  );
}
