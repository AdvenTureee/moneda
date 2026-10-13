import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, '../.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);

const STALE_USER_ID = '53aa3b0a-5b69-4462-a398-d5734d333cd3';

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env');
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error: getErr } = await admin.auth.admin.getUserById(STALE_USER_ID);
if (getErr && !/not found/i.test(getErr.message)) {
  console.error('Lookup failed:', getErr.message);
  process.exit(1);
}
if (!data?.user) {
  console.log('User not found — already clean. Nothing to do.');
  process.exit(0);
}

console.log('Found stale user:', {
  id: data.user.id,
  email: data.user.email,
  created_at: data.user.created_at,
});

const { error: delErr } = await admin.auth.admin.deleteUser(STALE_USER_ID);
if (delErr) {
  console.error('Delete failed:', delErr.message);
  process.exit(1);
}

console.log('Deleted.', { id: STALE_USER_ID });
