import { NextRequest, NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/supabase/server';
import { categorizeWithAI } from '@/lib/groq';
import { CATEGORIES } from '@/data/mock';

export async function POST(req: NextRequest) {
  try {
    const session = await createSessionClient();
    const { data: { user } } = await session.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY não configurada.' }, { status: 500 });
    }

    const { text } = await req.json();
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Texto inválido.' }, { status: 400 });
    }

    const categoryId = await categorizeWithAI(text.trim(), CATEGORIES);

    const category = CATEGORIES.find((c) => c.id === categoryId);
    return NextResponse.json({
      categoryId,
      categoryName: category?.name ?? 'Outros',
    });
  } catch {
    return NextResponse.json({ error: 'Erro ao categorizar.' }, { status: 500 });
  }
}
