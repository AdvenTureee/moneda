import { redirect } from 'next/navigation';
import { createSessionClient } from '@/lib/supabase/server';
import CategoriesView from './CategoriesView';

export default async function CategoriasPage() {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return <CategoriesView />;
}
