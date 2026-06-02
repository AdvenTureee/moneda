'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Icon from './Icon';
import { MO_TIPS, getGreeting, type MoTip } from '@/data/moTips';

const ROTATION_MS = 14000;
const FADE_MS = 180;
const EXIT_MS = 220;
const GREETING_MS = 1500;
const DEFAULT_AUTO_DISMISS_MS = 6800;
const personalTipsCache = new Map<string, MoTip[]>();
const personalTipsRequestCache = new Map<string, Promise<MoTip[]>>();

function pickRandomIndex(exclude: number, poolSize: number): number {
  if (poolSize <= 1) return 0;
  let next = exclude;
  while (next === exclude) {
    next = Math.floor(Math.random() * poolSize);
  }
  return next;
}

function pickRandomTip(pool: MoTip[], excludeId?: string): MoTip {
  if (pool.length === 0) return MO_TIPS[0];
  const candidates = excludeId ? pool.filter((tip) => tip.id !== excludeId) : pool;
  const source = candidates.length > 0 ? candidates : pool;
  return source[Math.floor(Math.random() * source.length)] ?? source[0] ?? MO_TIPS[0];
}

interface MoTipBubbleProps {
  period: string;
  variant?: 'default' | 'overlay';
  onDismiss?: () => void;
  advanceToken?: number;
  autoRotate?: boolean;
  startWithTip?: boolean;
  autoDismissMs?: number;
  initialTip?: MoTip;
  fetchPersonalTips?: boolean;
  showGreetingBeforeTip?: boolean;
}

