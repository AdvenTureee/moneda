import Icon from '@/components/Icon';

interface CategoryChipProps {
  icon: string;
  label: string;
  color?: string;
  selected?: boolean;
  size?: 'sm' | 'md';
  onClick?: () => void;
}

export default function CategoryChip({
  icon,
  label,
  color,
  selected = false,
  size = 'md',
  onClick,
}: CategoryChipProps) {
  const isSmall = size === 'sm';

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded-full font-medium transition-all duration-75 active:scale-95 whitespace-nowrap ${
        isSmall ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
      } ${
        selected
          ? 'bg-[#5BBF8E] text-white border-transparent'
          : 'bg-[#F1F3F7] text-[#6B7280] border border-[#E5E7EB] hover:border-[#A8C5E0] hover:text-[#1A1D23]'
      }`}
      style={{
        background: selected ? 'var(--color-success)' : 'var(--color-surface-alt)',
        borderColor: selected ? 'transparent' : 'var(--color-border)',
        color: selected ? '#FFFFFF' : 'var(--color-text-secondary)',
      }}
      aria-pressed={selected}
    >
      <Icon name={icon} size={isSmall ? 12 : 14} aria-hidden />
      <span>{label}</span>
    </button>
  );
}
