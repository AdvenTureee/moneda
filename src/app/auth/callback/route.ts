import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (!code) {
    console.error('[auth/callback] missing code param', { url: request.url });
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
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
    console.error('[auth/callback] exchangeCodeForSession failed', error);
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  return response;
}
