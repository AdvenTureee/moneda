import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PRIVATE_NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate, private',
  Pragma: 'no-cache',
  Expires: '0',
} as const;

function withPrivateNoStore(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(PRIVATE_NO_STORE_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // IMPORTANT: Do not add any code between createServerClient and getUser().
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthCallback = pathname.startsWith('/auth/callback');
  const isPasswordRecovery = pathname === '/redefinir-senha';
  const isHomeRoute = pathname === '/';
  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/auth/');
  const isPublicRoute = isHomeRoute || isAuthRoute || isPasswordRecovery;

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return withPrivateNoStore(NextResponse.redirect(url));
  }

  if (user && isAuthRoute && !isAuthCallback) {
    const url = request.nextUrl.clone();
    url.pathname = '/feed';
    return withPrivateNoStore(NextResponse.redirect(url));
  }

  return withPrivateNoStore(supabaseResponse);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
