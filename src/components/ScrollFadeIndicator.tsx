'use client';

import { useEffect, useRef, useState } from 'react';

const END_THRESHOLD = 12;
const WAVE_DURATION_MS = 900;

type Boundary = 'top' | 'bottom';

export default function ScrollFadeIndicator() {
  const [waveKey, setWaveKey] = useState(0);
  const [boundary, setBoundary] = useState<Boundary | null>(null);
  const hasScrolledAwayFromTopRef = useRef(false);
  const wasAtTopRef = useRef(true);
  const wasAtEndRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

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

    function update() {
      const doc = document.documentElement;
      const scrollY = window.scrollY;
      const remaining = doc.scrollHeight - window.scrollY - window.innerHeight;
      const hasScrollableContent = doc.scrollHeight > window.innerHeight + END_THRESHOLD;
      const isAtTop = hasScrollableContent && scrollY <= END_THRESHOLD;
      const isAtEnd = hasScrollableContent && remaining <= END_THRESHOLD;

      if (hasScrollableContent && scrollY > END_THRESHOLD) {
        hasScrolledAwayFromTopRef.current = true;
      }

      if (isAtTop && !wasAtTopRef.current && hasScrolledAwayFromTopRef.current) {
        triggerWave('top');
      }

      if (isAtEnd && !wasAtEndRef.current) {
        triggerWave('bottom');
      }

      wasAtTopRef.current = isAtTop;
      wasAtEndRef.current = isAtEnd;
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    const ro = new ResizeObserver(update);
    ro.observe(document.body);

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
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
