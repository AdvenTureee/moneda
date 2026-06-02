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

export async function POST() {
  if (!isSupabaseEnabled()) {
    return NextResponse.json({ ok: true });
  }

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Sessão expirada.' }, { status: 401 });
  }

  const admin = createServiceClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('terms_accepted_at, terms_version')
    .eq('id', user.id)
    .single();
  if (!profile?.terms_accepted_at || profile.terms_version !== TERMS_VERSION) {
    return NextResponse.json(
      { ok: false, error: 'Aceite os termos antes de sincronizar o perfil.' },
      { status: 403 },
    );
  }

  let piiUpdate: ReturnType<typeof buildProfileIdentityPiiUpdate> &
    Partial<ReturnType<typeof buildProfilePhonePiiUpdate>>;
  try {
    piiUpdate = buildProfileIdentityPiiUpdate({
      name: getDisplayNameFromUser(user),
      email: user.email ?? null,
    });
    const metadataPhone = user.user_metadata?.phone as string | undefined;
    if (metadataPhone) {
      Object.assign(piiUpdate, buildProfilePhonePiiUpdate(metadataPhone));
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Configuração de proteção de dados indisponível.' },
      { status: 500 },
    );
  }

  const { error } = await admin
    .from('profiles')
    .update(piiUpdate)
    .eq('id', user.id);

  if (error) {
    console.error('[pii:sync-profile]', { message: error.message, code: error.code });
    return NextResponse.json(
      { ok: false, error: 'Não foi possível proteger seu perfil.' },
      { status: 500 },
    );
  }

  revalidateTag(cacheTags.profile(user.id), { expire: 0 });
  return NextResponse.json({ ok: true });
}
