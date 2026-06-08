function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[12px] bg-[color-mix(in_srgb,var(--color-surface-alt)_86%,var(--color-border)_14%)] ${className}`}
    />
  );
}

export default function ProfileLoading() {
  return (
    <div className="max-w-lg mx-auto px-4 pb-24">
      <header className="py-6">
        <SkeletonBlock className="h-7 w-24" />
        <SkeletonBlock className="mt-2 h-4 w-52 rounded-full" />
      </header>

      <section className="mb-6 rounded-[16px] bg-[var(--color-surface)] p-5">
        <div className="flex items-center gap-4">
          <SkeletonBlock className="h-16 w-16 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBlock className="h-5 w-32 rounded-full" />
            <SkeletonBlock className="h-4 w-full rounded-full" />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SkeletonBlock className="h-12" />
        <SkeletonBlock className="h-12" />
        <SkeletonBlock className="h-12" />
        <SkeletonBlock className="h-12" />
      </section>
    </div>
  );
}
