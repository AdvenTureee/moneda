'use client';

import SplashAnimation from '@/components/SplashAnimation';
import TrackedMascot from '@/components/TrackedMascot';
import { AuthMascotProvider, useAuthMascot } from './AuthMascotContext';

function AuthContent({ children }: { children: React.ReactNode }) {
  const { eyesClosed } = useAuthMascot();
  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-6">
          <TrackedMascot variant="idle" size={128} eyesClosed={eyesClosed} />
          <p className="brand-title text-[52px] font-extrabold text-[#1A1D23] font-heading leading-none">
            Moneda
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <SplashAnimation>
      <AuthMascotProvider>
        <AuthContent>{children}</AuthContent>
      </AuthMascotProvider>
    </SplashAnimation>
  );
}
