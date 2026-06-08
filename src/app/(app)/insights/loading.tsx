function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[12px] bg-[color-mix(in_srgb,var(--color-surface-alt)_86%,var(--color-border)_14%)] ${className}`}
    />
  );
}

export default function InsightsLoading() {
  return (
    <div className="max-w-lg mx-auto px-4 pb-24">
      <header className="py-5">
        <SkeletonBlock className="h-6 w-28" />
        <SkeletonBlock className="mt-2 h-3 w-24 rounded-full" />
      </header>

      <SkeletonBlock className="mb-5 h-28 rounded-[18px]" />
      <SkeletonBlock className="mb-6 h-36 rounded-[20px]" />

      <section className="space-y-3">
        <SkeletonBlock className="h-5 w-32 rounded-full" />
        <SkeletonBlock className="h-24 rounded-[16px]" />
        <SkeletonBlock className="h-24 rounded-[16px]" />
      </section>
    </div>
  );
}
