'use client';

import { useEffect, useState } from 'react';

const FADE_HEIGHT = 56;
const RAMP_DISTANCE = 80;

export default function ScrollFadeIndicator() {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    function update() {
      const doc = document.documentElement;
      const remaining = doc.scrollHeight - window.scrollY - window.innerHeight;
      const next = Math.max(0, Math.min(1, remaining / RAMP_DISTANCE));
      setOpacity(next);
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
    };
  }, []);

  return (
    <div
      aria-hidden
      className="fixed left-0 right-0 pointer-events-none z-30 transition-opacity duration-150"
      style={{
        height: FADE_HEIGHT,
        bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
        opacity,
        background:
          'linear-gradient(to bottom, rgba(248, 249, 251, 0) 0%, rgba(248, 249, 251, 1) 100%)',
      }}
    />
  );
}
