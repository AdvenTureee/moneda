import { redirect } from 'next/navigation';
import { createSessionClient, createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';
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
    const admin = createServiceClient();
    const { data } = await admin
      .from('profiles')
      .select('currency,billing_closing_day,has_password,name_ciphertext,name_iv,name_tag,email_ciphertext,email_iv,email_tag,phone_ciphertext,phone_iv,phone_tag')
      .eq('id', user.id)
      .single();
    if (data?.currency) currency = data.currency;
    billingClosingDay = typeof data?.billing_closing_day === 'number' ? data.billing_closing_day : null;
    if (typeof data?.has_password === 'boolean') profileHasPassword = data.has_password;
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
