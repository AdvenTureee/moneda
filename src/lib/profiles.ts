import { unstable_cache } from 'next/cache';
import { createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { cacheTags } from '@/lib/cache';

async function isUserOnboardedImpl(userId: string): Promise<boolean> {
  if (!isSupabaseEnabled()) return true;
  const admin = createServiceClient();
  const { data } = await admin
    .from('profiles')
    .select('onboarded')
    .eq('id', userId)
    .single();
  return data?.onboarded === true;
}

export async function isUserOnboarded(userId: string): Promise<boolean> {
  return unstable_cache(
    () => isUserOnboardedImpl(userId),
    ['user-onboarded', userId],
    {
      tags: [cacheTags.profile(userId)],
      revalidate: 3600,
    },
  )();
}

async function getCurrentBalanceCentsImpl(userId: string): Promise<number> {
  if (!isSupabaseEnabled()) return 0;
  const admin = createServiceClient();
  const { data } = await admin
    .from('profiles')
    .select('current_balance_cents')
    .eq('id', userId)
    .single();
  return data?.current_balance_cents ?? 0;
}

export async function getCurrentBalanceCents(userId: string): Promise<number> {
  return unstable_cache(
    () => getCurrentBalanceCentsImpl(userId),
    ['current-balance-cents', userId],
    {
      tags: [cacheTags.profile(userId)],
      revalidate: 300,
    },
  )();
}
