'use client';

import { useState, useEffect } from 'react';
import GranaMascot from './GranaMascot';

export default function SplashAnimation({
  children,
}: {
  children: React.ReactNode;
}) {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 1800);
    return () => clearTimeout(timer);
  }, []);

  if (splashDone) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F8F9FB]">
      <div className="animate-coin-drop">
        <GranaMascot variant="happy" size={120} />
      </div>
      <div className="mt-5 animate-fade-up" style={{ animationDelay: '0.6s' }}>
        <p className="text-[28px] font-extrabold text-[#1A1D23] text-center font-heading">
          Grana
        </p>
        <p className="text-sm text-[#6B7280] mt-1 text-center">
          Seu dinheiro, finalmente claro.
        </p>
      </div>
    </div>
  );
}
