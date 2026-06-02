import { NextRequest } from 'next/server';
import { createSessionClient } from '@/lib/supabase/server';
import { getCachedFinancialContextBlockForChat } from '@/lib/moFinancialContext';
import { suggestMoChatFollowUps } from '@/lib/moChatFollowUps';
import { buildMoChatMessages, streamMoChatReply } from '@/lib/groq';
import { checkRateLimit, pruneRateLimitBuckets } from '@/lib/rateLimit';
import { getBillingClosingDay } from '@/lib/profiles';
import { getCurrentBillingPeriod } from '@/lib/billingCycle';
import type { ChatHistoryItem } from '@/types/chat';

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const CHAT_LIMIT_PER_MINUTE = 12;

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

function sseLine(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const session = await createSessionClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (!user) {
      return new Response(sseLine({ error: 'Não autenticado.' }), {
        status: 401,
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
      });
    }

    if (!process.env.GROQ_API_KEY) {
      return new Response(sseLine({ error: 'Serviço de IA indisponível.' }), {
        status: 500,
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
      });
    }

    pruneRateLimitBuckets();
    const rate = checkRateLimit(`mo-chat:${user.id}`, CHAT_LIMIT_PER_MINUTE);
    if (!rate.ok) {
      return new Response(
        sseLine({
          error: `Muitas mensagens em pouco tempo. Aguarde ${rate.retryAfterSec}s e tente de novo.`,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Retry-After': String(rate.retryAfterSec),
          },
        },
      );
    }

    const body = await req.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message || message.length > 800) {
      return new Response(sseLine({ error: 'Mensagem inválida.' }), {
        status: 400,
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
      });
    }

    const rawPeriod = body.period;
    const closingDay = await getBillingClosingDay(user.id);
    const period =
      typeof rawPeriod === 'string' && PERIOD_RE.test(rawPeriod)
        ? rawPeriod
        : getCurrentBillingPeriod(closingDay);

    const history = sanitizeHistory(body.history);
    const contextBlock = await getCachedFinancialContextBlockForChat(user, period);
    const messages = buildMoChatMessages(message, contextBlock, history);

    const stream = new ReadableStream({
      async start(controller) {
        let fullReply = '';
        try {
          for await (const delta of streamMoChatReply(messages)) {
            fullReply += delta;
            controller.enqueue(encoder.encode(sseLine({ delta })));
          }

          const reply =
            fullReply.trim() ||
            'Não consegui montar uma resposta agora. Tente reformular a pergunta.';
          const followUps = suggestMoChatFollowUps(message, reply);

          controller.enqueue(
            encoder.encode(
              sseLine({
                done: true,
                reply: reply.slice(0, 2000),
                period,
                followUps,
              }),
            ),
          );
        } catch {
          controller.enqueue(
            encoder.encode(
              sseLine({
                error: 'Erro ao conversar com a Mo. Tente novamente.',
              }),
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch {
    return new Response(sseLine({ error: 'Erro interno. Tente novamente.' }), {
      status: 500,
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
    });
  }
}
