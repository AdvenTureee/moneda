'use client';

export type MoVariant = 'idle' | 'happy' | 'sad' | 'thinking';

export interface MoProps {
  variant?: MoVariant;
  size?: number;
  className?: string;
  pupilX?: number;
  pupilY?: number;
  eyesClosed?: boolean;
}

const PALETTE = {
  coinBase: '#FACC15',
  coinShadow: '#A16207',
  blush: '#F43F5E',
  ink: '#1C1917',
  esclera: '#FAFAF9',
};

export default function Mo({
  variant = 'idle',
  size = 80,
  className = '',
  pupilX = 0,
  pupilY = 0,
  eyesClosed = false,
}: MoProps) {
  // Pupil tracking — clamp into [-1, 1] then translate within the eye.
  const px = Math.max(-1, Math.min(1, pupilX)) * 2.2;
  const py = Math.max(-1, Math.min(1, pupilY)) * 3.2;

  const leftEyeCx = 38;
  const rightEyeCx = 62;
  const eyeCy = 36;
  const eyeRx = 8;
  const eyeRy = 10;
  const pupilR = 4;

  const pupilLeftCx = leftEyeCx + px;
  const pupilRightCx = rightEyeCx + px;
  // Pupil rests slightly below center for a "looking up" cute expression.
  const pupilCy = eyeCy + 1.6 + py;



  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden
      role="img"
    >
      {/* Coin edge (back disc, darker — shows the thickness on the right/bottom) */}
      <circle
        cx={55}
        cy={44}
        r={32}
        fill={PALETTE.coinShadow}
        stroke={PALETTE.ink}
        strokeWidth={2.8}
      />

      {/* Stubby legs — between disc and front face */}
      <path
        d="M 42,72 Q 41,80 41,87"
        stroke={PALETTE.ink}
        strokeWidth={6.5}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 58,72 Q 59,80 59,87"
        stroke={PALETTE.ink}
        strokeWidth={6.5}
        strokeLinecap="round"
        fill="none"
      />

      {/* Stubby arms — between disc and front face */}
      <path
        d="M 21,52 Q 16,57 13,61"
        stroke={PALETTE.ink}
        strokeWidth={5.5}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 79,52 Q 84,57 89,61"
        stroke={PALETTE.ink}
        strokeWidth={5.5}
        strokeLinecap="round"
        fill="none"
      />

      {/* Main coin face — solid flat yellow */}
      <circle
        cx={50}
        cy={42}
        r={32}
        fill={PALETTE.coinBase}
        stroke={PALETTE.ink}
        strokeWidth={2.8}
      />

      {/* Cheeks (pastel blush, 30% opacity) */}
      <ellipse cx={28} cy={48} rx={6} ry={4.5} fill={PALETTE.blush} opacity={0.35} />
      <ellipse cx={72} cy={48} rx={6} ry={4.5} fill={PALETTE.blush} opacity={0.35} />

      {/* Eyebrows — small floating arches above each eye */}
      <path
        d="M 33,25 Q 38,22 43,25"
        stroke={PALETTE.ink}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 67,25 Q 62,22 57,25"
        stroke={PALETTE.ink}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />

      {/* Eyes — closed slits or open with whites/pupils */}
      {eyesClosed ? (
        <g>
          <path d="M 33,36 Q 38,39 43,36" stroke={PALETTE.ink} strokeWidth={2} strokeLinecap="round" fill="none" />
          <path d="M 57,36 Q 62,39 67,36" stroke={PALETTE.ink} strokeWidth={2} strokeLinecap="round" fill="none" />
        </g>
      ) : (
        <>
      {/* Eye whites — tall ovals (Cuphead-style) */}
      <ellipse
        cx={leftEyeCx}
        cy={eyeCy}
        rx={eyeRx}
        ry={eyeRy}
        fill={PALETTE.esclera}
        stroke={PALETTE.ink}
        strokeWidth={1.9}
      />
      <ellipse
        cx={rightEyeCx}
        cy={eyeCy}
        rx={eyeRx}
        ry={eyeRy}
        fill={PALETTE.esclera}
        stroke={PALETTE.ink}
        strokeWidth={1.9}
      />
      {/* Eye highlights — sparkle dots for a cuter glassy look */}
      <circle cx={leftEyeCx - 2.5} cy={eyeCy - 3} r={2} fill="white" />
      <circle cx={rightEyeCx - 2.5} cy={eyeCy - 3} r={2} fill="white" />

      {/* Pupils — pie-eye (default) or cifrão for the happy variant */}
      {variant === 'happy' ? (
        <g fontFamily="ui-sans-serif, system-ui, sans-serif">
          <text
            x={leftEyeCx}
            y={eyeCy + 3.8}
            textAnchor="middle"
            fontSize={11}
            fontWeight={900}
            fill={PALETTE.ink}
          >
            $
          </text>
          <text
            x={rightEyeCx}
            y={eyeCy + 3.8}
            textAnchor="middle"
            fontSize={11}
            fontWeight={900}
            fill={PALETTE.ink}
          >
            $
          </text>
        </g>
      ) : (
        <g>
          <circle cx={pupilLeftCx} cy={pupilCy} r={pupilR} fill={PALETTE.ink} />
          <circle cx={pupilRightCx} cy={pupilCy} r={pupilR} fill={PALETTE.ink} />
        </g>
      )}
      </>)}

      {/* Smile — always cheerful, gentle upward curve */}
      <path
        d="M 40,52 Q 50,61 60,52"
        stroke={PALETTE.ink}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />

      {/* Floating "?" for thinking variant */}
      {variant === 'thinking' && (
        <g fontFamily="ui-sans-serif, system-ui, sans-serif">
          <text
            x={84}
            y={14}
            fontSize={14}
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
