import { redirect } from 'next/navigation';
import { createSessionClient } from '@/lib/supabase/server';
import PasswordForm from './PasswordForm';

export default async function SenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ recovery?: string | string[] }>;
}) {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const hasEmailIdentity = (user.identities ?? []).some((identity) => identity.provider === 'email');
  const email = user.email ?? '';
  const sp = await searchParams;
  const recovery = Array.isArray(sp.recovery) ? sp.recovery[0] : sp.recovery;

  return (
    <PasswordForm
      email={email}
      hasEmailIdentity={hasEmailIdentity}
      isRecovery={recovery === '1'}
    />
  );
}
