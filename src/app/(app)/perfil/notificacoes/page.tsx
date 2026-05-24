import { redirect } from 'next/navigation';
import { createSessionClient, createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from '../notification-prefs';
import NotificationsForm from './NotificationsForm';

export default async function NotificacoesPage() {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let prefs: NotificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS };
  if (isSupabaseEnabled()) {
    const admin = createServiceClient();
    const { data } = await admin
      .from('profiles')
      .select('notification_prefs' as never)
      .eq('id', user.id)
      .single();
    const stored = (data as { notification_prefs?: Partial<NotificationPrefs> } | null)
      ?.notification_prefs;
    if (stored && typeof stored === 'object') {
      prefs = { ...DEFAULT_NOTIFICATION_PREFS, ...stored };
    }
  }

  return <NotificationsForm initial={prefs} />;
}
