'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Mo from '@/components/Mo';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  /** Desabilita o gesto (útil em telas onde puxar conflita com outro scroll). */
  disabled?: boolean;
}

const THRESHOLD = 80;          // px de puxada para "armar" o refresh
const MAX_PULL = 140;          // px máximo do conteúdo deslocar
const RESISTANCE = 0.5;        // razão pra parecer elástico
const RELEASE_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

type Phase = 'idle' | 'pulling' | 'refreshing';

/**
 * Pull-to-refresh com animação do Mo. Detecta touch na borda superior
 * (scrollY === 0), aplica resistência elástica, dispara onRefresh ao
 * cruzar o threshold.
 */
export default function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');

  const setPullThrottled = useCallback((next: number) => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setPull(next);
    });
  }, []);

  useEffect(() => {
    if (disabled) return;

    const onTouchStart = (e: TouchEvent) => {
      // Só arma quando estamos no topo absoluto.
      if (window.scrollY > 0) return;
      if (phase === 'refreshing') return;
      startYRef.current = e.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (e: TouchEvent) => {
      const startY = startYRef.current;
      if (startY === null) return;
      if (phase === 'refreshing') return;
      const dy = (e.touches[0]?.clientY ?? startY) - startY;
      if (dy <= 0) {
        setPullThrottled(0);
        return;
      }
      // Resistência elástica + cap em MAX_PULL.
      const eased = Math.min(dy * RESISTANCE, MAX_PULL);
      setPullThrottled(eased);
      if (phase !== 'pulling') setPhase('pulling');
      // Bloqueia scroll do browser enquanto puxa pra baixo no topo.
      if (e.cancelable) e.preventDefault();
    };

    const onTouchEnd = async () => {
      const startY = startYRef.current;
      startYRef.current = null;
      if (startY === null || phase === 'refreshing') return;
      if (pull >= THRESHOLD) {
        setPhase('refreshing');
        // Trava o conteúdo num indent menor durante o refresh.
        setPull(THRESHOLD);
        try {
          await onRefresh();
        } finally {
          setPhase('idle');
          setPull(0);
        }
      } else {
        // Volta sem disparar.
        setPhase('idle');
        setPull(0);
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [disabled, phase, pull, onRefresh, setPullThrottled]);

  const armed = pull >= THRESHOLD;
  const isRefreshing = phase === 'refreshing';
  const indicatorOpacity = Math.min(pull / THRESHOLD, 1);
  // Rotação leve enquanto puxa (até armar). Em refresh, sem rotação — bounce CSS cuida.
  const rotation = isRefreshing ? 0 : Math.min(pull * 2, 180);

  const transitionStyle =
    phase === 'pulling'
      ? 'none'
      : `transform 250ms ${RELEASE_EASE}, opacity 250ms ${RELEASE_EASE}`;

  const label = isRefreshing
    ? 'Atualizando…'
    : armed
      ? 'Solte pra atualizar'
      : 'Puxe pra atualizar';

  return (
    <div ref={containerRef} className="relative" style={{ overscrollBehavior: 'contain' }}>
      {/* Indicador (Mo) — posicionado absoluto no topo, "vive" acima do conteúdo */}
      <div
        className="absolute left-0 right-0 flex flex-col items-center justify-end pointer-events-none"
        style={{
          top: 0,
          height: THRESHOLD,
          transform: `translateY(${pull - THRESHOLD}px)`,
          opacity: indicatorOpacity,
          transition: transitionStyle,
        }}
        aria-live="polite"
        aria-atomic="true"
      >
        <div
          className={isRefreshing ? 'animate-bounce-in' : ''}
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: phase === 'pulling' ? 'none' : `transform 250ms ${RELEASE_EASE}`,
          }}
        >
          <Mo variant={armed || isRefreshing ? 'happy' : 'thinking'} size={56} />
        </div>
        <p className="text-[11px] font-medium text-[#6B7280] mt-1">{label}</p>
      </div>

      {/* Conteúdo desloca pra baixo com a puxada */}
      <div
        style={{
          transform: `translateY(${pull}px)`,
          transition: transitionStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}
