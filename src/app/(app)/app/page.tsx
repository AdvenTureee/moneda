import { redirect } from 'next/navigation';
import Link from 'next/link';
import CategoryBreakdown from '@/components/CategoryBreakdown';
import RecentInstallmentExpenses from '@/components/RecentInstallmentExpenses';
import SpendingTimelineChart from '@/components/charts/SpendingTimelineChart';
import Mo from '@/components/Mo';
import Icon from '@/components/Icon';
import Confetti from '@/components/Confetti';
import MonthPicker from '@/components/MonthPicker';
import DashboardBalanceHero from '@/components/DashboardBalanceHero';
import PageHeader from '@/components/PageHeader';
import RefreshOnExpenseMutation from '@/components/RefreshOnExpenseMutation';
import { getDashboardMetrics, getSpendingTimeline } from '@/lib/expenses';
import { getBudgets } from '@/lib/budgets';
import { getMonthlyIncomeTotalCents } from '@/lib/incomes';
import { getMonthlyBudgetCents } from '@/lib/monthlyBudget';
import { getNullableBillingClosingDay, getProfileGateStatus } from '@/lib/profiles';
import { decryptProfilePii, getDisplayNameFromUser } from '@/lib/security/profilePii';
import { formatCurrency } from '@/lib/utils';
import { getCurrentBillingPeriod, normalizeBillingClosingDay } from '@/lib/billingCycle';
import { createServiceClient, createSessionClient, isSupabaseEnabled } from '@/lib/supabase/server';
import BillingClosingDayPrompt from '@/components/BillingClosingDayPrompt';
import { TERMS_VERSION } from '@/lib/legal';

// A page lê cookies de auth (createSessionClient) → Next a renderiza dinamicamente
// por padrão. As queries de DB dentro do render usam `unstable_cache` com tags
// (revalidate: 60s) — invalidação on-demand via revalidateTag em mutations.

