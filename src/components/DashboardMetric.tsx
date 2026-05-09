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
      className="bg-white rounded-[10px] px-4 py-3 flex-1"
      style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
    >
      <p className="text-xs text-[#6B7280] font-medium mb-1">{label}</p>
      <p
        className={`font-bold text-[#1A1D23] tabular-nums ${
          size === 'lg' ? 'text-2xl' : 'text-lg'
        }`}
      >
        {value}
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
