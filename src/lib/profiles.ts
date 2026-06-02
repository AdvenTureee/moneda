import { unstable_cache } from 'next/cache';
import { createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { cacheTags } from '@/lib/cache';
import { normalizeBillingClosingDay } from '@/lib/billingCycle';

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

async function getBillingClosingDayImpl(userId: string): Promise<number | null> {
  if (!isSupabaseEnabled()) return null;
  const admin = createServiceClient();
  const { data } = await admin
    .from('profiles')
    .select('billing_closing_day')
    .eq('id', userId)
    .single();
  return typeof data?.billing_closing_day === 'number' ? data.billing_closing_day : null;
}

export async function getBillingClosingDay(userId: string): Promise<number> {
  const value = await getNullableBillingClosingDay(userId);
  return normalizeBillingClosingDay(value);
}

export async function getNullableBillingClosingDay(userId: string): Promise<number | null> {
  return unstable_cache(
    () => getBillingClosingDayImpl(userId),
    ['billing-closing-day', userId],
    {
      tags: [cacheTags.profile(userId)],
      revalidate: 3600,
    },
  )();
}
