'use client';

import { useRef, useEffect, useState } from 'react';
import Mo from './Mo';
import type { MoProps } from './Mo';

export default function TrackedMascot(props: MoProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pupilX, setPupilX] = useState(0);
  const [pupilY, setPupilY] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        let clientX: number, clientY: number;
        if ('touches' in e) {
          if (e.touches.length === 0) return;
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        } else {
          clientX = e.clientX;
          clientY = e.clientY;
        }

        const sensitivity = Math.max(rect.width * 2, 200);
        const dx = (clientX - cx) / sensitivity;
        const dy = (clientY - cy) / sensitivity;

        setPupilX(Math.max(-1, Math.min(1, dx)));
        setPupilY(Math.max(-1, Math.min(1, dy)));
      });
    };

    const handleLeave = () => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        setPupilX(0);
        setPupilY(0);
      });
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('mouseleave', handleLeave);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  return (
    <span ref={ref} className="inline-block">
      <Mo {...props} pupilX={pupilX} pupilY={pupilY} />
    </span>
  );
}
