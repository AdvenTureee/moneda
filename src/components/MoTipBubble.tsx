'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Icon from './Icon';
import { MO_TIPS, getGreeting } from '@/data/moTips';

const ROTATION_MS = 14000;
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
  const iconName = tip.kind === 'finance' ? 'TrendUp' : 'Lightbulb';
  const iconColor = tip.kind === 'finance' ? 'text-[#5BBF8E]' : 'text-[#E0B040]';

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
          name={iconName}
          size={18}
          className={`shrink-0 mt-0.5 ${iconColor}`}
        />
        <p
          className="text-sm text-[#1A1D23] leading-snug"
          style={{ transition: `opacity ${FADE_MS}ms ease`, opacity: fading ? 0 : 1 }}
        >
          {tip.text}
        </p>
      </div>
      {/* Ícone sutil "toque" no canto inferior direito */}
      <span aria-hidden className="absolute bottom-1 right-2 opacity-30">
        <Icon name="HandTap" size={16} />
      </span>
    </button>
  );
}
