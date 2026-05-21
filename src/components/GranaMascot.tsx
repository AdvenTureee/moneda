'use client';

import { useId } from 'react';

export type GranaMascotVariant = 'idle' | 'happy' | 'sad' | 'thinking';

export interface GranaMascotProps {
  variant?: GranaMascotVariant;
  size?: number;
  className?: string;
  pupilX?: number;
  pupilY?: number;
}

const PALETTE = {
  coinBase: '#EAB308',
  coinShadow: '#A16207',
  coinHighlight: '#F4C842',
  blush: '#F43F5E',
  ink: '#1C1917',
  esclera: '#FAFAF9',
};

export default function GranaMascot({
  variant = 'idle',
  size = 80,
  className = '',
  pupilX = 0,
  pupilY = 0,
}: GranaMascotProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  // Pupil tracking — clamp into [-1, 1] then translate within the eye.
  const px = Math.max(-1, Math.min(1, pupilX)) * 1.3;
  const py = Math.max(-1, Math.min(1, pupilY)) * 1.6;

  const leftEyeCx = 43;
  const rightEyeCx = 57;
  const eyeCy = 29;
  const eyeRx = 4;
  const eyeRy = 5;
  const pupilR = 1.9;

  const pupilLeftCx = leftEyeCx + px;
  const pupilRightCx = rightEyeCx + px;
  const pupilCy = eyeCy + py;

  // Mouth shape per variant. Frown = control point ABOVE corners (low y).
  // Smile = control point BELOW corners (high y).
  const mouthByVariant: Record<GranaMascotVariant, { d: string; cornerY: number; cornerLen: number; leftX: number; rightX: number }> = {
    idle:     { d: 'M 46,42 Q 50,38.5 54,42', cornerY: 42,   cornerLen: 1.4, leftX: 46, rightX: 54 },
    sad:      { d: 'M 45,43 Q 50,36.5 55,43', cornerY: 43,   cornerLen: 2.0, leftX: 45, rightX: 55 },
    thinking: { d: 'M 46,42 Q 50,40   54,42', cornerY: 42,   cornerLen: 1.2, leftX: 46, rightX: 54 },
    happy:    { d: 'M 45,41 Q 50,40.5 55,38', cornerY: 41.5, cornerLen: 0.8, leftX: 45, rightX: 55 },
  };
  const mouth = mouthByVariant[variant];

  // Eyebrows: concerned = inner tips raised (tilt up to center).
  // Happy = relaxed (slight outward lift).
  const eyebrowTiltLeft = variant === 'happy' ? 12 : -22;
  const eyebrowTiltRight = variant === 'happy' ? -12 : 22;
  const eyebrowY = 22;

  // Inner-eye highlight (pie-eye notch) — upper-right quadrant cut-out.
  const piePath = (cx: number, cy: number) =>
    `M ${cx},${cy} L ${cx + pupilR},${cy} A ${pupilR},${pupilR} 0 0 0 ${cx},${cy - pupilR} Z`;

  // Arc paths for coin text. Top arc curves UP (∩), bottom arc curves DOWN (∪).
  const topArcId = `arc-top-${uid}`;
  const bottomArcId = `arc-bot-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden
      role="img"
    >
      <defs>
        <radialGradient id={`coin-${uid}`} cx="40%" cy="32%" r="68%">
          <stop offset="0%" stopColor={PALETTE.coinHighlight} />
          <stop offset="55%" stopColor={PALETTE.coinBase} />
          <stop offset="100%" stopColor="#C68F0B" />
        </radialGradient>

        <path id={topArcId} d="M 35,29 Q 50,16 65,29" />
        <path id={bottomArcId} d="M 36,40 Q 50,51 64,40" />
      </defs>

      {/* Ground shadow */}
      <ellipse cx={50} cy={91} rx={26} ry={2.6} fill="rgba(0,0,0,0.18)" />

      {/* Legs (rubber hose — no joints, uniform stroke, rounded ends) */}
      <path
        d="M 44.5,49 Q 41.5,68 42,86"
        stroke={PALETTE.ink}
        strokeWidth={5.2}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 55.5,49 Q 58.5,68 58,86"
        stroke={PALETTE.ink}
        strokeWidth={5.2}
        strokeLinecap="round"
        fill="none"
      />
      {/* Feet — rounded blobs (no shoes) */}
      <ellipse cx={42} cy={87.5} rx={5.6} ry={2.7} fill={PALETTE.ink} />
      <ellipse cx={58} cy={87.5} rx={5.6} ry={2.7} fill={PALETTE.ink} />

      {/* Arms (rubber hose) */}
      <path
        d="M 32.5,37 Q 25,46 22.5,53"
        stroke={PALETTE.ink}
        strokeWidth={4.4}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 67.5,37 Q 75,46 77.5,53"
        stroke={PALETTE.ink}
        strokeWidth={4.4}
        strokeLinecap="round"
        fill="none"
      />
      {/* Hands — rounded blobs (no gloves, no fingers) */}
      <circle cx={22.5} cy={53} r={3.6} fill={PALETTE.ink} />
      <circle cx={77.5} cy={53} r={3.6} fill={PALETTE.ink} />

      {/* Coin — vintage print bleed (offset yellow behind main coin) */}
      <circle cx={51.4} cy={31.2} r={21} fill={PALETTE.coinBase} opacity={0.55} />
      {/* Coin body */}
      <circle
        cx={50}
        cy={30}
        r={21}
        fill={`url(#coin-${uid})`}
        stroke={PALETTE.ink}
        strokeWidth={2.4}
      />
      {/* Inner debossed rim */}
      <circle
        cx={50}
        cy={30}
        r={17.5}
        fill="none"
        stroke={PALETTE.coinShadow}
        strokeWidth={0.9}
        opacity={0.75}
      />

      {/* Coin text (curved, debossed look) */}
      <text
        fill={PALETTE.coinShadow}
        fontSize={3.1}
        fontWeight={900}
        letterSpacing={0.5}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        <textPath href={`#${topArcId}`} startOffset="50%" textAnchor="middle">
          REPÚBLICA
        </textPath>
      </text>
      <text
        fill={PALETTE.coinShadow}
        fontSize={3.1}
        fontWeight={900}
        letterSpacing={0.5}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        <textPath href={`#${bottomArcId}`} startOffset="50%" textAnchor="middle">
          BRASIL
        </textPath>
      </text>

      {/* Cheeks (pastel blush at 30% opacity) */}
      <ellipse cx={37} cy={34} rx={3} ry={1.6} fill={PALETTE.blush} opacity={0.3} />
      <ellipse cx={63} cy={34} rx={3} ry={1.6} fill={PALETTE.blush} opacity={0.3} />

      {/* Eyebrows — floating teardrops, tilted by mood */}
      <ellipse
        cx={40}
        cy={eyebrowY}
        rx={3.4}
        ry={1.2}
        fill={PALETTE.ink}
        transform={`rotate(${eyebrowTiltLeft} 40 ${eyebrowY})`}
      />
      <ellipse
        cx={60}
        cy={eyebrowY}
        rx={3.4}
        ry={1.2}
        fill={PALETTE.ink}
        transform={`rotate(${eyebrowTiltRight} 60 ${eyebrowY})`}
      />

      {/* Eye whites */}
      <ellipse
        cx={leftEyeCx}
        cy={eyeCy}
        rx={eyeRx}
        ry={eyeRy}
        fill={PALETTE.esclera}
        stroke={PALETTE.ink}
        strokeWidth={1.4}
      />
      <ellipse
        cx={rightEyeCx}
        cy={eyeCy}
        rx={eyeRx}
        ry={eyeRy}
        fill={PALETTE.esclera}
        stroke={PALETTE.ink}
        strokeWidth={1.4}
      />

      {/* Pupils — pie-eye (with notch) for normal moods, cifrão for success */}
      {variant === 'happy' ? (
        <g fontFamily="ui-sans-serif, system-ui, sans-serif">
          <text
            x={leftEyeCx}
            y={eyeCy + 2.2}
            textAnchor="middle"
            fontSize={6.4}
            fontWeight={900}
            fill={PALETTE.ink}
          >
            $
          </text>
          <text
            x={rightEyeCx}
            y={eyeCy + 2.2}
            textAnchor="middle"
            fontSize={6.4}
            fontWeight={900}
            fill={PALETTE.ink}
          >
            $
          </text>
        </g>
      ) : (
        <g>
          <circle cx={pupilLeftCx} cy={pupilCy} r={pupilR} fill={PALETTE.ink} />
          <path d={piePath(pupilLeftCx, pupilCy)} fill={PALETTE.esclera} />
          <circle cx={pupilRightCx} cy={pupilCy} r={pupilR} fill={PALETTE.ink} />
          <path d={piePath(pupilRightCx, pupilCy)} fill={PALETTE.esclera} />
        </g>
      )}

      {/* Mouth (trembling line) */}
      <path
        d={mouth.d}
        stroke={PALETTE.ink}
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
      {/* Corner expression marks (marionette-style) */}
      <line
        x1={mouth.leftX}
        y1={mouth.cornerY}
        x2={mouth.leftX}
        y2={mouth.cornerY + mouth.cornerLen}
        stroke={PALETTE.ink}
        strokeWidth={1}
        strokeLinecap="round"
      />
      <line
        x1={mouth.rightX}
        y1={mouth.cornerY}
        x2={mouth.rightX}
        y2={mouth.cornerY + mouth.cornerLen}
        stroke={PALETTE.ink}
        strokeWidth={1}
        strokeLinecap="round"
      />

      {/* Floating "?" for thinking variant */}
      {variant === 'thinking' && (
        <g fontFamily="ui-sans-serif, system-ui, sans-serif">
          <text
            x={78}
            y={16}
            fontSize={13}
            fontWeight={900}
            fill={PALETTE.ink}
          >
            ?
          </text>
        </g>
      )}
    </svg>
  );
}
