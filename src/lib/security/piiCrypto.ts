import 'server-only';

import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

export const PII_CRYPTO_VERSION = 'v1';

export interface EncryptedValue {
  ciphertext: string;
  iv: string;
  tag: string;
}

export interface EncryptedNullableValue {
  ciphertext: string | null;
  iv: string | null;
  tag: string | null;
}

function readKey(name: 'PII_ENCRYPTION_KEY_V1' | 'PII_HASH_KEY_V1'): Buffer {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required to protect PII.`);
  }

  if (/^[0-9a-f]{64}$/i.test(value)) {
    return Buffer.from(value, 'hex');
  }

  const base64 = Buffer.from(value, 'base64');
  if (base64.length >= 32) {
    return base64.subarray(0, 32);
  }

  const utf8 = Buffer.from(value, 'utf8');
  if (utf8.length >= 32) {
    return utf8.subarray(0, 32);
  }

  throw new Error(`${name} must be at least 32 bytes, or a 32-byte hex/base64 key.`);
}

export function encryptPii(value: string): EncryptedValue {
  const key = readKey('PII_ENCRYPTION_KEY_V1');
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function encryptNullablePii(value: string | null | undefined): EncryptedNullableValue {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) return { ciphertext: null, iv: null, tag: null };
  return encryptPii(normalized);
}

export function decryptPii(value: EncryptedNullableValue): string | null {
  if (!value.ciphertext || !value.iv || !value.tag) return null;

  const key = readKey('PII_ENCRYPTION_KEY_V1');
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(value.iv, 'base64'), {
    authTagLength: TAG_BYTES,
  });
  decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

export function normalizeEmailForHash(email: string | null | undefined): string | null {
  const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
  return normalized || null;
}

export function normalizePhoneForHash(phone: string | null | undefined): string | null {
  const normalized = typeof phone === 'string' ? phone.replace(/[^\d+]/g, '').trim() : '';
  return normalized || null;
}

export function hashPii(value: string | null | undefined): string | null {
  if (!value) return null;
  return createHmac('sha256', readKey('PII_HASH_KEY_V1')).update(value).digest('hex');
}

export function buildEncryptedProfilePii(input: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  const encryptedName = encryptNullablePii(input.name);
  const normalizedEmail = normalizeEmailForHash(input.email);
  const encryptedEmail = encryptNullablePii(normalizedEmail);
  const normalizedPhone = normalizePhoneForHash(input.phone);
  const encryptedPhone = encryptNullablePii(normalizedPhone);

  return {
    name_ciphertext: encryptedName.ciphertext,
    name_iv: encryptedName.iv,
    name_tag: encryptedName.tag,
    email_ciphertext: encryptedEmail.ciphertext,
    email_iv: encryptedEmail.iv,
    email_tag: encryptedEmail.tag,
    email_hash: hashPii(normalizedEmail),
    phone_ciphertext: encryptedPhone.ciphertext,
    phone_iv: encryptedPhone.iv,
    phone_tag: encryptedPhone.tag,
    phone_hash: hashPii(normalizedPhone),
    pii_crypto_version: PII_CRYPTO_VERSION,
  };
}

export function buildEncryptedWhatsappPhone(phone: string | null | undefined) {
  const normalizedPhone = normalizePhoneForHash(phone);
  const encryptedPhone = encryptNullablePii(normalizedPhone);
  return {
    phone_ciphertext: encryptedPhone.ciphertext,
    phone_iv: encryptedPhone.iv,
    phone_tag: encryptedPhone.tag,
    phone_hash: hashPii(normalizedPhone),
    pii_crypto_version: PII_CRYPTO_VERSION,
  };
}
