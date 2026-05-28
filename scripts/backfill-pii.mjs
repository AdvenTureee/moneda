import { createClient } from '@supabase/supabase-js';
import { createCipheriv, createHmac, randomBytes } from 'node:crypto';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const encryptionKey = readKey('PII_ENCRYPTION_KEY_V1');
const hashKey = readKey('PII_HASH_KEY_V1');

if (!url || !serviceRole) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const supabase = createClient(url, serviceRole, { auth: { persistSession: false } });

function readKey(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  if (/^[0-9a-f]{64}$/i.test(value)) return Buffer.from(value, 'hex');
  const base64 = Buffer.from(value, 'base64');
  if (base64.length >= 32) return base64.subarray(0, 32);
  const utf8 = Buffer.from(value, 'utf8');
  if (utf8.length >= 32) return utf8.subarray(0, 32);
  throw new Error(`${name} must be at least 32 bytes, or a 32-byte hex/base64 key.`);
}

function encrypt(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) return { ciphertext: null, iv: null, tag: null };
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv, { authTagLength: 16 });
  const ciphertext = Buffer.concat([cipher.update(normalized, 'utf8'), cipher.final()]);
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}

function hmac(value) {
  if (!value) return null;
  return createHmac('sha256', hashKey).update(value).digest('hex');
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() || null : null;
}

function normalizePhone(phone) {
  return typeof phone === 'string' ? phone.replace(/[^\d+]/g, '').trim() || null : null;
}

async function backfillProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,email,phone,name_ciphertext,email_ciphertext,phone_ciphertext');
  if (error) throw error;

  for (const row of data ?? []) {
    if (row.name_ciphertext && row.email_ciphertext && (!row.phone || row.phone_ciphertext)) continue;
    const name = encrypt(row.name);
    const email = normalizeEmail(row.email);
    const encryptedEmail = encrypt(email);
    const phone = normalizePhone(row.phone);
    const encryptedPhone = encrypt(phone);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        name_ciphertext: name.ciphertext,
        name_iv: name.iv,
        name_tag: name.tag,
        email_ciphertext: encryptedEmail.ciphertext,
        email_iv: encryptedEmail.iv,
        email_tag: encryptedEmail.tag,
        email_hash: hmac(email),
        phone_ciphertext: encryptedPhone.ciphertext,
        phone_iv: encryptedPhone.iv,
        phone_tag: encryptedPhone.tag,
        phone_hash: hmac(phone),
        pii_crypto_version: 'v1',
      })
      .eq('id', row.id);
    if (updateError) throw updateError;
  }
}

async function backfillWhatsappPhones() {
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('id,phone,phone_ciphertext');
  if (error) throw error;

  for (const row of data ?? []) {
    if (row.phone_ciphertext) continue;
    const phone = normalizePhone(row.phone);
    const encryptedPhone = encrypt(phone);
    const { error: updateError } = await supabase
      .from('whatsapp_messages')
      .update({
        phone_ciphertext: encryptedPhone.ciphertext,
        phone_iv: encryptedPhone.iv,
        phone_tag: encryptedPhone.tag,
        phone_hash: hmac(phone),
        pii_crypto_version: 'v1',
      })
      .eq('id', row.id);
    if (updateError) throw updateError;
  }
}

await backfillProfiles();
await backfillWhatsappPhones();
console.log('PII backfill completed.');
