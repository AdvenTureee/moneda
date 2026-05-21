import GranaLogo from '@/components/GranaLogo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-2 flex justify-center">
          <GranaLogo size="md" />
        </div>
        <p className="text-center text-[28px] font-extrabold text-[#1A1D23] mb-8 font-heading">
          grana
        </p>
        {children}
      </div>
    </div>
  );
}
