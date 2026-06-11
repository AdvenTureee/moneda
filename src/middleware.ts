import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Rotas que exigem sessão ativa.
 * O matcher abaixo já filtra para estas rotas, mas a lista
 * torna a intenção explícita e facilita ajustes futuros.
 */
const PROTECTED_PREFIXES = ['/app', '/perfil', '/gastos', '/onboarding'];

/**
 * Rotas de API que exigem sessão.
 * Retorna 401 JSON em vez de redirect (adequado para fetch() do cliente).
 */
const PROTECTED_API_PREFIXES = [
  '/api/ai',
  '/api/categories',
  '/api/dashboard',
  '/api/expenses',
  '/api/export',
  '/api/pii',
  '/api/upload-avatar',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Passa direto se Supabase não estiver configurado (modo mock/dev sem .env)
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  // Cria o client do middleware — obrigatório para que o @supabase/ssr
  // possa refrescar o access token e propagar os cookies atualizados.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 1. Atualiza os cookies na request (lidos por Server Components).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // 2. Propaga os cookies na response para o browser.
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: usar getUser(), não getSession().
  // getSession() apenas lê o cookie local e não valida a sessão no servidor.
  // getUser() faz uma chamada à API do Supabase e garante que o token é válido.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // --- Proteção de rotas de API ---
  const isProtectedApi = PROTECTED_API_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  if (isProtectedApi && !user) {
    return NextResponse.json(
      { error: 'Não autorizado.' },
      { status: 401 },
    );
  }

  // --- Proteção de páginas ---
  const isProtectedPage = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  if (isProtectedPage && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    // Preserva o destino para redirecionar após o login.
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redireciona usuário autenticado que tenta acessar páginas de auth.
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/cadastro');
  if (isAuthPage && user) {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = '/app';
    appUrl.search = '';
    return NextResponse.redirect(appUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Executa em todas as rotas EXCETO:
     * - _next/static  (arquivos estáticos)
     * - _next/image   (otimização de imagem)
     * - favicon.ico, icon.svg, robots.txt, sitemap.xml
     * - arquivos com extensão (ex: .png, .jpg, .css, .js)
     *
     * O padrão negativo `(?!...)` exclui essas rotas do middleware
     * para não adicionar latência desnecessária.
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
};