function isValidPeriod(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  if (isSupabaseEnabled()) {
    const profile = await getProfileGateStatus(user.id);
    const requiresTermsAcceptance =
      !profile.termsAcceptedAt ||
      profile.termsVersion !== TERMS_VERSION;
    if (requiresTermsAcceptance) {
      return <div className="min-h-[60dvh]" aria-hidden />;
    }

    // First-login → send to onboarding. Lê de profiles.onboarded (não de
    // user_metadata, que provedores OAuth como o Google sobrescrevem a cada login).
    if (profile.onboarded !== true) {
      redirect('/onboarding');
    }
  }

  const sp = await searchParams;
  const nullableClosingDay = await getNullableBillingClosingDay(user.id);
  const billingClosingDay = normalizeBillingClosingDay(nullableClosingDay);
  const rawPeriod = Array.isArray(sp.period) ? sp.period[0] : sp.period;
  const period = isValidPeriod(rawPeriod) ? rawPeriod : getCurrentBillingPeriod(billingClosingDay);

  // Parallel DB queries
  const [metrics, budgets, monthlyBudgetCents, spendingTimeline, monthlyIncomeTotalCents] = await Promise.all([
    getDashboardMetrics(user.id, period, billingClosingDay),
    getBudgets(user.id, period),
    getMonthlyBudgetCents(user.id, period),
    getSpendingTimeline(user.id, period, billingClosingDay),
    getMonthlyIncomeTotalCents(user.id, period, billingClosingDay),
  ]);

  // Orçamento mensal = teto de gasto declarado. Se não existir, cai nos
  // budgets por categoria como último recurso para usuários antigos.
  const totalBudgetCents = budgets.reduce((sum, b) => sum + b.amountCents, 0);
  const BUDGET_CENTS = monthlyBudgetCents > 0 ? monthlyBudgetCents : totalBudgetCents;
  const remaining = BUDGET_CENTS + monthlyIncomeTotalCents - metrics.totalSpent;
  const budgetTotal = BUDGET_CENTS;
  const expensesTotal = metrics.totalSpent;
  const incomeTotal = monthlyIncomeTotalCents;
  const compactMetrics = [
    { label: 'Orçamento', value: formatCurrency(BUDGET_CENTS) },
    { label: 'Gasto', value: formatCurrency(metrics.totalSpent) },
    { label: 'Ganhos', value: formatCurrency(monthlyIncomeTotalCents) },
  ];

  // Custom personalized AI Welcome message if no insight exists yet.
  let fullName = getDisplayNameFromUser(user);
  if (isSupabaseEnabled()) {
    const admin = createServiceClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('name_ciphertext,name_iv,name_tag,email_ciphertext,email_iv,email_tag,phone_ciphertext,phone_iv,phone_tag')
      .eq('id', user.id)
      .single();
    if (profile) fullName = decryptProfilePii(profile).name || fullName;
  }
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? null;
  const financialShortcuts = (
    <>
      <Link
        href="/perfil/ganhos"
        className="group flex min-h-10 min-w-0 items-center justify-between gap-2 rounded-[12px] bg-[color-mix(in_srgb,var(--color-success)_8%,var(--color-surface)_92%)] px-3 py-2 text-[var(--color-text-primary)] transition-[background-color,transform] duration-150 active:scale-[0.99] hover:bg-[color-mix(in_srgb,var(--color-success)_12%,var(--color-surface)_88%)]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-success)_18%,var(--color-surface)_82%)] text-[var(--color-success)]">
            <Icon name="TrendUp" size={15} weight="bold" />
          </span>
          <span className="truncate text-sm font-bold">Ganhos</span>
        </span>
        <span className="shrink-0 text-sm font-bold text-[var(--color-text-tertiary)] transition-transform duration-150 group-hover:translate-x-0.5">
          ›
        </span>
      </Link>

      <Link
        href={`/insights?period=${period}&open=monthly_summary`}
        className="group flex min-h-10 min-w-0 items-center justify-between gap-2 rounded-[12px] bg-[color-mix(in_srgb,var(--color-success)_8%,var(--color-surface)_92%)] px-3 py-2 text-[var(--color-text-primary)] transition-[background-color,transform] duration-150 active:scale-[0.99] hover:bg-[color-mix(in_srgb,var(--color-success)_12%,var(--color-surface)_88%)]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-success)_18%,var(--color-surface)_82%)] text-[var(--color-success)]">
            <Icon name="Sparkle" size={15} weight="bold" />
          </span>
          <span className="truncate text-sm font-bold">Resumo</span>
        </span>
        <span className="shrink-0 text-sm font-bold text-[var(--color-text-tertiary)] transition-transform duration-150 group-hover:translate-x-0.5">
          ›
        </span>
      </Link>
    </>
  );

  return (
    <>
      <RefreshOnExpenseMutation />
      <div className="max-w-lg mx-auto px-4">
        <PageHeader
          title="Moneda"
          subtitle="Seu dinheiro, finalmente claro."
          action={
            <Link
              href="/perfil"
              className="dashboard-avatar-frame text-lg font-bold text-white"
              aria-label={user.email ?? 'Usuário'}
            >
              <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#A8C5E0]">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-full w-full object-cover object-center"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  fullName?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? '?'
                )}
              </span>
            </Link>
          }
          className="relative z-40 min-h-[88px] pb-2"
        />

        <DashboardBalanceHero budgetTotal={budgetTotal} expensesTotal={expensesTotal} incomeTotal={incomeTotal} period={period} displayName={fullName} />

        <section className="mb-3 animate-fade-up delay-2" aria-label="Ciclo financeiro">
          <MonthPicker value={period} closingDay={billingClosingDay} fullWidth />
        </section>

        <section
          className="themed-card mb-4 grid grid-cols-2 gap-4 rounded-[14px] bg-white p-2 animate-fade-up delay-3 md:grid-cols-[1.1fr_1.1fr_0.9fr]"
          aria-label="Resumo financeiro do ciclo"
        >
          {compactMetrics.map((item, index) => (
            <div
              key={item.label}
              className={`min-w-0 rounded-[10px] px-2 py-2 text-left ${index === 2 ? 'col-span-2 md:col-span-1' : ''}`}
            >
              <div className="mb-1 flex items-center justify-start gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">
                {index === 0 && <Icon name="Wallet" size={14} />}
                {index === 1 && <Icon name="TrendDown" size={14} />}
                {index === 2 && <Icon name="TrendUp" size={14} />}
                <p>{item.label}</p>
              </div>
              <p className="whitespace-nowrap text-base font-bold leading-none tabular-nums text-[var(--color-text-primary)]">
                {item.value}
              </p>
            </div>
          ))}
        </section>

        {/* Category breakdown */}
        {metrics.topCategories.length > 0 && (
          <section
            className="themed-card mb-4 bg-white rounded-[16px] p-5 animate-fade-up delay-4"
            aria-label="Gastos por categoria"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-heading text-[#1A1D23]">Por categoria</h2>
              <Link href="/feed" className="text-base font-medium text-[#A8C5E0]">
                Ver tudo
              </Link>
            </div>

            <CategoryBreakdown
              categories={metrics.topCategories}
              total={metrics.totalSpent}
              expensesByCategory={metrics.expensesByCategory}
            />

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[color-mix(in_srgb,var(--color-border)_72%,transparent)] pt-3" aria-label="Atalhos financeiros">
              {financialShortcuts}
            </div>
          </section>
        )}

        {metrics.topCategories.length === 0 && (
          <section
            className="mb-4 grid grid-cols-2 gap-2 animate-fade-up delay-4"
            aria-label="Atalhos financeiros"
          >
            {financialShortcuts}
          </section>
        )}

        {/* Spending timeline */}
        <section className="mb-6 animate-fade-up delay-5">
          <SpendingTimelineChart data={spendingTimeline} />
        </section>

        {/* Recent expenses */}
        <section aria-label="Últimos gastos" className="animate-fade-up delay-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-heading text-[#1A1D23]">Últimos gastos</h2>
            <Link href="/feed" className="text-xs font-medium text-[#A8C5E0]">
              Ver feed
            </Link>
          </div>

          {metrics.recentExpenses.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Mo variant="sad" size={128} className="mb-4 animate-bounce-in" />
              <p className="text-base font-heading text-[#1A1D23]">Nenhum gasto ainda</p>
              <p className="text-sm text-[#6B7280] mt-1 max-w-[260px]">
                Comece adicionando sua primeira despesa.
              </p>
            </div>
          ) : (
            <RecentInstallmentExpenses
              expenses={metrics.recentExpenses}
              billingClosingDay={billingClosingDay}
            />
          )}
        </section>

        <div className="h-6" />
      </div>
      <BillingClosingDayPrompt open={isSupabaseEnabled() && nullableClosingDay === null} initialDay={billingClosingDay} />
      {remaining > 0 && <Confetti trigger sessionKey="dashboard-confetti" delayMs={700} />}
    </>
  );
}
