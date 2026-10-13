'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { usePrivacy } from '@/context/PrivacyContext';

interface PrivateValueProps {
  value: string;
  className?: string;
  animate?: boolean;
  animationKey?: string;
  'aria-label'?: string;
}

const animatedValueMemory = new Map<string, string>();

export function maskValue(value: string): string {
  return value.replace(/\d/g, '•');
}

function parseCssTime(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (trimmed.endsWith('ms')) return Number.parseFloat(trimmed);
  if (trimmed.endsWith('s')) return Number.parseFloat(trimmed) * 1000;
  return Number.parseFloat(trimmed);
}

function AnimatedPrivateValue({
  value,
  visibleValue,
  className,
  ariaLabel,
  animationKey,
}: {
  value: string;
  visibleValue: string;
  className?: string;
  ariaLabel?: string;
  animationKey?: string;
}) {
  const groupRef = useRef<HTMLSpanElement>(null);
  const hasMountedRef = useRef(false);
  const chars = visibleValue.split('');

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    if (animationKey) {
      const previousValue = animatedValueMemory.get(animationKey);
      animatedValueMemory.set(animationKey, value);
      if (previousValue === undefined || previousValue === value) return;
    } else if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
    }

    group.classList.remove('is-animating');
    void group.offsetHeight;
    group.classList.add('is-animating');

    const styles = getComputedStyle(group);
    const duration = parseCssTime(styles.getPropertyValue('--digit-dur'));
    const stagger = parseCssTime(styles.getPropertyValue('--digit-stagger'));
    const cleanupTimer = window.setTimeout(() => {
      group.classList.remove('is-animating');
    }, duration + stagger * 2);

    return () => {
      window.clearTimeout(cleanupTimer);
    };
  }, [animationKey, value, visibleValue]);

  return (
    <span
      ref={groupRef}
      className={`t-digit-group${className ? ` ${className}` : ''}`}
      aria-label={ariaLabel ?? value}
    >
      {chars.map((char, index) => {
        let stagger: string | undefined;
        if (index === chars.length - 2) stagger = '1';
        if (index === chars.length - 1) stagger = '2';

        return (
          <span key={`${char}-${index}`} className="t-digit" data-stagger={stagger} aria-hidden="true">
            {char}
          </span>
        );
      })}
    </span>
  );
}

export default function PrivateValue({
  value,
  className,
  animate = false,
  animationKey,
  'aria-label': ariaLabel,
}: PrivateValueProps) {
  const { isPrivate } = usePrivacy();
  const visibleValue = isPrivate ? maskValue(value) : value;

  if (animate) {
    return (
      <AnimatedPrivateValue
        value={value}
        visibleValue={visibleValue}
        className={className}
        ariaLabel={ariaLabel}
        animationKey={animationKey}
      />
    );
  }

  if (!isPrivate) {
    return <span className={className}>{value}</span>;
  }

  const masked = maskValue(value);

  return (
    <motion.span
      key={masked}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={className}
      aria-label={ariaLabel ?? value}
    >
      {masked}
    </motion.span>
  );
}
