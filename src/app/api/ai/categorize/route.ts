import { NextRequest } from 'next/server';
import { createSessionClient } from '@/lib/supabase/server';
import { categorizeWithAI } from '@/lib/groq';
import { getCategories } from '@/lib/categories';
import { noStoreJson } from '@/lib/http';
import { consumeRateLimit } from '@/lib/rateLimit';

const CATEGORIZE_LIMIT_PER_MINUTE = 30;

export async function POST(req: NextRequest) {
  try {
    const session = await createSessionClient();
    const { data: { user } } = await session.auth.getUser();
    if (!user) {
      return noStoreJson({ error: 'Não autenticado.' }, { status: 401 });
    }

    const rate = await consumeRateLimit({
      key: `api:ai:categorize:${user.id}`,
      limit: CATEGORIZE_LIMIT_PER_MINUTE,
    });
    if (!rate.ok) {
      return noStoreJson(
        { error: `Muitas tentativas. Aguarde ${rate.retryAfterSec}s e tente de novo.` },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } },
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return noStoreJson({ error: 'GROQ_API_KEY não configurada.' }, { status: 500 });
    }

    const { text } = await req.json();
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return noStoreJson({ error: 'Texto inválido.' }, { status: 400 });
    }

    const categories = await getCategories(user.id);
    const categoryId = await categorizeWithAI(text.trim(), categories);

    const category = categories.find((c) => c.id === categoryId);
    return noStoreJson({
      categoryId,
      categoryName: category?.name ?? 'Outros',
    });
  } catch {
    return noStoreJson({ error: 'Erro ao categorizar.' }, { status: 500 });
  }
}
