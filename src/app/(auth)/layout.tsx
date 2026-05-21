'use client';

import SplashAnimation from '@/components/SplashAnimation';
import TrackedMascot from '@/components/TrackedMascot';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <SplashAnimation>
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-center gap-3">
            <TrackedMascot variant="idle" size={128} />
            <p className="text-[52px] font-extrabold text-[#1A1D23] font-heading leading-none">
              Grana
            </p>
          </div>
          {children}
        </div>
      </div>
    </SplashAnimation>
  );
}