export default function MoTipBubble({
  period,
  variant = 'default',
  onDismiss,
  advanceToken = 0,
  autoRotate = true,
  startWithTip = false,
  autoDismissMs = DEFAULT_AUTO_DISMISS_MS,
  initialTip,
  fetchPersonalTips = true,
  showGreetingBeforeTip = false,
}: MoTipBubbleProps) {
  const greeting = getGreeting();
  const [greetingShown, setGreetingShown] = useState(startWithTip);
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [personalTips, setPersonalTips] = useState<MoTip[]>([]);
  const [clickOnlyTip, setClickOnlyTip] = useState<MoTip | null>(() =>
    initialTip ?? (startWithTip ? pickRandomTip(MO_TIPS) : null),
  );
  const timerRef = useRef<number | null>(null);
  const fadeRef = useRef<number | null>(null);
  const exitRef = useRef<number | null>(null);
  const greetingRef = useRef<number | null>(null);
  const handledAdvanceTokenRef = useRef(0);
  const tipPoolRef = useRef<MoTip[]>(MO_TIPS);
  const tipPoolSizeRef = useRef(0);
  const clickOnlyTipRef = useRef<MoTip | null>(clickOnlyTip);
  const clickOnlyMode = Boolean(onDismiss) && !autoRotate;

  const tipPool = useMemo(
    () => (personalTips.length > 0 ? [...personalTips, ...MO_TIPS] : MO_TIPS),
    [personalTips],
  );

  useEffect(() => {
    tipPoolRef.current = tipPool;
    tipPoolSizeRef.current = tipPool.length;
  }, [tipPool]);

  useEffect(() => {
    clickOnlyTipRef.current = clickOnlyTip;
  }, [clickOnlyTip]);

  useEffect(() => {
    if (!fetchPersonalTips) return;
    let cancelled = false;

    async function loadPersonalTips() {
      const cached = personalTipsCache.get(period);
      if (cached) {
        setPersonalTips(cached);
        return;
      }

      try {
        let request = personalTipsRequestCache.get(period);
        if (!request) {
          request = fetch(`/api/ai/mo-tips?period=${encodeURIComponent(period)}`)
            .then(async (res) => {
              if (!res.ok) return [];
              const data = (await res.json()) as { tips?: MoTip[] };
              return Array.isArray(data.tips) ? data.tips : [];
            })
            .then((tips) => {
              if (tips.length > 0) personalTipsCache.set(period, tips);
              personalTipsRequestCache.delete(period);
              return tips;
            })
            .catch(() => {
              personalTipsRequestCache.delete(period);
              return [];
            });
          personalTipsRequestCache.set(period, request);
        }

        const tips = await request;
        if (!cancelled && tips.length > 0) {
          setPersonalTips(tips);
        }
      } catch {
        // mantém apenas dicas padrão
      }
    }

    loadPersonalTips();
    return () => {
      cancelled = true;
    };
  }, [fetchPersonalTips, period]);

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
    if (!autoRotate) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(function tick() {
      advance();
      timerRef.current = window.setTimeout(tick, ROTATION_MS);
    }, ROTATION_MS);
  }, [advance, autoRotate]);

  const requestDismiss = useCallback(() => {
    if (!onDismiss) return;
    setExiting(true);
    if (exitRef.current !== null) window.clearTimeout(exitRef.current);
    if (greetingRef.current !== null) {
      window.clearTimeout(greetingRef.current);
      greetingRef.current = null;
    }
    exitRef.current = window.setTimeout(() => {
      exitRef.current = null;
      onDismiss();
    }, EXIT_MS);
  }, [onDismiss]);

  useEffect(() => {
    if (!autoRotate) return;
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
      if (exitRef.current !== null) window.clearTimeout(exitRef.current);
      if (greetingRef.current !== null) window.clearTimeout(greetingRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [autoRotate, scheduleNext]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (fadeRef.current !== null) window.clearTimeout(fadeRef.current);
      if (exitRef.current !== null) window.clearTimeout(exitRef.current);
      if (greetingRef.current !== null) window.clearTimeout(greetingRef.current);
    };
  }, []);

  useEffect(() => {
    if (advanceToken <= 0) return;
    if (handledAdvanceTokenRef.current === advanceToken) return;
    handledAdvanceTokenRef.current = advanceToken;
    if (exitRef.current !== null) {
      window.clearTimeout(exitRef.current);
      exitRef.current = null;
    }
    setExiting(false);
    setFading(false);
    if (clickOnlyMode) {
      if (greetingRef.current !== null) window.clearTimeout(greetingRef.current);
      setClickOnlyTip(pickRandomTip(tipPoolRef.current, clickOnlyTipRef.current?.id));
      if (showGreetingBeforeTip) {
        setGreetingShown(false);
        greetingRef.current = window.setTimeout(() => {
          setFading(true);
          fadeRef.current = window.setTimeout(() => {
            setGreetingShown(true);
            setFading(false);
          }, FADE_MS);
        }, GREETING_MS);
      } else {
        setGreetingShown(true);
      }
      return;
    }
    setGreetingShown(true);
    setIndex((current) => pickRandomIndex(current, tipPoolSizeRef.current));
  }, [advanceToken, clickOnlyMode]);

  useEffect(() => {
    if (!onDismiss || !autoDismissMs || autoDismissMs <= 0) return;
    const dismissTimer = window.setTimeout(requestDismiss, autoDismissMs);
    return () => window.clearTimeout(dismissTimer);
  }, [advanceToken, autoDismissMs, onDismiss, requestDismiss]);

  const tip = clickOnlyMode
    ? showGreetingBeforeTip && !greetingShown
      ? greeting
      : clickOnlyTip ?? MO_TIPS[0]
    : greetingShown
      ? tipPool[index] ?? MO_TIPS[0]
      : greeting;

  const handleClick = () => {
    if (onDismiss) {
      requestDismiss();
      return;
    }
    advance();
    scheduleNext();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`mo-tip-bubble group w-full text-left transition-transform duration-150 active:scale-[0.995] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8C5E0] focus-visible:ring-offset-2 ${
        variant === 'overlay' ? 'mo-tip-bubble--overlay' : ''
      } ${
        exiting ? 'mo-tip-bubble--exiting' : ''
      }`}
      aria-label={onDismiss ? 'Ocultar dica da Mo' : 'Toque para a próxima dica da Mo'}
    >
      <div
        key={tip.id}
        className="mo-tip-bubble__content"
        role="status"
        aria-live="polite"
        style={{
          animation: fading
            ? undefined
            : `${variant === 'overlay' ? 'mo-tip-overlay-enter' : 'mo-tip-enter'} ${FADE_MS}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
          transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
          opacity: fading ? 0 : 1,
          transform: fading
            ? variant === 'overlay'
              ? 'translateY(6px) scale(0.98)'
              : 'translateY(4px)'
            : undefined,
        }}
      >
        <p className="mo-tip-bubble__text">
          <span aria-hidden className="mo-tip-bubble__badge">
            <Icon name="ChatText" size={16} />
          </span>
          <span className="mo-tip-bubble__message" title={tip.text}>
            {tip.text}
          </span>
        </p>
      </div>
      <style>{`
        @keyframes mo-tip-enter {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes mo-tip-overlay-enter {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .mo-tip-bubble__content {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </button>
  );
}
