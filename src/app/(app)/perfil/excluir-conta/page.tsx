import { redirect } from 'next/navigation';
import { createSessionClient, createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { decryptProfilePii, getDisplayNameFromUser } from '@/lib/security/profilePii';
import DeleteAccountForm from './DeleteAccountForm';

export default async function DeleteAccountPage() {
  if (!isSupabaseEnabled()) redirect('/perfil');

  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let displayName = getDisplayNameFromUser(user);
  let email = user.email ?? '';

  const admin = createServiceClient();
  const { data } = await admin
    .from('profiles')
    .select('name_ciphertext,name_iv,name_tag,email_ciphertext,email_iv,email_tag,phone_ciphertext,phone_iv,phone_tag')
    .eq('id', user.id)
    .maybeSingle();

  if (data) {
    const pii = decryptProfilePii(data);
    displayName = pii.name || displayName;
    email = pii.email || email;
  }

  return (
    <DeleteAccountForm confirmationName={displayName.trim() || email || 'EXCLUIR'} />
  );
}
