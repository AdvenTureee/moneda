import type { User } from '@supabase/supabase-js';

export function userHasPasswordProvider(user: Pick<User, 'app_metadata' | 'identities'>): boolean {
  const appProviders = user.app_metadata?.providers ?? [];
  const identityProviders = (user.identities ?? [])
    .map((identity) => identity.provider)
    .filter((provider): provider is string => typeof provider === 'string');

  return appProviders.includes('email') || identityProviders.includes('email');
}

export function resolveUserHasPassword(
  user: Pick<User, 'app_metadata' | 'identities'>,
  profileHasPassword: boolean | null | undefined,
): boolean {
  return profileHasPassword === true || userHasPasswordProvider(user);
}
