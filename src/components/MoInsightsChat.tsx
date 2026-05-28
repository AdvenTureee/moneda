'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowClockwise, PaperPlaneTilt, Trash } from '@phosphor-icons/react';
import Mo from '@/components/Mo';
import type { ChatMessage, ChatHistoryItem } from '@/types/chat';

const SUGGESTIONS = [
  'Como estão meus gastos este mês?',
  'Onde posso economizar?',
  'Quais categorias mais pesam no meu orçamento?',
  'Me explique meu padrão de gastos.',
] as const;

function storageKey(period: string) {
  return `moneda-mo-chat-${period}`;
}

function loadMessages(period: string): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(storageKey(period));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMessages(period: string, messages: ChatMessage[]) {
  try {
    if (messages.length === 0) {
      sessionStorage.removeItem(storageKey(period));
      return;
    }
    sessionStorage.setItem(storageKey(period), JSON.stringify(messages.slice(-40)));
  } catch {
    // quota ou modo privado
  }
}

function clearStoredMessages(period: string) {
  try {
    sessionStorage.removeItem(storageKey(period));
  } catch {
    // ignore
  }
}

function newMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

type StreamResult = {
  reply: string;
  followUps: string[];
  error?: string;
};

async function consumeChatStream(
  res: Response,
  onDelta: (accumulated: string) => void,
  signal?: AbortSignal,
): Promise<StreamResult> {
  if (!res.ok && !res.body) {
    return { reply: '', followUps: [], error: 'Não foi possível obter resposta da Mo.' };
  }

  const reader = res.body?.getReader();
  if (!reader) {
    return { reply: '', followUps: [], error: 'Resposta vazia do servidor.' };
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let reply = '';
  let followUps: string[] = [];
  let error: string | undefined;

  while (true) {
    if (signal?.aborted) {
      await reader.cancel();
      throw new DOMException('Aborted', 'AbortError');
    }

    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6)) as {
          delta?: string;
          done?: boolean;
          reply?: string;
          followUps?: string[];
          error?: string;
        };
        if (data.error) error = data.error;
        if (data.delta) {
          reply += data.delta;
          onDelta(reply);
        }
        if (data.done) {
          if (data.reply) reply = data.reply;
          followUps = Array.isArray(data.followUps) ? data.followUps : [];
        }
      } catch {
        // ignora chunk malformado
      }
    }
  }

  if (!error && !reply.trim()) {
    error = 'Não foi possível obter resposta da Mo.';
  }

  return { reply, followUps, error };
}

interface MoInsightsChatProps {
  period: string;
  expenseCount: number;
}

