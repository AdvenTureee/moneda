import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { revalidateTag } from 'next/cache';
import { cacheTags } from '@/lib/cache';
import { TERMS_VERSION } from '@/lib/legal';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const shouldRegisterTerms =
    searchParams.get('terms_accepted') === '1' &&
    searchParams.get('terms_version') === TERMS_VERSION;
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

  if (shouldRegisterTerms) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const acceptedAt = new Date().toISOString();
      const admin = createServiceClient();
      const { error: profileError } = await admin
        .from('profiles')
        .update({
          terms_accepted_at: acceptedAt,
          terms_version: TERMS_VERSION,
          privacy_accepted_at: acceptedAt,
        })
        .eq('id', user.id);
      if (profileError) {
        console.error('[auth/callback] terms acceptance update failed', profileError);
      } else {
        revalidateTag(cacheTags.profile(user.id), { expire: 0 });
      }
    }
  }

  return response;
}
