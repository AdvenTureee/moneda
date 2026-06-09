import { redirect } from 'next/navigation';
import { getProfilePreferences } from '@/lib/profiles';
import { createSessionClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from '../notification-prefs';
import NotificationsForm from './NotificationsForm';

export default async function NotificacoesPage() {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let prefs: NotificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS };
  if (isSupabaseEnabled()) {
    const stored = (await getProfilePreferences(user.id)).notificationPrefs as
      | Partial<NotificationPrefs>
      | null;
    if (stored && typeof stored === 'object') {
      prefs = { ...DEFAULT_NOTIFICATION_PREFS, ...stored };
    }
  }

  return <NotificationsForm initial={prefs} />;
}