export default function MoInsightsChat({
  period,
  expenseCount,
}: MoInsightsChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [pendingRetry, setPendingRetry] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMessages(loadMessages(period));
    setFollowUps([]);
    setPendingRetry(null);
    setError(null);
    setHydrated(true);
  }, [period]);

  useEffect(() => {
    if (!hydrated) return;
    saveMessages(period, messages);
  }, [messages, period, hydrated]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, followUps, scrollToBottom]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const resizeInput = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    resizeInput();
  }, [input, resizeInput]);

  async function sendMessage(text: string, options?: { appendUser?: boolean }) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const appendUser = options?.appendUser !== false;
    setError(null);
    setPendingRetry(null);
    setFollowUps([]);

    const userMsg = newMessage('user', trimmed);
    const assistantPlaceholder = newMessage('assistant', '');

    let historySource = messages;
    if (!appendUser && messages.at(-1)?.role === 'user') {
      historySource = messages.slice(0, -1);
    }
    const historyForApi: ChatHistoryItem[] = historySource.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    if (appendUser) {
      setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
    } else {
      setMessages((prev) => [...prev, assistantPlaceholder]);
    }

    setInput('');
    setLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period,
          message: trimmed,
          history: historyForApi,
        }),
        signal: abortRef.current.signal,
      });

      const result = await consumeChatStream(
        res,
        (accumulated) => {
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.role === 'assistant') {
              copy[copy.length - 1] = { ...last, content: accumulated };
            }
            return copy;
          });
        },
        abortRef.current.signal,
      );

      if (result.error) {
        setError(result.error);
        setPendingRetry(trimmed);
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === 'assistant' && !last.content.trim()) copy.pop();
          return copy;
        });
        return;
      }

      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === 'assistant') {
          copy[copy.length - 1] = { ...last, content: result.reply };
        }
        return copy;
      });
      setFollowUps(result.followUps);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError('Erro de conexão. Verifique sua internet e tente de novo.');
      setPendingRetry(trimmed);
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === 'assistant' && !last.content.trim()) copy.pop();
        return copy;
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleClearChat() {
    if (loading || messages.length === 0) return;
    abortRef.current?.abort();
    clearStoredMessages(period);
    setMessages([]);
    setFollowUps([]);
    setPendingRetry(null);
    setError(null);
    setInput('');
    inputRef.current?.focus();
  }

  function handleRetry() {
    if (!pendingRetry || loading) return;
    sendMessage(pendingRetry, { appendUser: false });
  }

  const canChat = expenseCount > 0;
  const showEmpty = hydrated && messages.length === 0 && !loading;
  const canClear = hydrated && messages.length > 0 && !loading;
  const showFollowUps =
    canChat && !loading && followUps.length > 0 && !pendingRetry;

  return (
    <section
      className="mo-insights-chat themed-card mb-6 animate-fade-up delay-1"
      aria-label="Chat com a Mo"
    >
      <header className="mo-insights-chat__header">
        <h2 className="mo-insights-chat__title text-sm font-heading text-[var(--color-text-primary)]">
          Pergunte para a Mo
        </h2>
        {canClear && (
          <button
            type="button"
            onClick={handleClearChat}
            className="mo-insights-chat__clear"
            aria-label="Limpar conversa"
          >
            <Trash size={16} weight="regular" aria-hidden />
            <span>Limpar</span>
          </button>
        )}
      </header>

      <div
        ref={scrollRef}
        className="mo-insights-chat__messages"
        role="log"
        aria-live="off"
        aria-relevant="additions"
      >
        {!canChat && (
          <div className="mo-insights-chat__empty">
            <div className="mo-insights-chat__mo-spotlight mo-insights-chat__mo-spotlight--lg">
              <Mo variant="thinking" portrait className="opacity-90" />
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] text-center">
              Cadastre gastos neste mês para a Mo analisar e responder suas perguntas.
            </p>
          </div>
        )}

        {canChat && showEmpty && (
          <div className="mo-insights-chat__empty">
            <div className="mo-insights-chat__mo-spotlight mo-insights-chat__mo-spotlight--lg">
              <Mo variant="happy" portrait />
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] text-center mb-4">
              Tire dúvidas sobre seus gastos, orçamento e hábitos.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={loading}
                  onClick={() => sendMessage(s)}
                  className="mo-insights-chat__chip"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {canChat &&
          messages.map((msg, index) => (
            <div
              key={msg.id}
              className={`mo-insights-chat__row mo-insights-chat__row--${msg.role}`}
              aria-live={index === messages.length - 1 && msg.role === 'assistant' ? 'polite' : undefined}
            >
              {msg.role === 'assistant' && (
                <div className="mo-insights-chat__avatar" aria-hidden>
                  <Mo
                    variant={loading && index === messages.length - 1 && !msg.content ? 'thinking' : 'idle'}
                    portrait
                  />
                </div>
              )}
              <div className={`mo-insights-chat__bubble mo-insights-chat__bubble--${msg.role}`}>
                <p className="mo-insights-chat__bubble-text">
                  {msg.content ||
                    (loading && index === messages.length - 1 ? (
                      <span className="mo-insights-chat__typing-inline">
                        <span className="mo-insights-chat__dot" />
                        <span className="mo-insights-chat__dot" />
                        <span className="mo-insights-chat__dot" />
                      </span>
                    ) : (
                      ''
                    ))}
                </p>
              </div>
            </div>
          ))}
      </div>

      {showFollowUps && (
        <div className="mo-insights-chat__followups">
          <p className="mo-insights-chat__followups-label">Continuar com:</p>
          <div className="flex flex-wrap gap-2">
            {followUps.map((s) => (
              <button
                key={s}
                type="button"
                disabled={loading}
                onClick={() => sendMessage(s)}
                className="mo-insights-chat__chip"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mo-insights-chat__error-row" role="alert">
          <p className="mo-insights-chat__error">{error}</p>
          {pendingRetry && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={loading}
              className="mo-insights-chat__retry"
            >
              <ArrowClockwise size={16} weight="bold" aria-hidden />
              Tentar de novo
            </button>
          )}
        </div>
      )}

      <form className="mo-insights-chat__composer" onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!canChat || loading}
          rows={1}
          placeholder={canChat ? 'Pergunte algo sobre suas finanças…' : 'Registre gastos para conversar'}
          className="mo-insights-chat__input themed-field"
          aria-label="Sua mensagem para a Mo"
        />
        <button
          type="submit"
          disabled={!canChat || loading || !input.trim()}
          className="mo-insights-chat__send"
          aria-label="Enviar mensagem"
        >
          <PaperPlaneTilt size={20} weight="fill" />
        </button>
      </form>
    </section>
  );
}
