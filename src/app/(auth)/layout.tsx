export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold text-[#A8C5E0] uppercase tracking-widest mb-1">
            Grana
          </p>
          <p className="text-sm text-[#6B7280]">Seu dinheiro, finalmente claro.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
