import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { createSessionClient, isSupabaseEnabled } from '@/lib/supabase/server';
import ProfileView from './ProfileView';

export const dynamic = 'force-dynamic';

export default async function PerfilPage() {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const metadata = user.user_metadata ?? {};
  const initialName =
    (metadata.name as string | undefined) ??
    (metadata.full_name as string | undefined) ??
    '';
  const avatarUrl = (metadata.avatar_url as string | undefined) ?? null;

  return (
    <AppShell>
      <ProfileView
        email={user.email ?? ''}
        initialName={initialName}
        avatarUrl={avatarUrl}
        allowDelete={isSupabaseEnabled()}
      />
    </AppShell>
  );
}
