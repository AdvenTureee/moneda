import { redirect } from 'next/navigation';
import { createSessionClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { getCategories } from '@/lib/categories';
import ImportView from './ImportView';

export default async function ImportarPage() {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let categories: Awaited<ReturnType<typeof getCategories>> = [];

  if (isSupabaseEnabled()) {
    categories = await getCategories(user.id);
  }

  return <ImportView categories={categories} />;
}
