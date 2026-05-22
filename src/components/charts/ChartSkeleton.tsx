interface ChartSkeletonProps {
  variant: 'donut' | 'histogram' | 'line' | 'bars-list' | 'metric';
  className?: string;
}

export default function ChartSkeleton({ variant, className = '' }: ChartSkeletonProps) {
  if (variant === 'donut') {
    return (
      <div
        className={`bg-white rounded-[16px] p-5 ${className}`}
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <div className="h-4 w-32 bg-[#F1F3F7] rounded animate-pulse mb-4" />
        <div className="flex items-center gap-5">
          <div className="w-[180px] h-[180px] rounded-full bg-[#F1F3F7] animate-pulse shrink-0" />
          <div className="flex-1 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#F1F3F7] animate-pulse" />
                <div className="flex-1 h-3 bg-[#F1F3F7] rounded animate-pulse" />
                <div className="w-14 h-3 bg-[#F1F3F7] rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'histogram') {
    return (
      <div
        className={`bg-white rounded-[16px] p-5 ${className}`}
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-28 bg-[#F1F3F7] rounded animate-pulse" />
          <div className="h-3 w-24 bg-[#F1F3F7] rounded animate-pulse" />
        </div>
        <div className="flex items-end gap-1 h-[140px]">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-[#F1F3F7] rounded-sm animate-pulse"
              style={{ height: `${30 + Math.abs(Math.sin(i * 1.3)) * 70}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'line') {
    return (
      <div
        className={`bg-white rounded-[16px] p-5 ${className}`}
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <div className="h-4 w-40 bg-[#F1F3F7] rounded animate-pulse mb-4" />
        <div className="h-[140px] bg-[#F1F3F7] rounded animate-pulse" />
      </div>
    );
  }

  if (variant === 'bars-list') {
    return (
      <div
        className={`bg-white rounded-[16px] p-5 ${className}`}
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <div className="h-4 w-44 bg-[#F1F3F7] rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 bg-[#F1F3F7] rounded animate-pulse" />
                <div className="h-3 w-20 bg-[#F1F3F7] rounded animate-pulse" />
              </div>
              <div className="h-2 bg-[#F1F3F7] rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // metric
  return (
    <div
      className={`bg-white rounded-[10px] px-4 py-3 flex-1 ${className}`}
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
    >
      <div className="h-3 w-16 bg-[#F1F3F7] rounded animate-pulse mb-2" />
      <div className="h-5 w-24 bg-[#F1F3F7] rounded animate-pulse" />
    </div>
  );
}
