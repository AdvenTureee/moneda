/**
 * Skeleton para a página /perfil. Espelha a estrutura de ProfileView:
 * card de identidade + 5 cards de seção (Finanças / Categorias / Preferências /
 * Dados / Conta). Estilo segue ChartSkeleton (bg-[#F1F3F7] + animate-pulse).
 */
export default function ProfileSkeleton() {
  return (
    <div className="max-w-lg mx-auto px-4 pb-24" aria-busy="true" aria-label="Carregando perfil">
      {/* Identity card */}
      <div
        className="bg-white rounded-[16px] p-5 mb-6 mt-4"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#F1F3F7] animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-[#F1F3F7] rounded animate-pulse" />
            <div className="h-3 w-44 bg-[#F1F3F7] rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* 5 cards de seção */}
      {[3, 2, 3, 1, 3].map((rows, idx) => (
        <div
          key={idx}
          className="bg-white rounded-[16px] overflow-hidden divide-y divide-[#F1F2F4] mb-6"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="flex items-center gap-3 px-5 py-4">
              <div className="w-9 h-9 rounded-full bg-[#F1F3F7] animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-32 bg-[#F1F3F7] rounded animate-pulse" />
                <div className="h-2.5 w-48 bg-[#F1F3F7] rounded animate-pulse" />
              </div>
              <div className="w-3 h-3 rounded-full bg-[#F1F3F7] animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
