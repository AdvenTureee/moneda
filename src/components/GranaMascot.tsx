'use client';

export type GranaMascotVariant = 'idle' | 'happy' | 'sad' | 'thinking';

export interface GranaMascotProps {
  variant?: GranaMascotVariant;
  size?: number;
  className?: string;
  pupilX?: number;
  pupilY?: number;
}

const PALETTE = {
  coinBase: '#FACC15',
  coinShadow: '#A16207',
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
  // Pupil tracking — clamp into [-1, 1] then translate within the eye.
  const px = Math.max(-1, Math.min(1, pupilX)) * 2.2;
  const py = Math.max(-1, Math.min(1, pupilY)) * 3.2;

  const leftEyeCx = 39;
  const rightEyeCx = 61;
  const eyeCy = 36;
  const eyeRx = 6;
  const eyeRy = 8;
  const pupilR = 3;

  const pupilLeftCx = leftEyeCx + px;
  const pupilRightCx = rightEyeCx + px;
  // Pupil rests slightly below center for a "looking up" cute expression.
  const pupilCy = eyeCy + 1.6 + py;

  // Pie-eye notch (upper-right quadrant cut-out, classic rubber hose).
  const piePath = (cx: number, cy: number) =>
    `M ${cx},${cy} L ${cx + pupilR},${cy} A ${pupilR},${pupilR} 0 0 0 ${cx},${cy - pupilR} Z`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden
      role="img"
    >
      {/* Stubby legs — drawn first so they sit behind the coin */}
      <path
        d="M 43,70 Q 42,76 42,81"
        stroke={PALETTE.ink}
        strokeWidth={6.5}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 57,70 Q 58,76 58,81"
        stroke={PALETTE.ink}
        strokeWidth={6.5}
        strokeLinecap="round"
        fill="none"
      />

      {/* Stubby arms */}
      <path
        d="M 24,52 Q 18,57 15,61"
        stroke={PALETTE.ink}
        strokeWidth={5.5}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 76,52 Q 82,57 85,61"
        stroke={PALETTE.ink}
        strokeWidth={5.5}
        strokeLinecap="round"
        fill="none"
      />

      {/* Coin edge (back disc, darker — shows the thickness on the right/bottom) */}
      <circle
        cx={52}
        cy={44.5}
        r={32}
        fill={PALETTE.coinShadow}
        stroke={PALETTE.ink}
        strokeWidth={2.8}
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
      <ellipse cx={28} cy={48} rx={4} ry={2.2} fill={PALETTE.blush} opacity={0.3} />
      <ellipse cx={72} cy={48} rx={4} ry={2.2} fill={PALETTE.blush} opacity={0.3} />

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
          <path d={piePath(pupilLeftCx, pupilCy)} fill={PALETTE.esclera} />
          <circle cx={pupilRightCx} cy={pupilCy} r={pupilR} fill={PALETTE.ink} />
          <path d={piePath(pupilRightCx, pupilCy)} fill={PALETTE.esclera} />
        </g>
      )}

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
