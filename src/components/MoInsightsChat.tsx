'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PaperPlaneTilt } from '@phosphor-icons/react';
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
    sessionStorage.setItem(storageKey(period), JSON.stringify(messages.slice(-40)));
  } catch {
    // quota ou modo privado
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

interface MoInsightsChatProps {
  period: string;
  expenseCount: number;
}

export default function MoInsightsChat({ period, expenseCount }: MoInsightsChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessages(loadMessages(period));
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
  }, [messages, loading, scrollToBottom]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    const userMsg = newMessage('user', trimmed);
    const historyForApi: ChatHistoryItem[] = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period,
          message: trimmed,
          history: historyForApi.slice(0, -1),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível obter resposta da Mo.');
        return;
      }
      setMessages((prev) => [...prev, newMessage('assistant', data.reply ?? '')]);
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente de novo.');
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

  const canChat = expenseCount > 0;
  const showEmpty = hydrated && messages.length === 0 && !loading;

  return (
    <section
      className="mo-insights-chat themed-card mb-6 animate-fade-up delay-1"
      aria-label="Chat com a Mo"
    >
      <header className="mo-insights-chat__header">
        <div>
          <h2 className="text-sm font-heading text-[var(--color-text-primary)]">
            Pergunte para a Mo
          </h2>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
            Respostas com base só nos seus dados deste período.
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="mo-insights-chat__messages" role="log" aria-live="polite">
        {!canChat && (
          <div className="mo-insights-chat__empty">
            <Mo variant="thinking" size={72} className="mx-auto mb-2 opacity-90" />
            <p className="text-sm text-[var(--color-text-secondary)] text-center">
              Cadastre gastos neste mês para a Mo analisar e responder suas perguntas.
            </p>
          </div>
        )}

        {canChat && showEmpty && (
          <div className="mo-insights-chat__empty">
            <Mo variant="happy" size={80} className="mx-auto mb-2" />
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
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`mo-insights-chat__row mo-insights-chat__row--${msg.role}`}
            >
              {msg.role === 'assistant' && (
                <div className="mo-insights-chat__avatar" aria-hidden>
                  <Mo variant="idle" size={28} />
                </div>
              )}
              <div className={`mo-insights-chat__bubble mo-insights-chat__bubble--${msg.role}`}>
                <p className="mo-insights-chat__bubble-text">{msg.content}</p>
              </div>
            </div>
          ))}

        {loading && (
          <div className="mo-insights-chat__row mo-insights-chat__row--assistant">
            <div className="mo-insights-chat__avatar" aria-hidden>
              <Mo variant="thinking" size={28} />
            </div>
            <div className="mo-insights-chat__bubble mo-insights-chat__bubble--assistant mo-insights-chat__bubble--typing">
              <span className="mo-insights-chat__dot" />
              <span className="mo-insights-chat__dot" />
              <span className="mo-insights-chat__dot" />
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mo-insights-chat__error" role="alert">
          {error}
        </p>
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
