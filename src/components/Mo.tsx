'use client';

export type MoVariant = 'idle' | 'happy' | 'sad' | 'thinking';

export interface MoProps {
  variant?: MoVariant;
  size?: number;
  className?: string;
  /** Recorte só do rosto (avatar / foto de perfil). */
  portrait?: boolean;
  pupilX?: number;
  pupilY?: number;
  eyesClosed?: boolean;
  browX?: number;
  browY?: number;
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
  size,
  className = '',
  portrait = false,
  pupilX = 0,
  pupilY = 0,
  eyesClosed = false,
  browX = 0,
  browY = 0,
}: MoProps) {
  const resolvedSize = size ?? 80;

  // Pupil tracking — clamp into [-1, 1] then translate within the eye.
  const px = Math.max(-1, Math.min(1, pupilX)) * 2.2;
  const py = Math.max(-1, Math.min(1, pupilY)) * 3.2;

  const leftEyeCx = 38;
  const rightEyeCx = 62;
  const eyeCy = 36;
  const eyeRx = 7;
  const eyeRy = 8.5;
  const pupilR = 4;

  const pupilLeftCx = leftEyeCx + px;
  const pupilRightCx = rightEyeCx + px;
  // Pupil rests slightly below center for a "looking up" cute expression.
  const pupilCy = eyeCy + 1.6 + py;

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
      {eyesClosed ? (
        <g>
          <path d="M 33,36 Q 38,39 43,36" stroke={PALETTE.ink} strokeWidth={2} strokeLinecap="round" fill="none" />
          <path d="M 57,36 Q 62,39 67,36" stroke={PALETTE.ink} strokeWidth={2} strokeLinecap="round" fill="none" />
        </g>
      ) : (
        <>
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
          <circle cx={leftEyeCx - 2.2} cy={eyeCy - 2.5} r={1.5} fill="white" />
          <circle cx={rightEyeCx - 2.2} cy={eyeCy - 2.5} r={1.5} fill="white" />
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
        </>
      )}
      <path
        d="M 40,52 Q 50,61 60,52"
        stroke={PALETTE.ink}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <path d="M 38,49 Q 42,52 38,54" stroke={PALETTE.ink} strokeWidth={2} strokeLinecap="round" fill="none" />
      <path d="M 62,49 Q 58,52 62,54" stroke={PALETTE.ink} strokeWidth={2} strokeLinecap="round" fill="none" />
      {variant === 'thinking' && (
        <g fontFamily="ui-sans-serif, system-ui, sans-serif">
          <text x={72} y={16} fontSize={13} fontWeight={900} fill={PALETTE.ink}>
            ?
          </text>
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
        @keyframes float-body {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-1.5px) scale(1.025); }
        }
        .animate-body-float {
          animation: float-body 3s ease-in-out infinite;
          transform-origin: 50px 42px;
        }
        @keyframes float-limb {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2.5px); }
        }
        .animate-float-l1 { animation: float-limb 3s ease-in-out infinite; }
        .animate-float-l2 { animation: float-limb 3s ease-in-out infinite 0.1s; }
        .animate-float-a1 { animation: float-limb 3s ease-in-out infinite 0.2s; }
        .animate-float-a2 { animation: float-limb 3s ease-in-out infinite 0.3s; }
        @keyframes brow-move {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1.2px); }
        }
        .animate-brow-float { animation: brow-move 3s ease-in-out infinite; }
      `}</style>
      <g className="animate-body-float">
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
      <g className="animate-float-l1">
      <path
        d="M 42,72 Q 38,79 41,83 Q 40,85 40,87"
        stroke={PALETTE.ink}
        strokeWidth={6.5}
        strokeLinecap="round"
        fill="none"
      />
      </g>
      <g className="animate-float-l2">
      <path
        d="M 58,72 Q 62,79 59,83 Q 60,85 60,87"
        stroke={PALETTE.ink}
        strokeWidth={6.5}
        strokeLinecap="round"
        fill="none"
      />
      </g>

      {/* Stubby arms — between disc and front face */}
      <g className="animate-float-a1">
      <path
        d="M 21,52 Q 16,57 13,61"
        stroke={PALETTE.ink}
        strokeWidth={5.5}
        strokeLinecap="round"
        fill="none"
      />
      </g>
      <g className="animate-float-a2">
      <path
        d="M 79,52 Q 84,57 89,61"
        stroke={PALETTE.ink}
        strokeWidth={5.5}
        strokeLinecap="round"
        fill="none"
      />
      </g>

      {faceFeatures}
      </g>
    </svg>
  );
}
