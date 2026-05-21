'use client';

import { useMemo, useId } from 'react';

export interface GranaMascotProps {
  variant?: 'idle' | 'happy' | 'sad' | 'thinking';
  size?: number;
  className?: string;
  pupilX?: number;
  pupilY?: number;
}

const PW = 8;
const PR = 3.5;
const MAX_DX = 5;
const MAX_DY = 3.5;

function Pupil({ cx, cy, x, y, id }: { cx: number; cy: number; x: number; y: number; id: string }) {
  const px = cx + x * MAX_DX;
  const py = cy + y * MAX_DY;
  return (
    <g>
      <clipPath id={`clip-${id}`}>
        <circle cx={cx} cy={cy} r={PW} />
      </clipPath>
      <circle cx={px} cy={py} r={PR} fill="#1A1D23" clipPath={`url(#clip-${id})`} />
      <circle cx={px - 1} cy={py - 1} r={1.2} fill="white" opacity="0.6" />
    </g>
  );
}

export default function GranaMascot({
  variant = 'idle',
  size = 80,
  className = '',
  pupilX = 0,
  pupilY = 0,
}: GranaMascotProps) {
  const uid = useId();

  const tracking = variant !== 'thinking';

  const px = tracking ? pupilX : 0;
  const py = tracking ? pupilY : 0;

  const face = useMemo(() => {
    switch (variant) {
      case 'happy':
        return (
          <g>
            <path d="M25 36 Q33 31 41 36" fill="none" stroke="#1A1D23" strokeWidth="2" strokeLinecap="round" />
            <path d="M59 36 Q67 31 75 36" fill="none" stroke="#1A1D23" strokeWidth="2" strokeLinecap="round" />
            <Pupil cx={33} cy={44} x={px} y={py} id={`hl-${uid}`} />
            <Pupil cx={67} cy={44} x={px} y={py} id={`hr-${uid}`} />
            <circle cx="24" cy="51" r="5.5" fill="#FFB3B3" opacity="0.4" />
            <circle cx="76" cy="51" r="5.5" fill="#FFB3B3" opacity="0.4" />
            <path d="M33 58 Q50 71 67 58" fill="none" stroke="#1A1D23" strokeWidth="2.5" strokeLinecap="round" />
            {[0, 1, 2].map((i) => (
              <line
                key={i}
                x1={20 + i * 30}
                y1={23}
                x2={24 + i * 30}
                y2={28}
                stroke="#F0A855"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.5"
                transform={`rotate(${i * 10 - 10}, ${22 + i * 30}, 25)`}
              />
            ))}
          </g>
        );
      case 'sad':
        return (
          <g>
            <path d="M25 39 Q33 44 41 39" fill="none" stroke="#1A1D23" strokeWidth="2" strokeLinecap="round" />
            <path d="M59 39 Q67 44 75 39" fill="none" stroke="#1A1D23" strokeWidth="2" strokeLinecap="round" />
            <Pupil cx={33} cy={45} x={px} y={py} id={`sl-${uid}`} />
            <Pupil cx={67} cy={45} x={px} y={py} id={`sr-${uid}`} />
            <path d="M40 62 Q50 55 60 62" fill="none" stroke="#1A1D23" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M76 52 Q80 59 76 64" fill="none" stroke="#7AAECF" strokeWidth="2" strokeLinecap="round" />
          </g>
        );
      case 'thinking':
        return (
          <g>
            <circle cx="33" cy="44" r="4" fill="#1A1D23" />
            <path d="M64 44 Q67 47 70 44" fill="none" stroke="#1A1D23" strokeWidth="2.5" strokeLinecap="round" />
            <ellipse cx="50" cy="61" rx="2.5" ry="3.5" fill="#1A1D23" />
            <text x="80" y="28" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold" fontSize="14" fill="#A8C5E0">?</text>
          </g>
        );
      default:
        return (
          <g>
            <Pupil cx={33} cy={44} x={px} y={py} id={`nl-${uid}`} />
            <Pupil cx={67} cy={44} x={px} y={py} id={`nr-${uid}`} />
            <path d="M37 57 Q50 63 63 57" fill="none" stroke="#1A1D23" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        );
    }
  }, [variant, px, py, uid]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden
    >
      <defs>
        <radialGradient id={`cg-${uid}`} cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#F5C542" />
          <stop offset="100%" stopColor="#B8860B" />
        </radialGradient>
        <pattern id={`rm-${uid}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#A0761A" strokeWidth="0.4" />
        </pattern>
      </defs>

      <ellipse cx="50" cy="54" rx="44" ry="44" fill="rgba(0,0,0,0.07)" />

      <circle cx="50" cy="48" r="44" fill={`url(#cg-${uid})`} stroke="#8B6914" strokeWidth="2" />

      <circle cx="50" cy="48" r="43" fill={`url(#rm-${uid})`} opacity="0.08" />

      <circle cx="50" cy="48" r="38" fill="none" stroke="#A0761A" strokeWidth="1.5" opacity="0.25" />
      <circle cx="50" cy="48" r="36.5" fill="none" stroke="#A0761A" strokeWidth="0.5" opacity="0.15" />

      <path d="M 12 12 A 38 38 0 0 1 38 10" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="20" cy="14" r="2" fill="rgba(255,255,255,0.15)" />

      {face}

      <g stroke="#1A1D23" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M 8 58 Q 0 72 14 82" strokeWidth="3" />
        <g strokeWidth="1.5">
          <line x1="14" y1="82" x2="18" y2="78" />
          <line x1="14" y1="82" x2="20" y2="81" />
          <line x1="14" y1="82" x2="18" y2="85" />
          <line x1="14" y1="82" x2="13" y2="86" />
        </g>
        <circle cx="18" cy="78" r="0.8" fill="#1A1D23" stroke="none" />
        <circle cx="20" cy="81" r="0.8" fill="#1A1D23" stroke="none" />
        <circle cx="18" cy="85" r="0.8" fill="#1A1D23" stroke="none" />
        <circle cx="13" cy="86" r="0.8" fill="#1A1D23" stroke="none" />

        <path d="M 92 58 Q 100 72 86 82" strokeWidth="3" />
        <g strokeWidth="1.5">
          <line x1="86" y1="82" x2="82" y2="78" />
          <line x1="86" y1="82" x2="80" y2="81" />
          <line x1="86" y1="82" x2="82" y2="85" />
          <line x1="86" y1="82" x2="87" y2="86" />
        </g>
        <circle cx="82" cy="78" r="0.8" fill="#1A1D23" stroke="none" />
        <circle cx="80" cy="81" r="0.8" fill="#1A1D23" stroke="none" />
        <circle cx="82" cy="85" r="0.8" fill="#1A1D23" stroke="none" />
        <circle cx="87" cy="86" r="0.8" fill="#1A1D23" stroke="none" />

        <path d="M 37 90 L 35 99 L 30 100" strokeWidth="2.5" />
        <path d="M 63 90 L 65 99 L 70 100" strokeWidth="2.5" />
      </g>
    </svg>
  );
}
