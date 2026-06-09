import { redirect } from 'next/navigation';
import { createSessionClient } from '@/lib/supabase/server';
import { resolveUserHasPassword } from '@/lib/auth/password';
import { getProfilePreferences } from '@/lib/profiles';
import PasswordForm from './PasswordForm';

export default async function SenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ recovery?: string | string[] }>;
}) {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const profile = await getProfilePreferences(user.id);
  const hasPassword = resolveUserHasPassword(user, profile.hasPassword);
  const email = user.email ?? '';
  const sp = await searchParams;
  const recovery = Array.isArray(sp.recovery) ? sp.recovery[0] : sp.recovery;

  return (
    <PasswordForm
      email={email}
      hasPassword={hasPassword}
      isRecovery={recovery === '1'}
    />
  );
}
