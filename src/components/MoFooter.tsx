'use client';

import { useState, useEffect, useId } from 'react';

const PALETTE = {
  coinBase: '#FACC15',
  coinShadow: '#A16207',
  blush: '#F43F5E',
  ink: '#1C1917',
  esclera: '#FAFAF9',
};

function useBlink(intervalMs = 4000) {
  const [isClosed, setIsClosed] = useState(false);
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsClosed(true);
      setTimeout(() => setIsClosed(false), 150);
    }, intervalMs);
    return () => clearInterval(blinkInterval);
  }, [intervalMs]);
  return isClosed;
}

export default function MoFooter({
  size = 40,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  const mouthClipId = `mo-footer-mouth-${useId().replace(/:/g, '')}`;
  const eyesClosed = useBlink();
  const px = 0;
  const py = 0;

  const leftEyeCx = 38;
  const rightEyeCx = 62;
  const eyeCy = 36;
  const eyeRx = 7;
  const eyeRy = 8.5;
  const pupilR = 4;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`mo-footer-mascot ${className}`.trim()}
      aria-hidden
      role="img"
    >
      <style>{`
        @keyframes mo-footer-float-body {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1px); }
        }
        .mo-footer-body { animation: mo-footer-float-body 2.5s ease-in-out infinite; transform-origin: 50px 42px; }

        @keyframes mo-footer-toss-hand {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          40% { transform: translateY(3px) rotate(-5deg); }
          50% { transform: translateY(-4px) rotate(10deg); }
        }
        .mo-footer-toss-hand {
          animation: mo-footer-toss-hand 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          transform-origin: 25px 52px;
        }

        @keyframes mo-footer-float-limb {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1.5px); }
        }
        .mo-footer-l1 { animation: mo-footer-float-limb 2.5s ease-in-out infinite; }
        .mo-footer-l2 { animation: mo-footer-float-limb 2.5s ease-in-out infinite 0.1s; }
        .mo-footer-a2 { animation: mo-footer-float-limb 2.5s ease-in-out infinite 0.3s; }

        @keyframes mo-footer-coin-toss {
          0%, 100% { transform: translateY(0) scaleY(1); opacity: 1; }
          40% { transform: translateY(2px) scaleY(1); }
          52% { transform: translateY(-28px) scaleY(-1); }
          64% { transform: translateY(-15px) scaleY(1); }
          76% { transform: translateY(-2px) scaleY(-1); }
          85% { transform: translateY(0) scaleY(1); }
        }
        .mo-footer-coin {
          animation: mo-footer-coin-toss 2s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
          transform-origin: 14px 47px;
        }

        @media (prefers-reduced-motion: reduce) {
          .mo-footer-body, .mo-footer-toss-hand, .mo-footer-l1, .mo-footer-l2, .mo-footer-a2, .mo-footer-coin { animation: none !important; }
        }
      `}</style>

      <g className="mo-footer-body">
        <circle cx={55} cy={44} r={32} fill={PALETTE.coinShadow} stroke={PALETTE.ink} strokeWidth={2.8} />

        <g className="mo-footer-l1">
          <path d="M 42,72 Q 38,79 41,83 Q 40,85 40,87" stroke={PALETTE.ink} strokeWidth={6.5} strokeLinecap="round" fill="none" />
        </g>
        <g className="mo-footer-l2">
          <path d="M 58,72 Q 62,79 59,83 Q 60,85 60,87" stroke={PALETTE.ink} strokeWidth={6.5} strokeLinecap="round" fill="none" />
        </g>

        <g className="mo-footer-a2">
          <path d="M 79,52 Q 84,57 89,61" stroke={PALETTE.ink} strokeWidth={5.5} strokeLinecap="round" fill="none" />
        </g>

        <g className="mo-footer-coin">
          <circle cx={14} cy={47} r={4.5} fill={PALETTE.coinBase} stroke={PALETTE.ink} strokeWidth={1.5} />
          <text x={14} y={50.2} textAnchor="middle" fontSize={6.5} fontWeight={900} fontFamily="sans-serif" fill={PALETTE.ink}>$</text>
        </g>

        <g className="mo-footer-toss-hand">
          <path d="M 22,52 Q 17,50 14,48" stroke={PALETTE.ink} strokeWidth={5.5} strokeLinecap="round" fill="none" />
        </g>

        <circle cx={50} cy={42} r={32} fill={PALETTE.coinBase} stroke={PALETTE.ink} strokeWidth={2.8} />

        <ellipse cx={28} cy={48} rx={6} ry={4.5} fill={PALETTE.blush} opacity={0.35} />
        <ellipse cx={72} cy={48} rx={6} ry={4.5} fill={PALETTE.blush} opacity={0.35} />

        <path d="M 33,25 Q 38,22 43,25" stroke={PALETTE.ink} strokeWidth={2} strokeLinecap="round" fill="none" />
        <path d="M 67,25 Q 62,22 57,25" stroke={PALETTE.ink} strokeWidth={2} strokeLinecap="round" fill="none" />

        {eyesClosed ? (
          <g>
            <path d="M 33,36 Q 38,39 43,36" stroke={PALETTE.ink} strokeWidth={2.5} strokeLinecap="round" fill="none" />
            <path d="M 57,36 Q 62,39 67,36" stroke={PALETTE.ink} strokeWidth={2.5} strokeLinecap="round" fill="none" />
          </g>
        ) : (
          <g>
            <ellipse cx={leftEyeCx} cy={eyeCy} rx={eyeRx} ry={eyeRy} fill={PALETTE.esclera} stroke={PALETTE.ink} strokeWidth={1.9} />
            <ellipse cx={rightEyeCx} cy={eyeCy} rx={eyeRx} ry={eyeRy} fill={PALETTE.esclera} stroke={PALETTE.ink} strokeWidth={1.9} />
            <circle cx={leftEyeCx - 2.2} cy={eyeCy - 2.5} r={1.5} fill="white" />
            <circle cx={rightEyeCx - 2.2} cy={eyeCy - 2.5} r={1.5} fill="white" />
            <g>
              <circle cx={leftEyeCx + px} cy={eyeCy + 1.6 + py} r={pupilR} fill={PALETTE.ink} />
              <circle cx={rightEyeCx + px} cy={eyeCy + 1.6 + py} r={pupilR} fill={PALETTE.ink} />
            </g>
          </g>
        )}

        <path d="M 40,52 Q 50,61 60,52" stroke={PALETTE.ink} strokeWidth={2} strokeLinecap="round" fill="none" />
        <path d="M 38,49 Q 42,52 38,54" stroke={PALETTE.ink} strokeWidth={2} strokeLinecap="round" fill="none" />
        <path d="M 62,49 Q 58,52 62,54" stroke={PALETTE.ink} strokeWidth={2} strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}
