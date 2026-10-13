'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const HeroAuraCanvas = dynamic(
  () => import('./HeroAuraCanvas').then((mod) => mod.HeroAuraCanvas),
  { ssr: false },
);

interface HeroAuraProps {
  isDark: boolean;
  reduceMotion: boolean | null;
}

type NavigatorWithDeviceHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl'),
    );
  } catch {
    return false;
  }
}

function canRunAnimatedAura(): boolean {
  const nav = navigator as NavigatorWithDeviceHints;
  const hasSmallViewport = window.matchMedia('(max-width: 767px)').matches;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const memory = nav.deviceMemory;
  const cores = nav.hardwareConcurrency;
  const savesData = Boolean(nav.connection?.saveData);
  const weakDevice =
    savesData ||
    (typeof memory === 'number' && memory <= 4 && typeof cores === 'number' && cores <= 4);

  return !hasSmallViewport && !prefersReducedMotion && !weakDevice && supportsWebGL();
}

export default function HeroAura({ isDark, reduceMotion }: HeroAuraProps) {
  const [canAnimate, setCanAnimate] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const syncCapability = () => {
      setCanAnimate(!reduceMotion && canRunAnimatedAura());
    };

    if (reduceMotion) {
      setCanAnimate(false);
    } else {
      syncCapability();
    }

    window.addEventListener('resize', syncCapability);
    motionQuery.addEventListener('change', syncCapability);

    return () => {
      window.removeEventListener('resize', syncCapability);
      motionQuery.removeEventListener('change', syncCapability);
    };
  }, [reduceMotion]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!canAnimate) setCanvasReady(false);
  }, [canAnimate]);

  return (
    <div
      className={`hero-aura ${isVisible ? 'hero-aura--visible' : ''} ${canvasReady ? 'hero-aura--canvas-ready' : ''} ${isDark ? 'hero-aura--dark' : 'hero-aura--light'}`}
      aria-hidden="true"
    >
      <div className="hero-aura__fallback" />
      {canAnimate && (
        <HeroAuraCanvas
          isDark={isDark}
          isReady={canvasReady}
          onReady={() => setCanvasReady(true)}
        />
      )}
    </div>
  );
}
