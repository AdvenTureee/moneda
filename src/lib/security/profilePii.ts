import 'server-only';

import type { User } from '@supabase/supabase-js';
import {
  PII_CRYPTO_VERSION,
  buildEncryptedProfilePii,
  decryptPii,
  encryptNullablePii,
  hashPii,
  normalizeEmailForHash,
  normalizePhoneForHash,
} from '@/lib/security/piiCrypto';

export interface EncryptedProfilePiiRow {
  name_ciphertext: string | null;
  name_iv: string | null;
  name_tag: string | null;
  email_ciphertext: string | null;
  email_iv: string | null;
  email_tag: string | null;
  phone_ciphertext: string | null;
  phone_iv: string | null;
  phone_tag: string | null;
}

export function getDisplayNameFromUser(user: User): string {
  const metadata = user.user_metadata ?? {};
  return (
    (metadata.name as string | undefined) ??
    (metadata.full_name as string | undefined) ??
    (user.email ? user.email.split('@')[0] : 'Usuário')
  );
}

export function decryptProfilePii(profile: EncryptedProfilePiiRow | null | undefined) {
  if (!profile) {
    return { name: '', email: '', phone: null as string | null };
  }

  const name = safeDecrypt({
    ciphertext: profile.name_ciphertext,
    iv: profile.name_iv,
    tag: profile.name_tag,
  }) ?? '';

  const email = safeDecrypt({
    ciphertext: profile.email_ciphertext,
    iv: profile.email_iv,
    tag: profile.email_tag,
  }) ?? '';

  const phone = safeDecrypt({
    ciphertext: profile.phone_ciphertext,
    iv: profile.phone_iv,
    tag: profile.phone_tag,
  }) ?? null;

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

export function buildProfileIdentityPiiUpdate(input: {
  name?: string | null;
  email?: string | null;
}) {
  const encryptedName = encryptNullablePii(input.name);
  const normalizedEmail = normalizeEmailForHash(input.email);
  const encryptedEmail = encryptNullablePii(normalizedEmail);

  return {
    name_ciphertext: encryptedName.ciphertext,
    name_iv: encryptedName.iv,
    name_tag: encryptedName.tag,
    email_ciphertext: encryptedEmail.ciphertext,
    email_iv: encryptedEmail.iv,
    email_tag: encryptedEmail.tag,
    email_hash: hashPii(normalizedEmail),
    pii_crypto_version: PII_CRYPTO_VERSION,
  };
}

export function buildProfilePhonePiiUpdate(phone: string | null | undefined) {
  const normalizedPhone = normalizePhoneForHash(phone);
  const encryptedPhone = encryptNullablePii(normalizedPhone);

  return {
    phone: normalizedPhone,
    phone_ciphertext: encryptedPhone.ciphertext,
    phone_iv: encryptedPhone.iv,
    phone_tag: encryptedPhone.tag,
    phone_hash: hashPii(normalizedPhone),
    pii_crypto_version: PII_CRYPTO_VERSION,
  };
}
