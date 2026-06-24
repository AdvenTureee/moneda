import PrivateValue from '@/components/PrivateValue';

interface DashboardMetricProps {
  label: string;
  value: string;
  subtext?: string;
  subtextColor?: string;
  size?: 'sm' | 'lg';
}

export default function DashboardMetric({
  label,
  value,
  subtext,
  subtextColor = '#6B7280',
  size = 'sm',
}: DashboardMetricProps) {
  return (
    <div
      className="themed-card min-w-[7.5rem] flex-1 bg-white rounded-[10px] px-4 py-3"
    >
      <p className="text-xs text-[#6B7280] font-medium mb-1">{label}</p>
      <p
        className={`truncate font-bold text-[#1A1D23] tabular-nums ${
          size === 'lg' ? 'text-2xl' : 'text-lg'
        }`}
      >
        <PrivateValue value={value} animate />
      </p>
      {subtext && (
        <p
          className="text-xs mt-0.5 font-medium"
          style={{ color: subtextColor }}
        >
          {subtext}
        </p>
      )}
    </div>
  );
}
