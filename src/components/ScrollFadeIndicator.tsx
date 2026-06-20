'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

const END_THRESHOLD = 12;
const WAVE_DURATION_MS = 900;
const TAB_SCROLL_RESET_SUPPRESSION_MS = 250;

type Boundary = 'top' | 'bottom';

export default function ScrollFadeIndicator() {
  const [waveKey, setWaveKey] = useState(0);
  const [boundary, setBoundary] = useState<Boundary | null>(null);
  const hasScrolledAwayFromTopRef = useRef(false);
  const wasAtTopRef = useRef(true);
  const wasAtEndRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const ignoreTopWaveUntilRef = useRef(0);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setBoundary(null);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const shell = document.querySelector<HTMLElement>('.app-shell');
    scrollContainerRef.current = shell;
    const scrollTop = shell?.scrollTop ?? 0;
    const remaining = (shell?.scrollHeight ?? 0) - scrollTop - (shell?.clientHeight ?? window.innerHeight);
    const hasScrollableContent = (shell?.scrollHeight ?? 0) > (shell?.clientHeight ?? window.innerHeight) + END_THRESHOLD;

    hasScrolledAwayFromTopRef.current = hasScrollableContent && scrollTop > END_THRESHOLD;
    wasAtTopRef.current = hasScrollableContent && scrollTop <= END_THRESHOLD;
    wasAtEndRef.current = hasScrollableContent && remaining <= END_THRESHOLD;
  }, [pathname]);

  useEffect(() => {
    function triggerWave(nextBoundary: Boundary) {
      setWaveKey((key) => key + 1);
      setBoundary(nextBoundary);

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setBoundary(null);
      }, WAVE_DURATION_MS);
    }

    function suppressTopWave() {
      ignoreTopWaveUntilRef.current = performance.now() + TAB_SCROLL_RESET_SUPPRESSION_MS;
      setBoundary(null);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    function update() {
      const shell = scrollContainerRef.current ?? document.querySelector<HTMLElement>('.app-shell');
      if (!shell) return;

      const scrollTop = shell.scrollTop;
      const remaining = shell.scrollHeight - scrollTop - shell.clientHeight;
      const hasScrollableContent = shell.scrollHeight > shell.clientHeight + END_THRESHOLD;
      const isAtTop = hasScrollableContent && scrollTop <= END_THRESHOLD;
      const isAtEnd = hasScrollableContent && remaining <= END_THRESHOLD;

      if (hasScrollableContent && scrollTop > END_THRESHOLD) {
        hasScrolledAwayFromTopRef.current = true;
      }

      if (isAtTop && !wasAtTopRef.current && hasScrolledAwayFromTopRef.current) {
        if (performance.now() >= ignoreTopWaveUntilRef.current) {
          triggerWave('top');
        }
      }

      if (isAtEnd && !wasAtEndRef.current) {
        triggerWave('bottom');
      }

      wasAtTopRef.current = isAtTop;
      wasAtEndRef.current = isAtEnd;
    }

    update();
    const shell = scrollContainerRef.current ?? document.querySelector<HTMLElement>('.app-shell');
    shell?.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('moneda:tab-scroll-reset', suppressTopWave);
    const ro = new ResizeObserver(update);
    if (shell) ro.observe(shell);

    return () => {
      shell?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('moneda:tab-scroll-reset', suppressTopWave);
      ro.disconnect();
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!boundary) return null;

  return (
    <div
      key={waveKey}
      aria-hidden
      className={`scroll-boundary-wave scroll-boundary-wave--${boundary}`}
    />
  );
}
