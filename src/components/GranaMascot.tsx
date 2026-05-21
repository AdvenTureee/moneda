'use client';

import { useRef } from 'react';

export interface GranaMascotProps {
  variant?: 'idle' | 'happy' | 'sad' | 'thinking';
  size?: number;
  className?: string;
  pupilX?: number;
  pupilY?: number;
}

export default function GranaMascot({
  variant = 'idle',
  size = 80,
  className = '',
}: GranaMascotProps) {
  const uid = useRef(`g-${Math.random().toString(36).slice(2, 6)}`).current;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={`sh-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EAB308" />
          <stop offset="100%" stopColor="#A16207" />
        </linearGradient>
      </defs>

      <ellipse cx={50} cy={54} rx={44} ry={44} fill="rgba(0,0,0,0.07)" />

      <circle cx={50} cy={48} r={44} fill={`url(#sh-${uid})`} stroke="#1C1917" strokeWidth="2.5" />
    </svg>
  );
}
