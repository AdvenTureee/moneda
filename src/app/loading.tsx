import ChartSkeleton from '@/components/charts/ChartSkeleton';

export default function Loading() {
  return (
    <main
      className="app-shell"
      style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="max-w-lg mx-auto px-4">
        <header className="flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <div className="w-[88px] h-[88px] rounded-full bg-[#F1F3F7] animate-pulse" />
            <div className="h-6 w-28 bg-[#F1F3F7] rounded animate-pulse" />
          </div>
          <div className="w-14 h-14 rounded-full bg-[#F1F3F7] animate-pulse" />
        </header>

        {/* Hero */}
        <section className="mb-5">
          <div className="h-3 w-28 bg-[#F1F3F7] rounded animate-pulse mb-2" />
          <div className="h-10 w-48 bg-[#F1F3F7] rounded animate-pulse" />
        </section>

        {/* Metric cards */}
        <section className="flex gap-3 mb-6">
          <ChartSkeleton variant="metric" />
          <ChartSkeleton variant="metric" />
        </section>

        {/* Donut */}
        <div className="mb-6">
          <ChartSkeleton variant="donut" />
        </div>

        {/* Histogram */}
        <div className="mb-6">
          <ChartSkeleton variant="histogram" />
        </div>
      </div>
    </main>
  );
}
