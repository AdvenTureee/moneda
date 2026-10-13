import { redirect } from 'next/navigation';
import { createSessionClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { getProfilePreferences } from '@/lib/profiles';
import { resolveProfileAvatarUrl } from '@/lib/profileAvatar';
import { decryptProfilePii, getDisplayNameFromUser } from '@/lib/security/profilePii';
import { resolveUserHasPassword } from '@/lib/auth/password';
import ProfileView from './ProfileView';

export default async function ProfileLoader() {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const metadata = user.user_metadata ?? {};
  const legacyAvatarUrl = (metadata.avatar_url as string | undefined) ?? null;
  let storedAvatar: string | null = null;

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
      .select('avatar_url,name_ciphertext,name_iv,name_tag,email_ciphertext,email_iv,email_tag,phone_ciphertext,phone_iv,phone_tag')
      .eq('id', user.id)
      .single();
    if (data) {
      storedAvatar = data.avatar_url;
      const pii = decryptProfilePii(data);
      initialName = pii.name || initialName;
      email = pii.email || email;
    }
  }

  const avatarUrl = await resolveProfileAvatarUrl(user.id, storedAvatar, legacyAvatarUrl);

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
