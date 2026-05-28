import { NextRequest, NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/supabase/server';
import { getPersonalizedMoTips } from '@/lib/moTipsPersonal';
import { getCurrentPeriod } from '@/lib/utils';

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function GET(req: NextRequest) {
  try {
    const session = await createSessionClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const rawPeriod = req.nextUrl.searchParams.get('period');
    const period = rawPeriod && PERIOD_RE.test(rawPeriod) ? rawPeriod : getCurrentPeriod();

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ tips: [], period, personalized: false });
    }

    const tips = await getPersonalizedMoTips(user, period);
    return NextResponse.json({ tips, period, personalized: tips.length > 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: `Erro ao gerar dicas: ${message}` }, { status: 500 });
  }
}
