'use client';

import { useEffect, useState, useMemo } from 'react';

const COLORS = ['#5BBF8E', '#A8C5E0', '#F0A855', '#F5C542', '#7AAECF'];
const PARTICLE_COUNT = 24;

interface Particle {
  id: number;
  x: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  rotation: number;
}

interface ConfettiProps {
  trigger?: boolean;
  /** When set, the confetti only fires once per browser tab (sessionStorage gate). */
  sessionKey?: string;
  delayMs?: number;
}

export default function Confetti({ trigger, sessionKey, delayMs = 0 }: ConfettiProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    const startTimer = window.setTimeout(() => {
      if (sessionKey) {
        if (window.sessionStorage.getItem(sessionKey)) return;
        window.sessionStorage.setItem(sessionKey, '1');
      }
      setShow(true);
    }, delayMs);
    const stopTimer = window.setTimeout(() => setShow(false), delayMs + 3000);
    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(stopTimer);
    };
  }, [trigger, sessionKey, delayMs]);

  const particles = useMemo<Particle[]>(() => {
    if (!show) return [];
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 8 + 4,
      delay: Math.random() * 0.3,
      duration: Math.random() * 1.2 + 1.5,
      rotation: Math.random() * 360,
    }));
  }, [show]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[60] pointer-events-none overflow-hidden"
      aria-hidden
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute top-0"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size * 1.5,
            backgroundColor: p.color,
            borderRadius: p.size > 6 ? '2px' : '50%',
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s both`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}
