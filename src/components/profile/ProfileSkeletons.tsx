import type { ReactNode } from 'react';

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[12px] bg-[color-mix(in_srgb,var(--color-surface-alt)_86%,var(--color-border)_14%)] ${className}`}
    />
  );
}

export function ProfileSkeletonPage({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`max-w-lg mx-auto px-4 ${compact ? 'pb-8' : 'pb-4'} [scrollbar-gutter:stable]`}>
      {children}
    </div>
  );
}

export function ProfileSkeletonHeader({
  subtitle = true,
  centered = false,
}: {
  subtitle?: boolean;
  centered?: boolean;
}) {
  if (centered) {
    return (
      <header className="relative py-5">
        <SkeletonBlock className="absolute left-0 top-5 h-9 w-9 rounded-full" />
        <div className="mx-auto flex max-w-[260px] flex-col items-center">
          <SkeletonBlock className="h-6 w-44 rounded-full" />
          {subtitle && <SkeletonBlock className="mt-2 h-4 w-56 rounded-full" />}
        </div>
      </header>
    );
  }

  return (
    <header className="flex items-center gap-3 py-5">
      <SkeletonBlock className="h-9 w-9 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <SkeletonBlock className="h-6 w-36 rounded-full" />
        {subtitle && <SkeletonBlock className="mt-2 h-4 w-48 rounded-full" />}
      </div>
    </header>
  );
}

export function SkeletonCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`themed-card rounded-[18px] bg-[var(--color-surface)] p-4 ${className}`}>
      {children}
    </section>
  );
}

export function SkeletonInput({ className = '' }: { className?: string }) {
  return (
    <div className={`themed-field rounded-[12px] border border-[var(--color-border)] p-3 ${className}`}>
      <SkeletonBlock className="h-5 w-full rounded-full" />
    </div>
  );
}

export function SkeletonButton({ className = '' }: { className?: string }) {
  return <SkeletonBlock className={`h-12 w-full rounded-[12px] ${className}`} />;
}

export function SkeletonToggle({ checked = false }: { checked?: boolean }) {
  return (
    <span
      className={`relative inline-flex h-6 w-10 shrink-0 rounded-full ${
        checked
          ? 'bg-[color-mix(in_srgb,var(--color-success)_52%,var(--color-surface-alt)_48%)]'
          : 'bg-[color-mix(in_srgb,var(--color-surface-alt)_86%,var(--color-border)_14%)]'
      }`}
      aria-hidden
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-[var(--color-surface)] shadow-sm ${
          checked ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </span>
  );
}

export function SkeletonStat({ wide = false }: { wide?: boolean }) {
  return (
    <div className="rounded-[12px] bg-[var(--color-surface-alt)] px-3 py-2">
      <SkeletonBlock className="h-3 w-14 rounded-full" />
      <SkeletonBlock className={`mt-2 h-4 rounded-full ${wide ? 'w-24' : 'w-16'}`} />
    </div>
  );
}

export function ProfileRootSkeleton() {
  return (
    <ProfileSkeletonPage>
      <header className="py-6">
        <SkeletonBlock className="h-7 w-24 rounded-full" />
        <SkeletonBlock className="mt-2 h-4 w-52 rounded-full" />
      </header>

      <SkeletonCard className="mb-6 p-5">
        <div className="flex items-center gap-4">
          <SkeletonBlock className="h-16 w-16 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBlock className="h-5 w-32 rounded-full" />
            <SkeletonBlock className="h-4 w-full rounded-full" />
          </div>
        </div>
      </SkeletonCard>

      <section className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonSettingsRow key={index} />
        ))}
      </section>
    </ProfileSkeletonPage>
  );
}

export function SkeletonSettingsRow() {
  return (
    <SkeletonCard className="flex items-center gap-3 p-3">
      <SkeletonBlock className="h-9 w-9 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <SkeletonBlock className="h-4 w-36 rounded-full" />
        <SkeletonBlock className="mt-2 h-3 w-44 rounded-full" />
      </div>
      <SkeletonBlock className="h-5 w-5 shrink-0 rounded-full" />
    </SkeletonCard>
  );
}

export function IncomesProfileSkeleton() {
  return (
    <ProfileSkeletonPage>
      <ProfileSkeletonHeader />

      <SkeletonCard className="mb-4 rounded-[20px] p-5">
        <SkeletonBlock className="h-3 w-28 rounded-full" />
        <SkeletonBlock className="mt-3 h-9 w-44 rounded-full" />
        <SkeletonBlock className="mt-3 h-3 w-64 max-w-full rounded-full" />
      </SkeletonCard>

      <SkeletonButton className="mb-5 border border-dashed border-[var(--color-border)] bg-transparent" />
      <SkeletonBlock className="mb-3 h-3 w-36 rounded-full" />
      <section className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonListRow key={index} amount />
        ))}
      </section>
    </ProfileSkeletonPage>
  );
}

export function BudgetProfileSkeleton() {
  return (
    <ProfileSkeletonPage compact>
      <ProfileSkeletonHeader />

      <SkeletonCard className="mb-4">
        <SkeletonBlock className="h-3 w-40 rounded-full" />
        <SkeletonInput className="mt-3 h-[70px] px-4 py-5" />
        <div className="mt-3 grid grid-cols-3 gap-2">
          <SkeletonStat wide />
          <SkeletonStat />
          <SkeletonStat />
        </div>
      </SkeletonCard>

      <section className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <SkeletonBlock className="h-4 w-20 rounded-full" />
          <SkeletonBlock className="h-7 w-32 rounded-full" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonPresetRow key={index} />
          ))}
        </div>
      </section>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <SkeletonButton />
        <SkeletonButton />
      </div>
      <SkeletonInput className="mb-3" />
      <section className="mb-8 space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonBudgetCategoryRow key={index} />
        ))}
      </section>
      <SkeletonCard className="sticky bottom-[calc(70px+env(safe-area-inset-bottom,0px))] p-3">
        <div className="mb-3 flex items-center justify-between">
          <SkeletonBlock className="h-3 w-20 rounded-full" />
          <SkeletonBlock className="h-4 w-24 rounded-full" />
        </div>
        <SkeletonButton className="rounded-full" />
      </SkeletonCard>
    </ProfileSkeletonPage>
  );
}

export function CategoriesProfileSkeleton() {
  return (
    <ProfileSkeletonPage>
      <ProfileSkeletonHeader />
      <SkeletonInput className="mb-4" />
      <SkeletonButton className="mb-3 border border-dashed border-[var(--color-border)] bg-transparent" />
      <SkeletonBlock className="mb-2 h-3 w-24 rounded-full" />
      <CategoriesListSkeleton />
    </ProfileSkeletonPage>
  );
}

export function CategoriesListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonCategoryRow key={index} />
      ))}
    </div>
  );
}

export function ClosingDayProfileSkeleton() {
  return (
    <ProfileSkeletonPage>
      <ProfileSkeletonHeader />
      <SkeletonCard className="rounded-[20px] p-5">
        <div className="mb-5 flex items-start gap-3 rounded-[14px] bg-[var(--color-surface-alt)] p-3">
          <SkeletonBlock className="h-9 w-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <SkeletonBlock className="h-4 w-28 rounded-full" />
            <SkeletonBlock className="mt-2 h-3 w-full rounded-full" />
          </div>
        </div>
        <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
          <SkeletonBlock className="mx-auto h-3 w-24 rounded-full" />
          <div className="mt-3 flex items-center justify-center gap-4">
            <SkeletonBlock className="h-10 w-10 rounded-full" />
            <SkeletonBlock className="h-14 w-20 rounded-[14px]" />
            <SkeletonBlock className="h-10 w-10 rounded-full" />
          </div>
          <SkeletonBlock className="mx-auto mt-3 h-3 w-36 rounded-full" />
        </div>
        <SkeletonButton className="mt-5 rounded-full" />
      </SkeletonCard>
    </ProfileSkeletonPage>
  );
}

export function NotificationsProfileSkeleton() {
  return (
    <ProfileSkeletonPage>
      <ProfileSkeletonHeader />
      <SkeletonCard className="mb-6 divide-y divide-[var(--color-border)] overflow-hidden p-0">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-start gap-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              <SkeletonBlock className="h-4 w-40 rounded-full" />
              <SkeletonBlock className="mt-2 h-3 w-full rounded-full" />
            </div>
            <SkeletonToggle checked={index === 0} />
          </div>
        ))}
      </SkeletonCard>
      <SkeletonButton />
    </ProfileSkeletonPage>
  );
}

export function CurrencyProfileSkeleton() {
  return (
    <ProfileSkeletonPage>
      <ProfileSkeletonHeader />
      <SkeletonCard className="mb-6 divide-y divide-[var(--color-border)] overflow-hidden p-0">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              <SkeletonBlock className="h-4 w-32 rounded-full" />
              <SkeletonBlock className="mt-2 h-3 w-40 rounded-full" />
            </div>
            <SkeletonBlock className="h-6 w-6 shrink-0 rounded-full" />
          </div>
        ))}
      </SkeletonCard>
      <SkeletonButton />
      <SkeletonBlock className="mx-auto mt-4 h-3 w-64 max-w-full rounded-full" />
    </ProfileSkeletonPage>
  );
}

export function PasswordProfileSkeleton() {
  return (
    <ProfileSkeletonPage>
      <ProfileSkeletonHeader />
      <SkeletonCard className="rounded-[20px] p-5">
        <SkeletonInfoStrip />
        <div className="space-y-4">
          <SkeletonLabeledInput />
          <SkeletonLabeledInput />
        </div>
        <SkeletonButton className="mt-5 rounded-full" />
      </SkeletonCard>
      <SkeletonCard className="mt-4 flex items-start gap-3 p-4">
        <SkeletonBlock className="h-9 w-9 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <SkeletonBlock className="h-4 w-36 rounded-full" />
          <SkeletonBlock className="mt-2 h-3 w-full rounded-full" />
          <SkeletonButton className="mt-3" />
        </div>
      </SkeletonCard>
    </ProfileSkeletonPage>
  );
}

export function WhatsappProfileSkeleton() {
  return (
    <ProfileSkeletonPage>
      <ProfileSkeletonHeader />
      <SkeletonCard className="mb-5 rounded-[20px] p-5">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-11 w-11 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <SkeletonBlock className="h-3 w-28 rounded-full" />
            <SkeletonBlock className="mt-3 h-8 w-44 rounded-full" />
          </div>
        </div>
        <SkeletonBlock className="mt-4 h-3 w-48 rounded-full" />
      </SkeletonCard>
      <SkeletonCard className="rounded-[20px] p-5">
        <SkeletonBlock className="mb-2 h-3 w-28 rounded-full" />
        <SkeletonInput className="h-[58px]" />
        <SkeletonInfoStrip className="mt-4" />
        <div className="mt-5 grid grid-cols-2 gap-2">
          <SkeletonButton />
          <SkeletonButton />
        </div>
      </SkeletonCard>
    </ProfileSkeletonPage>
  );
}

export function DeleteAccountProfileSkeleton() {
  return (
    <ProfileSkeletonPage>
      <ProfileSkeletonHeader centered />
      <SkeletonCard className="p-5">
        <SkeletonBlock className="h-4 w-48 rounded-full" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex min-h-12 items-center gap-3 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5">
              <SkeletonBlock className="h-4 w-4 shrink-0 rounded-[4px]" />
              <SkeletonBlock className="h-4 w-44 rounded-full" />
            </div>
          ))}
        </div>
        <SkeletonBlock className="mt-3 h-24 rounded-[12px]" />
      </SkeletonCard>
      <SkeletonCard className="mt-4 p-5">
        <SkeletonBlock className="h-4 w-40 rounded-full" />
        <SkeletonInput className="mt-3" />
        <div className="mt-4 flex gap-2">
          <SkeletonButton className="flex-1" />
          <SkeletonButton className="w-28" />
        </div>
      </SkeletonCard>
    </ProfileSkeletonPage>
  );
}

function SkeletonListRow({ amount = false }: { amount?: boolean }) {
  return (
    <SkeletonCard className="flex items-center gap-3 rounded-[10px] px-4 py-3">
      <SkeletonBlock className="h-10 w-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <SkeletonBlock className="h-4 w-36 rounded-full" />
        <SkeletonBlock className="mt-2 h-3 w-28 rounded-full" />
      </div>
      {amount && <SkeletonBlock className="h-4 w-20 shrink-0 rounded-full" />}
      <SkeletonBlock className="h-9 w-9 shrink-0 rounded-lg" />
    </SkeletonCard>
  );
}

function SkeletonPresetRow() {
  return (
    <SkeletonCard className="flex items-center gap-3 rounded-[14px] border border-[var(--color-border)] p-3">
      <SkeletonBlock className="h-8 w-8 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <SkeletonBlock className="h-4 w-32 rounded-full" />
        <SkeletonBlock className="mt-2 h-3 w-full rounded-full" />
      </div>
    </SkeletonCard>
  );
}

function SkeletonBudgetCategoryRow() {
  return (
    <SkeletonCard className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-[14px] border border-[var(--color-border)] p-3">
      <div className="flex min-w-0 items-center gap-3">
        <SkeletonBlock className="h-9 w-9 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <SkeletonBlock className="h-4 w-28 rounded-full" />
          <SkeletonBlock className="mt-2 h-3 w-16 rounded-full" />
        </div>
      </div>
      <SkeletonBlock className="h-10 w-32 rounded-[10px]" />
    </SkeletonCard>
  );
}

function SkeletonCategoryRow() {
  return (
    <SkeletonCard className="flex items-center gap-3 rounded-[12px] p-3.5">
      <SkeletonBlock className="h-9 w-9 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <SkeletonBlock className="h-4 w-36 rounded-full" />
        <div className="mt-2 flex gap-1.5">
          <SkeletonBlock className="h-5 w-12 rounded-full" />
          <SkeletonBlock className="h-5 w-16 rounded-full" />
        </div>
      </div>
      <SkeletonBlock className="h-3 w-3 shrink-0 rounded-full" />
    </SkeletonCard>
  );
}

function SkeletonInfoStrip({ className = '' }: { className?: string }) {
  return (
    <div className={`mb-4 flex items-start gap-3 rounded-[14px] bg-[var(--color-surface-alt)] p-3 ${className}`}>
      <SkeletonBlock className="h-9 w-9 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <SkeletonBlock className="h-4 w-32 rounded-full" />
        <SkeletonBlock className="mt-2 h-3 w-full rounded-full" />
      </div>
    </div>
  );
}

function SkeletonLabeledInput() {
  return (
    <div>
      <SkeletonBlock className="mb-2 h-3 w-24 rounded-full" />
      <SkeletonInput />
    </div>
  );
}
