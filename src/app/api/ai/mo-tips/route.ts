import { NextRequest } from 'next/server';
import { createSessionClient } from '@/lib/supabase/server';
import { getPersonalizedMoTips } from '@/lib/moTipsPersonal';
import { getBillingClosingDay } from '@/lib/profiles';
import { getCurrentBillingPeriod } from '@/lib/billingCycle';
import { noStoreJson } from '@/lib/http';

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function GET(req: NextRequest) {
  try {
    const session = await createSessionClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (!user) {
      return noStoreJson({ error: 'Não autenticado.' }, { status: 401 });
    }

    const rawPeriod = req.nextUrl.searchParams.get('period');
    const closingDay = await getBillingClosingDay(user.id);
    const period = rawPeriod && PERIOD_RE.test(rawPeriod) ? rawPeriod : getCurrentBillingPeriod(closingDay);

    if (!process.env.GROQ_API_KEY) {
      return noStoreJson({ tips: [], period, personalized: false });
    }

    const tips = await getPersonalizedMoTips(user, period);
    return noStoreJson({ tips, period, personalized: tips.length > 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return noStoreJson({ error: `Erro ao gerar dicas: ${message}` }, { status: 500 });
  }
}
