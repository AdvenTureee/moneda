import { NextRequest, NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/supabase/server';
import { buildMoFinancialContext, formatFinancialContextForChat } from '@/lib/moFinancialContext';
import { replyMoChat } from '@/lib/groq';
import { getCurrentPeriod } from '@/lib/utils';
import type { ChatHistoryItem } from '@/types/chat';

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function sanitizeHistory(raw: unknown): ChatHistoryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is ChatHistoryItem =>
        typeof m === 'object' &&
        m !== null &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof (m as ChatHistoryItem).content === 'string',
    )
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, 1200),
    }))
    .slice(-8);
}

export async function POST(req: NextRequest) {
  try {
    const session = await createSessionClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY não configurada.' }, { status: 500 });
    }

    const body = await req.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message || message.length > 800) {
      return NextResponse.json({ error: 'Mensagem inválida.' }, { status: 400 });
    }

    const rawPeriod = body.period;
    const period =
      typeof rawPeriod === 'string' && PERIOD_RE.test(rawPeriod)
        ? rawPeriod
        : getCurrentPeriod();

    const history = sanitizeHistory(body.history);

    const ctx = await buildMoFinancialContext(user, period);
    const contextBlock = formatFinancialContextForChat(ctx, period);

    const { reply, promptTokens, completionTokens } = await replyMoChat(
      message,
      contextBlock,
      history,
    );

    return NextResponse.json({
      reply,
      period,
      usage: { promptTokens, completionTokens },
    });
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: `Erro ao conversar com a Mo: ${errMessage}` }, { status: 500 });
  }
}
