'use client';

import { useEffect, useRef } from 'react';

interface AuthErrorNoticeProps {
  message: string;
  replayKey: number;
  className?: string;
}

function parseCssTime(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (trimmed.endsWith('ms')) return Number.parseFloat(trimmed);
  if (trimmed.endsWith('s')) return Number.parseFloat(trimmed) * 1000;
  return Number.parseFloat(trimmed);
}

function getCssTime(name: string, fallback: number): number {
  const styles = getComputedStyle(document.documentElement);
  const parsed = parseCssTime(styles.getPropertyValue(name));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function AuthErrorNotice({ message, replayKey, className }: AuthErrorNoticeProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!message) return;

    const wrap = wrapRef.current;
    const input = inputRef.current;
    if (!wrap || !input) return;

    wrap.classList.add('is-error');
    input.classList.add('is-error');
    input.classList.remove('is-shaking');
    void input.offsetWidth;
    input.classList.add('is-shaking');

    const shakeMs =
      getCssTime('--shake-dur-a', 80) * 2 +
      getCssTime('--shake-dur-b', 60) * 2;

    const cleanupTimer = window.setTimeout(() => {
      input.classList.remove('is-shaking');
    }, shakeMs + 20);

    return () => {
      window.clearTimeout(cleanupTimer);
    };
  }, [message, replayKey]);

  if (!message) return null;

  return (
    <div ref={wrapRef} className="t-input-wrap is-error">
      <p
        ref={inputRef}
        className={`t-input t-error-msg is-error rounded-[10px] border border-[#F2B8B8] bg-[#FDF0F0] px-3 py-2 text-xs font-medium leading-relaxed text-[#B94A48] dark:border-[#5B2B33] dark:bg-[#3A1F24] dark:text-[#FFA0A0]${className ? ` ${className}` : ''}`}
        role="alert"
      >
        {message}
      </p>
    </div>
  );
}
