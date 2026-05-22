'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Icon from './Icon';
import { MO_TIPS } from '@/data/moTips';

const ROTATION_MS = 8000;
const FADE_MS = 250;

function pickRandomIndex(exclude: number): number {
  if (MO_TIPS.length <= 1) return 0;
  let next = exclude;
  while (next === exclude) {
    next = Math.floor(Math.random() * MO_TIPS.length);
  }
  return next;
}

export default function MoTipBubble() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * MO_TIPS.length));
  const [fading, setFading] = useState(false);
  const timerRef = useRef<number | null>(null);
  const fadeRef = useRef<number | null>(null);

  const advance = useCallback(() => {
    setFading(true);
    if (fadeRef.current !== null) window.clearTimeout(fadeRef.current);
    fadeRef.current = window.setTimeout(() => {
      setIndex((current) => pickRandomIndex(current));
      setFading(false);
    }, FADE_MS);
  }, []);

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

  const tip = MO_TIPS[index];
  const isFinance = tip.kind === 'finance';

  const handleClick = () => {
    advance();
    scheduleNext();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="relative w-full text-left bg-white rounded-[14px] px-4 py-3 mb-5 animate-fade-up delay-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8C5E0]"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      aria-label="Toque para a próxima dica da Mo"
    >
      {/* Cauda do balão — quadrado branco rotacionado, apontando para a Mo no header acima */}
      <span
        aria-hidden
        className="absolute -top-1.5 left-10 w-3 h-3 bg-white rotate-45"
      />
      <div
        className="relative flex items-start gap-2"
        role="status"
        aria-live="polite"
      >
        <Icon
          name={isFinance ? 'TrendUp' : 'Lightbulb'}
          size={18}
          className={`shrink-0 mt-0.5 ${isFinance ? 'text-[#5BBF8E]' : 'text-[#E0B040]'}`}
        />
        <p
          className="text-sm text-[#1A1D23] leading-snug"
          style={{ transition: `opacity ${FADE_MS}ms ease`, opacity: fading ? 0 : 1 }}
        >
          {tip.text}
        </p>
      </div>
    </button>
  );
}
