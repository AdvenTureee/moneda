'use client';

import { useId } from 'react';

export type MoVariant = 'idle' | 'happy' | 'sad' | 'thinking';

export interface MoProps {
  variant?: MoVariant;
  size?: number;
  className?: string;
  /** Recorte só do rosto (avatar / foto de perfil). */
  portrait?: boolean;
  browX?: number;
  browY?: number;
  speaking?: boolean;
}

const PALETTE = {
  coinBase: '#FACC15',
  coinShadow: '#A16207',
  blush: '#F43F5E',
  ink: '#1C1917',
  esclera: '#FAFAF9',
  skateDeck: '#EF4444',
  skateWheel: '#374151',
  glasses: '#1E293B',
};

export default function MoSkate({
  variant = 'idle',
  size,
  className = '',
  portrait = false,
  browX = 0,
  browY = 0,
  speaking = false,
}: MoProps) {
  const resolvedSize = size ?? 100;
  const mouthClipId = `mo-mouth-${useId().replace(/:/g, '')}`;

  const faceFeatures = (
    <>
      <circle
        cx={50}
        cy={42}
        r={32}
        fill={PALETTE.coinBase}
        stroke={PALETTE.ink}
        strokeWidth={2.8}
      />
      <ellipse cx={28} cy={48} rx={6} ry={4.5} fill={PALETTE.blush} opacity={0.35} />
      <ellipse cx={72} cy={48} rx={6} ry={4.5} fill={PALETTE.blush} opacity={0.35} />

      <path
        d={`M ${33 - browX},${25 - browY} Q ${38 - browX},${22 - browY} ${43 - browX},${25 - browY}`}
        stroke={PALETTE.ink}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M ${67 + browX},${25 - browY} Q ${62 + browX},${22 - browY} ${57 + browX},${25 - browY}`}
        stroke={PALETTE.ink}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />

      <g id="sunglasses">
        <path d="M 24,36 L 76,36" stroke={PALETTE.ink} strokeWidth={4.5} strokeLinecap="round" />
        <path d="M 44,34 Q 50,32 56,34" stroke={PALETTE.ink} strokeWidth={3.5} strokeLinecap="round" fill="none" />

        <path
          d="M 25,33 L 45,33 Q 46,45 36,45 Q 24,45 25,33 Z"
          fill={PALETTE.glasses}
          stroke={PALETTE.ink}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <polygon points="28,35 32,35 29,42 26,42" fill="white" opacity={0.25} />

        <path
          d="M 55,33 L 75,33 Q 76,45 64,45 Q 54,45 55,33 Z"
          fill={PALETTE.glasses}
          stroke={PALETTE.ink}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <polygon points="58,35 62,35 59,42 56,42" fill="white" opacity={0.25} />
      </g>

      {speaking ? (
        <>
          <defs>
            <clipPath id={mouthClipId} clipPathUnits="userSpaceOnUse">
              <ellipse cx={50} cy={55} rx={5.8} ry={6.3} />
            </clipPath>
          </defs>
          <g transform="translate(-1 0)">
            <g className="mo-mouth-speaking">
            <ellipse cx={50} cy={55} rx={5.8} ry={6.3} fill={PALETTE.ink} />
            <path d="M 43.5,58.5 C 42.9,53.9 48.2,53.2 50,57.1 C 52.7,53.3 57.8,55.1 57,60.1 C 56.4,64.1 52.4,65.1 50.1,67.3 C 47.5,65 44.1,62.9 43.5,58.5 Z" fill={PALETTE.blush} clipPath={`url(#${mouthClipId})`} />
            <ellipse cx={50} cy={55} rx={5.8} ry={6.3} fill="none" stroke={PALETTE.ink} strokeWidth={1.8} />
            </g>
          </g>
        </>
      ) : (
        <>
          <path d="M 40,52 Q 50,61 60,52" stroke={PALETTE.ink} strokeWidth={2} strokeLinecap="round" fill="none" />
          <path d="M 38,49 Q 42,52 38,54" stroke={PALETTE.ink} strokeWidth={2} strokeLinecap="round" fill="none" />
          <path d="M 62,49 Q 58,52 62,54" stroke={PALETTE.ink} strokeWidth={2} strokeLinecap="round" fill="none" />
        </>
      )}
      {variant === 'thinking' && (
        <g fontFamily="ui-sans-serif, system-ui, sans-serif">
          <text x={72} y={16} fontSize={13} fontWeight={900} fill={PALETTE.ink}>?</text>
        </g>
      )}
    </>
  );

  if (portrait) {
    return (
      <svg
        {...(size != null ? { width: size, height: size } : {})}
        viewBox="15 7 70 70"
        preserveAspectRatio="xMidYMid slice"
        className={`mo-mascot mo-mascot--portrait ${className}`.trim()}
        aria-hidden
        role="img"
      >
        {faceFeatures}
      </svg>
    );
  }

  return (
    <svg
      width={resolvedSize}
      height={resolvedSize}
      viewBox="0 0 100 100"
      className={`mo-mascot ${className}`.trim()}
      aria-hidden
      role="img"
    >
      <style>{`
        @keyframes skate-ride {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-0.8px) rotate(0.5deg); }
          75% { transform: translateY(0.4px) rotate(-0.5deg); }
        }
        .animate-skate-ride {
          animation: skate-ride 0.4s linear infinite;
          transform-origin: 50px 75px;
        }
        @keyframes arm-balance-left {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-8deg); }
        }
        @keyframes arm-balance-right {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(8deg); }
        }
        .animate-arm-left {
          animation: arm-balance-left 1.2s ease-in-out infinite;
          transform-origin: 22px 55px;
        }
        .animate-arm-right {
          animation: arm-balance-right 1.2s ease-in-out infinite 0.2s;
          transform-origin: 78px 55px;
        }
        @keyframes leg-flex {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.94); }
        }
        .animate-leg-flex {
          animation: leg-flex 0.4s ease-in-out infinite;
          transform-origin: 56px 82px;
        }
        @keyframes leg-push {
          0% { transform: translate(0, 0) rotate(0deg); }
          30% { transform: translate(-4px, -3px) rotate(-15deg); }
          50% { transform: translate(2px, 2px) rotate(10deg); }
          70% { transform: translate(5px, 1px) rotate(5deg); }
        }
        .animate-leg-push {
          animation: leg-push 1.2s cubic-bezier(0.45, 0, 0.55, 1) infinite;
          transform-origin: 38px 72px;
        }
        .wind-line {
          stroke: #9CA3AF;
          stroke-width: 1.2;
          stroke-linecap: round;
          stroke-dasharray: 15 25;
          opacity: 0.42;
        }

        @keyframes mo-speaking-mouth {
          0%, 100% { transform: scaleY(0.95) scaleX(1); }
          50% { transform: scaleY(1.03) scaleX(0.98); }
        }
        .mo-mouth-speaking {
          animation: mo-speaking-mouth 520ms cubic-bezier(0.4, 0, 0.2, 1) infinite;
          transform-box: fill-box;
          transform-origin: center;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-skate-ride, .animate-arm-left, .animate-arm-right,
          .animate-leg-flex, .animate-leg-push, .wind-line, .mo-mouth-speaking {
            animation: none !important;
          }
        }
      `}</style>

      <line x1="90" y1="30" x2="10" y2="30" className="wind-line wl1" />
      <line x1="85" y1="60" x2="5" y2="60" className="wind-line wl2" />

      <g className="animate-skate-ride">
        <g id="skateboard">
          <rect x="28" y="85" width="6" height="3" fill="#9CA3AF" stroke={PALETTE.ink} strokeWidth={1.5} />
          <circle cx="27" cy="89" r="3.5" fill={PALETTE.skateWheel} stroke={PALETTE.ink} strokeWidth={1.5} />
          <circle cx="35" cy="89" r="3.5" fill={PALETTE.skateWheel} stroke={PALETTE.ink} strokeWidth={1.5} />

          <rect x="66" y="85" width="6" height="3" fill="#9CA3AF" stroke={PALETTE.ink} strokeWidth={1.5} />
          <circle cx="65" cy="89" r="3.5" fill={PALETTE.skateWheel} stroke={PALETTE.ink} strokeWidth={1.5} />
          <circle cx="73" cy="89" r="3.5" fill={PALETTE.skateWheel} stroke={PALETTE.ink} strokeWidth={1.5} />

          <path
            d="M 18,83 Q 20,81 25,82 L 75,82 Q 80,81 82,83 Q 84,85 81,85 L 19,85 Q 16,85 18,83 Z"
            fill={PALETTE.skateDeck}
            stroke={PALETTE.ink}
            strokeWidth={1.8}
          />
        </g>

        <circle
          cx={55}
          cy={44}
          r={32}
          fill={PALETTE.coinShadow}
          stroke={PALETTE.ink}
          strokeWidth={2.8}
        />

        <g className="animate-leg-push">
          <path d="M 38,72 Q 30,78 34,84 Q 31,86 28,86" stroke={PALETTE.ink} strokeWidth={6.5} strokeLinecap="round" fill="none" />
        </g>

        <g className="animate-leg-flex">
          <path d="M 56,71 L 56,82" stroke={PALETTE.ink} strokeWidth={6.5} strokeLinecap="round" fill="none" />
        </g>

        <g className="animate-arm-left">
          <path d="M 22,52 Q 12,54 6,56" stroke={PALETTE.ink} strokeWidth={5.5} strokeLinecap="round" fill="none" />
        </g>

        <g className="animate-arm-right">
          <path d="M 78,52 Q 88,51 94,50" stroke={PALETTE.ink} strokeWidth={5.5} strokeLinecap="round" fill="none" />
        </g>

        {faceFeatures}
      </g>
    </svg>
  );
}
