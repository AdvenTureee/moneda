import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const supabase = createClient(url, serviceRole, { auth: { persistSession: false } });

async function nullifyProfiles() {
  const { error } = await supabase
    .from('profiles')
    .update({ name: null, email: null, phone: null })
    .not('name_ciphertext', 'is', null)
    .not('email_ciphertext', 'is', null)
    .not('email_hash', 'is', null);

  if (error) throw error;
}

async function nullifyWhatsappPhones() {
  const { error } = await supabase
    .from('whatsapp_messages')
    .update({ phone: null })
    .not('phone_ciphertext', 'is', null)
    .not('phone_hash', 'is', null);

  if (error) throw error;
}

await nullifyProfiles();
await nullifyWhatsappPhones();
console.log('Legacy PII columns nullified where encrypted data exists.');
