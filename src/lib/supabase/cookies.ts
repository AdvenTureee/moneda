import type { CookieOptionsWithName } from '@supabase/ssr';

export const SUPABASE_AUTH_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

export const supabaseAuthCookieOptions = {
  path: '/',
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: SUPABASE_AUTH_COOKIE_MAX_AGE,
} satisfies CookieOptionsWithName;
