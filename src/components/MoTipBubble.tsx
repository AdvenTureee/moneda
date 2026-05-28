'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Icon from './Icon';
import { MO_TIPS, getGreeting } from '@/data/moTips';

const ROTATION_MS = 14000;
const FADE_MS = 180;

function pickRandomIndex(exclude: number): number {
  if (MO_TIPS.length <= 1) return 0;
  let next = exclude;
  while (next === exclude) {
    next = Math.floor(Math.random() * MO_TIPS.length);
  }
  return next;
}

export default function MoTipBubble() {
  const greeting = getGreeting();
  const [greetingShown, setGreetingShown] = useState(false);
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<number | null>(null);
  const fadeRef = useRef<number | null>(null);

  const advance = useCallback(() => {
    setFading(true);
    if (fadeRef.current !== null) window.clearTimeout(fadeRef.current);
    fadeRef.current = window.setTimeout(() => {
      if (!greetingShown) {
        setGreetingShown(true);
      }
      setIndex((current) => pickRandomIndex(current));
      setFading(false);
    }, FADE_MS);
  }, [greetingShown]);

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

  const tip = greetingShown ? MO_TIPS[index] : greeting;

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
