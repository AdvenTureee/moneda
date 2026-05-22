import ChartSkeleton from '@/components/charts/ChartSkeleton';

export default function Loading() {
  return (
    <main
      className="app-shell"
      style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="max-w-lg mx-auto px-4 pb-24">
        <header className="py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-6 w-24 bg-[#F1F3F7] rounded animate-pulse mb-2" />
              <div className="h-3 w-28 bg-[#F1F3F7] rounded animate-pulse" />
            </div>
            <div className="h-8 w-20 bg-[#F1F3F7] rounded-full animate-pulse" />
          </div>
        </header>

        {/* Hero */}
        <div
          className="bg-gradient-to-br from-[#A8C5E0] to-[#7AAECF] rounded-[20px] p-5 mb-6"
          style={{ boxShadow: '0 8px 24px rgba(168, 197, 224, 0.3)' }}
        >
          <div className="h-3 w-20 bg-white/40 rounded animate-pulse mb-2" />
          <div className="h-8 w-40 bg-white/40 rounded animate-pulse mb-3" />
          <div className="h-3 w-48 bg-white/40 rounded animate-pulse" />
        </div>

        <div className="mb-6">
          <ChartSkeleton variant="donut" />
        </div>
        <div className="mb-6">
          <ChartSkeleton variant="line" />
        </div>
        <div className="mb-6">
          <ChartSkeleton variant="bars-list" />
        </div>
      </div>
    </main>
  );
}
