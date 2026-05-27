import Link from 'next/link';
import Icon from '@/components/Icon';

export default function BudgetEmptyCTA() {
  return (
    <Link
      href="/perfil/orcamento"
      className="themed-card flex items-center gap-3 bg-white rounded-[16px] p-4 transition-colors hover:bg-[#F8F9FB]"
      aria-label="Definir orçamentos por categoria"
    >
      <span
        className="flex items-center justify-center shrink-0 rounded-full"
        style={{ width: 40, height: 40, background: '#A8C5E022' }}
        aria-hidden
      >
        <Icon name="Target" size={20} color="#A8C5E0" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-[#1A1D23]">
          Acompanhe seus orçamentos
        </span>
        <span className="block text-xs text-[#6B7280] mt-0.5">
          Defina um orçamento por categoria e veja seu progresso aqui.
        </span>
      </span>
      <span className="shrink-0 text-xs font-medium text-[#A8C5E0]">
        Definir →
      </span>
    </Link>
  );
}
