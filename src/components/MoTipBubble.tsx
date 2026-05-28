'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Icon from './Icon';
import { MO_TIPS, getGreeting, type MoTip } from '@/data/moTips';

const ROTATION_MS = 14000;
const FADE_MS = 180;

function pickRandomIndex(exclude: number, poolSize: number): number {
  if (poolSize <= 1) return 0;
  let next = exclude;
  while (next === exclude) {
    next = Math.floor(Math.random() * poolSize);
  }
  return next;
}

interface MoTipBubbleProps {
  period: string;
}

export default function MoTipBubble({ period }: MoTipBubbleProps) {
  const greeting = getGreeting();
  const [greetingShown, setGreetingShown] = useState(false);
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const [personalTips, setPersonalTips] = useState<MoTip[]>([]);
  const timerRef = useRef<number | null>(null);
  const fadeRef = useRef<number | null>(null);

  const tipPool = useMemo(
    () => (personalTips.length > 0 ? [...personalTips, ...MO_TIPS] : MO_TIPS),
    [personalTips],
  );

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadPersonalTips() {
      try {
        const res = await fetch(`/api/ai/mo-tips?period=${encodeURIComponent(period)}`, {
          signal: controller.signal,
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { tips?: MoTip[] };
        if (!cancelled && Array.isArray(data.tips) && data.tips.length > 0) {
          setPersonalTips(data.tips);
        }
      } catch {
        // mantém apenas dicas padrão
      }
    }

    loadPersonalTips();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [period]);

  const advance = useCallback(() => {
    setFading(true);
    if (fadeRef.current !== null) window.clearTimeout(fadeRef.current);
    fadeRef.current = window.setTimeout(() => {
      if (!greetingShown) {
        setGreetingShown(true);
      }
      setIndex((current) => pickRandomIndex(current, tipPool.length));
      setFading(false);
    }, FADE_MS);
  }, [greetingShown, tipPool.length]);

  const scheduleNext = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(function tick() {
      advance();
      timerRef.current = window.setTimeout(tick, ROTATION_MS);
    }, ROTATION_MS);
  }, [advance]);

  useEffect(() => {
    scheduleNext();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        scheduleNext();
      } else if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (fadeRef.current !== null) window.clearTimeout(fadeRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [scheduleNext]);

  const tip = greetingShown ? tipPool[index] ?? MO_TIPS[0] : greeting;

  const handleClick = () => {
    advance();
    scheduleNext();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="mo-tip-bubble group w-full text-left transition-transform duration-150 active:scale-[0.995] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8C5E0] focus-visible:ring-offset-2"
      aria-label="Toque para a próxima dica da Mo"
    >
      <div
        key={tip.id}
        className="mo-tip-bubble__content"
        role="status"
        aria-live="polite"
        style={{
          animation: fading ? undefined : `mo-tip-enter ${FADE_MS}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
          transition: `opacity ${FADE_MS}ms ease`,
          opacity: fading ? 0 : 1,
        }}
      >
        <p className="mo-tip-bubble__text">
          <span aria-hidden className="mo-tip-bubble__badge">
            <Icon name="ChatText" size={16} />
          </span>
          <span>{tip.text}</span>
        </p>
      </div>
      <style>{`
        @keyframes mo-tip-enter {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </button>
  );
}
