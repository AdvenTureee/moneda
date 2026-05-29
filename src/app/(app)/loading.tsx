function SkeletonBlock({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-[14px] bg-[color-mix(in_srgb,var(--color-surface-alt)_86%,var(--color-border)_14%)] ${className}`}
    />
  );
}

export default function AppLoading() {
  return (
    <div className="max-w-lg mx-auto px-4 pb-24">
      <header className="py-6">
        <SkeletonBlock className="h-7 w-36" />
        <SkeletonBlock className="mt-2 h-3 w-24 rounded-full" />
      </header>

      <section className="mb-5 flex items-center gap-4">
        <SkeletonBlock className="h-24 w-24 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonBlock className="h-4 w-full rounded-full" />
          <SkeletonBlock className="h-4 w-5/6 rounded-full" />
          <SkeletonBlock className="h-4 w-2/3 rounded-full" />
        </div>
      </section>

      <SkeletonBlock className="mb-4 h-32 rounded-[20px]" />

      <section className="mb-4 grid grid-cols-2 gap-3">
        <SkeletonBlock className="h-20" />
        <SkeletonBlock className="h-20" />
      </section>

      <section className="space-y-3">
        <SkeletonBlock className="h-12" />
        <SkeletonBlock className="h-[76px]" />
        <SkeletonBlock className="h-[76px]" />
        <SkeletonBlock className="h-[76px]" />
      </section>
    </div>
  );
}
