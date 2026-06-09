'use client';

import {
  motion,
  type SpringOptions,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'framer-motion';
import type React from 'react';

type BubbleColors = {
  first?: string;
  second?: string;
  third?: string;
  fourth?: string;
  fifth?: string;
  sixth?: string;
};

interface BubbleBackgroundProps extends React.ComponentProps<'div'> {
  interactive?: boolean;
  transition?: SpringOptions;
  colors?: BubbleColors;
}

const defaultColors: Required<BubbleColors> = {
  first: '168,197,224',
  second: '91,191,142',
  third: '122,174,207',
  fourth: '240,168,85',
  fifth: '255,255,255',
  sixth: '63,168,118',
};

const bubbleClass =
  'absolute rounded-full blur-3xl will-change-transform mix-blend-multiply dark:mix-blend-screen';

export function BubbleBackground({
  interactive = false,
  transition = { stiffness: 100, damping: 20 },
  colors,
  className = '',
  onPointerMove,
  onPointerLeave,
  ...props
}: BubbleBackgroundProps) {
  const reduceMotion = useReducedMotion();
  const mergedColors = { ...defaultColors, ...colors };
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const x = useSpring(pointerX, transition);
  const y = useSpring(pointerY, transition);

  return (
    <div
      aria-hidden="true"
      className={`${interactive ? 'pointer-events-auto' : 'pointer-events-none'} overflow-hidden ${className}`}
      onPointerMove={(event) => {
        if (interactive && !reduceMotion) {
          const rect = event.currentTarget.getBoundingClientRect();
          pointerX.set(event.clientX - rect.left - rect.width / 2);
          pointerY.set(event.clientY - rect.top - rect.height / 2);
        }
        onPointerMove?.(event);
      }}
      onPointerLeave={(event) => {
        if (interactive && !reduceMotion) {
          pointerX.set(0);
          pointerY.set(0);
        }
        onPointerLeave?.(event);
      }}
      {...props}
    >
      <motion.div
        className={`${bubbleClass} left-[4%] top-[8%] h-80 w-80 opacity-35`}
        style={{ background: `rgb(${mergedColors.first})` }}
        animate={reduceMotion ? undefined : { x: [0, 26, -8, 0], y: [0, -18, 14, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className={`${bubbleClass} right-[8%] top-[14%] h-72 w-72 opacity-28`}
        style={{ background: `rgb(${mergedColors.second})` }}
        animate={reduceMotion ? undefined : { x: [0, -22, 16, 0], y: [0, 18, -12, 0] }}
        transition={{ duration: 21, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className={`${bubbleClass} bottom-[18%] left-[20%] h-64 w-64 opacity-22`}
        style={{ background: `rgb(${mergedColors.third})` }}
        animate={reduceMotion ? undefined : { x: [0, 18, -20, 0], y: [0, 14, -16, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className={`${bubbleClass} bottom-[6%] right-[18%] h-56 w-56 opacity-16`}
        style={{ background: `rgb(${mergedColors.fourth})` }}
        animate={reduceMotion ? undefined : { x: [0, -14, 18, 0], y: [0, -12, 16, 0] }}
        transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className={`${bubbleClass} left-[48%] top-[42%] h-72 w-72 opacity-18`}
        style={{ background: `rgb(${mergedColors.fifth})` }}
        animate={reduceMotion ? undefined : { scale: [1, 1.08, 0.96, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      {interactive && (
        <motion.div
          className={`${bubbleClass} left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 opacity-20`}
          style={{
            x: reduceMotion ? 0 : x,
            y: reduceMotion ? 0 : y,
            background: `rgb(${mergedColors.sixth})`,
          }}
        />
      )}
    </div>
  );
}
