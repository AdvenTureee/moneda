import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { cacheTags } from '@/lib/cache';
import { TERMS_VERSION } from '@/lib/legal';
import {
  buildProfileIdentityPiiUpdate,
  buildProfilePhonePiiUpdate,
  getDisplayNameFromUser,
} from '@/lib/security/profilePii';
import {
  createServiceClient,
  createSessionClient,
  isSupabaseEnabled,
} from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

export async function POST() {
  if (!isSupabaseEnabled()) {
    return NextResponse.json({ ok: true, termsVersion: TERMS_VERSION });
  }

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Sessao expirada.' }, { status: 401 });
  }

  const admin = createServiceClient();
  const acceptedAt = new Date().toISOString();
  const profileUpdate: Database['public']['Tables']['profiles']['Update'] = {
    terms_accepted_at: acceptedAt,
    terms_version: TERMS_VERSION,
    privacy_accepted_at: acceptedAt,
  };

  try {
    Object.assign(profileUpdate, buildProfileIdentityPiiUpdate({
      name: getDisplayNameFromUser(user),
      email: user.email ?? null,
    }));
    const metadataPhone = user.user_metadata?.phone as string | undefined;
    if (metadataPhone) {
      Object.assign(profileUpdate, buildProfilePhonePiiUpdate(metadataPhone));
    }
  } catch {
    console.error('[terms:accept] PII sync skipped: crypto env unavailable');
  }

  const { error } = await admin
    .from('profiles')
    .update(profileUpdate)
    .eq('id', user.id);

  if (error) {
    console.error('[terms:accept]', error);
    return NextResponse.json(
      { ok: false, error: 'Nao foi possivel registrar seu aceite.' },
      { status: 500 },
    );
  }

  revalidateTag(cacheTags.profile(user.id), { expire: 0 });
  return NextResponse.json({ ok: true, termsVersion: TERMS_VERSION });
}
