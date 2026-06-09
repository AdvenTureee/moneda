import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { revalidateTag } from 'next/cache';
import { cacheTags } from '@/lib/cache';
import { TERMS_VERSION } from '@/lib/legal';
import { createServiceClient } from '@/lib/supabase/server';
import {
  buildProfileIdentityPiiUpdate,
  buildProfilePhonePiiUpdate,
  getDisplayNameFromUser,
} from '@/lib/security/profilePii';
import type { Database } from '@/types/supabase';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const requestedNext = searchParams.get('next');
  const next = !requestedNext || requestedNext === '/' ? '/app' : requestedNext;
  const isRecoveryNext = next.startsWith('/perfil/senha') && next.includes('recovery=1');
  // OAuth providers podem retornar erro direto (usuário cancelou, app não autorizado, etc.).
  const providerError = searchParams.get('error');
  const providerErrorDescription = searchParams.get('error_description');

  if (providerError) {
    console.error('[auth/callback] provider returned error', { providerError, providerErrorDescription });
    const reason = encodeURIComponent(providerErrorDescription || providerError);
    return NextResponse.redirect(`${origin}/login?error=oauth_provider&reason=${reason}`);
  }

  if (!code) {
    console.error('[auth/callback] missing code param', { url: request.url });
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  if (isRecoveryNext) {
    const resetUrl = new URL('/redefinir-senha', origin);
    resetUrl.searchParams.set('code', code);
    return NextResponse.redirect(resetUrl);
  }

  // IMPORTANTE: criar a response antes do client e gravar os cookies de sessão
  // NELA, não no `request`. Caso contrário o browser nunca recebe os cookies
  // e o próximo request volta para /login via middleware.
  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed', {
      message: error.message,
      status: error.status,
      name: error.name,
    });
    const reason = encodeURIComponent(error.message || 'exchange_failed');
    return NextResponse.redirect(`${origin}/login?error=exchange_failed&reason=${reason}`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    try {
      const admin = createServiceClient();
      const { data: profile } = await admin
        .from('profiles')
        .select('terms_accepted_at, terms_version')
        .eq('id', user.id)
        .single();
      const canSyncPii =
        Boolean(profile?.terms_accepted_at) &&
        profile?.terms_version === TERMS_VERSION;

      if (canSyncPii) {
        const profileUpdate: Database['public']['Tables']['profiles']['Update'] = {};

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
          console.error('[auth/callback] PII sync skipped: crypto env unavailable');
        }

        if (Object.keys(profileUpdate).length > 0) {
          const { error: profileError } = await admin
            .from('profiles')
            .update(profileUpdate)
            .eq('id', user.id);
          if (profileError) {
            console.error('[auth/callback] profile sync failed', {
              message: profileError.message,
              code: profileError.code,
            });
          } else {
            revalidateTag(cacheTags.profile(user.id), { expire: 0 });
          }
        }
      }
    } catch {
      console.error('[auth/callback] profile sync skipped: service env unavailable');
    }
  }

  return response;
}
