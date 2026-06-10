import { unstable_cache } from 'next/cache';
import { createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { cacheTags } from '@/lib/cache';
import { normalizeBillingClosingDay } from '@/lib/billingCycle';

export interface ProfileGateStatus {
  onboarded: boolean;
  termsAcceptedAt: string | null;
  termsVersion: string | null;
  hasWhatsappPhone: boolean;
}

export interface ProfilePreferences {
  currency: string;
  billingClosingDay: number | null;
  hasPassword: boolean | null;
  notificationPrefs: Record<string, unknown> | null;
}

async function isUserOnboardedImpl(userId: string): Promise<boolean> {
  if (!isSupabaseEnabled()) return true;
  const supabase = createServiceClient();
  const { data } = await supabase
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

async function getProfileGateStatusImpl(userId: string): Promise<ProfileGateStatus> {
  if (!isSupabaseEnabled()) {
    return {
      onboarded: true,
      termsAcceptedAt: null,
      termsVersion: null,
      hasWhatsappPhone: true,
    };
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from('profiles')
    .select('onboarded,terms_accepted_at,terms_version,phone,phone_hash,phone_ciphertext')
    .eq('id', userId)
    .single();

  return {
    onboarded: data?.onboarded === true,
    termsAcceptedAt: data?.terms_accepted_at ?? null,
    termsVersion: data?.terms_version ?? null,
    hasWhatsappPhone: Boolean(data?.phone || data?.phone_hash || data?.phone_ciphertext),
  };
}

export async function getProfileGateStatus(userId: string): Promise<ProfileGateStatus> {
  return unstable_cache(
    () => getProfileGateStatusImpl(userId),
    ['profile-gate-status', userId],
    {
      tags: [cacheTags.profile(userId)],
      revalidate: 3600,
    },
  )();
}

async function getProfilePreferencesImpl(userId: string): Promise<ProfilePreferences> {
  if (!isSupabaseEnabled()) {
    return {
      currency: 'BRL',
      billingClosingDay: null,
      hasPassword: null,
      notificationPrefs: null,
    };
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from('profiles')
    .select('currency,billing_closing_day,has_password,notification_prefs' as never)
    .eq('id', userId)
    .single();
  const profile = data as {
    currency?: string | null;
    billing_closing_day?: number | null;
    has_password?: boolean | null;
    notification_prefs?: Record<string, unknown> | null;
  } | null;

  return {
    currency: profile?.currency || 'BRL',
    billingClosingDay:
      typeof profile?.billing_closing_day === 'number' ? profile.billing_closing_day : null,
    hasPassword: typeof profile?.has_password === 'boolean' ? profile.has_password : null,
    notificationPrefs:
      profile?.notification_prefs && typeof profile.notification_prefs === 'object'
        ? profile.notification_prefs
        : null,
  };
}

export async function getProfilePreferences(userId: string): Promise<ProfilePreferences> {
  return unstable_cache(
    () => getProfilePreferencesImpl(userId),
    ['profile-preferences', userId],
    {
      tags: [cacheTags.profile(userId)],
      revalidate: 3600,
    },
  )();
}

async function getBillingClosingDayImpl(userId: string): Promise<number | null> {
  if (!isSupabaseEnabled()) return null;
  const supabase = createServiceClient();
  const { data } = await supabase
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
