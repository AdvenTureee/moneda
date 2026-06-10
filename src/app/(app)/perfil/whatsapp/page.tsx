import { redirect } from 'next/navigation';
import { createSessionClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { decryptProfilePii } from '@/lib/security/profilePii';
import WhatsAppPhoneForm from './WhatsAppPhoneForm';

export default async function WhatsAppPage() {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let phone: string | null = null;
  let updatedAt: string | null = null;

  if (isSupabaseEnabled()) {
    const { data } = await supabase
      .from('profiles')
      .select('phone,phone_ciphertext,phone_iv,phone_tag,updated_at')
      .eq('id', user.id)
      .single();

    if (data) {
      phone = decryptProfilePii({
        name_ciphertext: null,
        name_iv: null,
        name_tag: null,
        email_ciphertext: null,
        email_iv: null,
        email_tag: null,
        phone_ciphertext: data.phone_ciphertext,
        phone_iv: data.phone_iv,
        phone_tag: data.phone_tag,
      }).phone ?? data.phone;
      updatedAt = data.updated_at ?? null;
    }
  }

  return <WhatsAppPhoneForm initialPhone={phone} updatedAt={updatedAt} />;
}
