import { NextRequest } from 'next/server';
import { createSessionClient } from '@/lib/supabase/server';
import { categorizeWithAI } from '@/lib/groq';
import { getCategories } from '@/lib/categories';
import { noStoreJson } from '@/lib/http';

export async function POST(req: NextRequest) {
  try {
    const session = await createSessionClient();
    const { data: { user } } = await session.auth.getUser();
    if (!user) {
      return noStoreJson({ error: 'Não autenticado.' }, { status: 401 });
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
