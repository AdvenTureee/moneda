import { redirect } from 'next/navigation';
import { createSessionClient, createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';
import ProfileView from './ProfileView';

export default async function ProfileLoader() {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const metadata = user.user_metadata ?? {};
  const initialName =
    (metadata.name as string | undefined) ??
    (metadata.full_name as string | undefined) ??
    '';
  const avatarUrl = (metadata.avatar_url as string | undefined) ?? null;

  let currency = 'BRL';
  if (isSupabaseEnabled()) {
    const admin = createServiceClient();
    const { data } = await admin
      .from('profiles')
      .select('currency')
      .eq('id', user.id)
      .single();
    if (data?.currency) currency = data.currency;
  }

  return (
    <ProfileView
      email={user.email ?? ''}
      initialName={initialName}
      avatarUrl={avatarUrl}
      currency={currency}
      allowDelete={isSupabaseEnabled()}
    />
  );
}
