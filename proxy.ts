import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAuthCookieOptions } from '@/lib/supabase/cookies';

const PRIVATE_NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate, private',
  Pragma: 'no-cache',
  Expires: '0',
} as const;

const PUBLIC_ROUTES = new Set(['/', '/redefinir-senha']);
const AUTH_ROUTES = new Set(['/login', '/signup']);
const PROTECTED_PAGE_PREFIXES = ['/app', '/feed', '/insights', '/perfil', '/onboarding'];

function withPrivateNoStore(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(PRIVATE_NO_STORE_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PAGE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.has(pathname) || pathname.startsWith('/auth/callback');
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith('/api/');
  const isAuthRoute = AUTH_ROUTES.has(pathname);

  if (!isApiRoute && !isAuthRoute && isPublicRoute(pathname)) {
    return NextResponse.next({ request });
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: supabaseAuthCookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options ?? {});
          });
          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value);
          });
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  if (!user && isApiRoute) {
    return withPrivateNoStore(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
  }

  if (!user && isProtectedPage(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return withPrivateNoStore(NextResponse.redirect(url));
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/app';
    url.search = '';
    return withPrivateNoStore(NextResponse.redirect(url));
  }

  if (user && (isApiRoute || isProtectedPage(pathname))) {
    return withPrivateNoStore(supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
};
