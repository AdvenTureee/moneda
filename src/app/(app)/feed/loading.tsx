function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[12px] bg-[color-mix(in_srgb,var(--color-surface-alt)_86%,var(--color-border)_14%)] ${className}`}
    />
  );
}

export default function FeedLoading() {
  return (
    <div className="max-w-lg mx-auto px-4 pb-24">
      <header className="py-6">
        <SkeletonBlock className="h-7 w-40" />
      </header>

      <section className="mb-4 rounded-[14px] bg-[var(--color-surface)] p-2.5">
        <SkeletonBlock className="mb-2.5 h-9" />
        <SkeletonBlock className="mb-2.5 h-9" />
        <div className="flex gap-1.5 overflow-hidden">
          <SkeletonBlock className="h-8 w-28 shrink-0 rounded-full" />
          <SkeletonBlock className="h-8 w-32 shrink-0 rounded-full" />
          <SkeletonBlock className="h-8 w-24 shrink-0 rounded-full" />
        </div>
      </section>

      <section className="space-y-4">
        {[0, 1, 2].map((index) => (
          <div key={index}>
            <SkeletonBlock className="mb-2 h-8 w-36 rounded-full" />
            <div className="space-y-2">
              <SkeletonBlock className="h-[76px]" />
              {index < 2 && <SkeletonBlock className="h-[76px]" />}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
