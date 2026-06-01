import { redirect } from 'next/navigation';
import { createSessionClient } from '@/lib/supabase/server';
import { resolveUserHasPassword } from '@/lib/auth/password';
import PasswordForm from './PasswordForm';

export default async function SenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ recovery?: string | string[] }>;
}) {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('has_password')
    .eq('id', user.id)
    .maybeSingle();
  const hasPassword = resolveUserHasPassword(user, profile?.has_password);
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
