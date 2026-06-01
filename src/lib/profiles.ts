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
