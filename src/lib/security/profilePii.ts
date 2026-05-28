import 'server-only';

import type { User } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { buildEncryptedProfilePii, decryptPii } from '@/lib/security/piiCrypto';

type ProfileRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  | 'name'
  | 'email'
  | 'phone'
  | 'name_ciphertext'
  | 'name_iv'
  | 'name_tag'
  | 'email_ciphertext'
  | 'email_iv'
  | 'email_tag'
  | 'phone_ciphertext'
  | 'phone_iv'
  | 'phone_tag'
>;

export function getDisplayNameFromUser(user: User): string {
  const metadata = user.user_metadata ?? {};
  return (
    (metadata.name as string | undefined) ??
    (metadata.full_name as string | undefined) ??
    (user.email ? user.email.split('@')[0] : 'Usuário')
  );
}

export function decryptProfilePii(profile: ProfileRow | null | undefined) {
  if (!profile) {
    return { name: '', email: '', phone: null as string | null };
  }

  const name = safeDecrypt({
    ciphertext: profile.name_ciphertext,
    iv: profile.name_iv,
    tag: profile.name_tag,
  }) ?? profile.name;

  const email = safeDecrypt({
    ciphertext: profile.email_ciphertext,
    iv: profile.email_iv,
    tag: profile.email_tag,
  }) ?? profile.email;

  const phone = safeDecrypt({
    ciphertext: profile.phone_ciphertext,
    iv: profile.phone_iv,
    tag: profile.phone_tag,
  }) ?? profile.phone;

  return { name, email, phone };
}

function safeDecrypt(value: Parameters<typeof decryptPii>[0]): string | null {
  try {
    return decryptPii(value);
  } catch {
    return null;
  }
}

export function buildProfilePiiUpdate(input: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  return buildEncryptedProfilePii(input);
}
