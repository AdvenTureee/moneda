import { redirect } from 'next/navigation';
import Link from 'next/link';
import DashboardMetric from '@/components/DashboardMetric';
import AIInsightBanner from '@/components/AIInsightBanner';
import ExpenseCard from '@/components/ExpenseCard';
import CategoryBreakdown from '@/components/CategoryBreakdown';
import SpendingTimelineChart from '@/components/charts/SpendingTimelineChart';
import TrackedMascot from '@/components/TrackedMascot';
import MoTipBubble from '@/components/MoTipBubble';
import Mo from '@/components/Mo';
import Icon from '@/components/Icon';
import Confetti from '@/components/Confetti';
import MonthPicker from '@/components/MonthPicker';
import RegenerateInsightButton from '@/components/RegenerateInsightButton';
import { getDashboardMetrics, getSpendingTimeline } from '@/lib/expenses';
import { getBudgets } from '@/lib/budgets';
import { getLatestInsight } from '@/lib/insights';
import { getMonthlyIncomeTotalCents } from '@/lib/incomes';
import { getMonthlyBudgetCents } from '@/lib/monthlyBudget';
import { isUserOnboarded } from '@/lib/profiles';
import { decryptProfilePii, getDisplayNameFromUser } from '@/lib/security/profilePii';
import { formatCurrency, getCurrentPeriod, isClosedMonthlyPeriod } from '@/lib/utils';
import { createServiceClient, createSessionClient, isSupabaseEnabled } from '@/lib/supabase/server';

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

  // First-login → send to onboarding. Lê de profiles.onboarded (não de
  // user_metadata, que provedores OAuth como o Google sobrescrevem a cada login).
  if (!(await isUserOnboarded(user.id))) {
    redirect('/onboarding');
  }

  const sp = await searchParams;
  const rawPeriod = Array.isArray(sp.period) ? sp.period[0] : sp.period;
  const period = isValidPeriod(rawPeriod) ? rawPeriod : getCurrentPeriod();

  // Parallel DB queries
  const [metrics, budgets, latestInsight, monthlyBudgetCents, spendingTimeline, monthlyIncomeTotalCents] = await Promise.all([
    getDashboardMetrics(user.id, period),
    getBudgets(user.id, period),
    getLatestInsight(user.id, period),
    getMonthlyBudgetCents(user.id, period),
    getSpendingTimeline(user.id, period),
    getMonthlyIncomeTotalCents(user.id, period),
  ]);

  // Orçamento mensal = teto de gasto declarado. Se não existir, cai nos
  // budgets por categoria como último recurso para usuários antigos.
  const totalBudgetCents = budgets.reduce((sum, b) => sum + b.amountCents, 0);
  const BUDGET_CENTS = monthlyBudgetCents > 0 ? monthlyBudgetCents : totalBudgetCents;
  const remaining = BUDGET_CENTS + monthlyIncomeTotalCents - metrics.totalSpent;

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
  const firstName = fullName ? fullName.split(' ')[0] : 'Gabriel';
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? null;
  const welcomeMessage = `Olá, ${firstName}! Bem-vindo(a) ao Moneda. Conforme você cadastrar seus gastos ou nos enviar pelo WhatsApp, nossa Inteligência Artificial analisará seus hábitos de consumo para gerar insights financeiros personalizados aqui!`;

  const insightMessage = latestInsight ? latestInsight.message : welcomeMessage;
  const isMonthlySummaryClosed = isClosedMonthlyPeriod(period);

  return (
    <>
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <header className="relative z-40 pt-8 pb-3 animate-fade-up delay-0">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-heading font-bold tracking-tight text-[var(--color-text-primary)]">
              Moneda
            </h1>
            <div className="flex items-center gap-4">
              <MonthPicker value={period} />
              <Link
                href="/perfil"
                className="h-[60px] w-[60px] shrink-0 overflow-hidden rounded-full bg-[#A8C5E0] flex items-center justify-center text-lg font-bold text-white ring-[3px] ring-[#5BBF8E]/80 ring-offset-[3px] ring-offset-[var(--background)] shadow-[0_10px_24px_rgba(0,0,0,0.14)] transition-[transform,box-shadow,ring-color] duration-200 hover:scale-[1.03] hover:ring-[#5BBF8E] focus:outline-none focus-visible:ring-4"
                style={{ background: '#A8C5E0' }}
                aria-label={user.email ?? 'Usuário'}
              >
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
              </Link>
            </div>
          </div>
        </header>

        <section className="dashboard-mo-tip-row flex items-center gap-5 pb-4 animate-fade-up delay-1">
          <div className="shrink-0">
            <TrackedMascot variant="idle" size={124} />
          </div>
          <div className="flex-1 min-w-0">
            <MoTipBubble period={period} />
          </div>
        </section>

        {/* Hero: dinheiro restante (principal) */}
        <section className="mb-5 animate-fade-up delay-2" aria-label="Dinheiro restante">
          <p className="text-xs text-[#6B7280] font-medium mb-1">
            Dinheiro restante
          </p>
          <p
            className="text-[40px] font-extrabold tabular-nums leading-none"
            style={{ color: remaining >= 0 ? 'var(--color-text-primary)' : 'var(--color-error)' }}
            aria-label={
              remaining >= 0
                ? `Restante: ${formatCurrency(remaining)}`
                : `Estourou em ${formatCurrency(Math.abs(remaining))}`
            }
          >
            {remaining >= 0 ? formatCurrency(remaining) : 'Estourou!'}
          </p>
          {remaining < 0 && (
            <div className="mt-2 space-y-2">
              <p className="text-xs font-medium text-[#E07070]">
                −{formatCurrency(Math.abs(remaining))}
              </p>
              <Link
                href="/perfil/ganhos"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#FDF0F0] px-3 py-2 text-xs font-bold text-[#B14C4C] transition-colors hover:bg-[#F8E4E4]"
              >
                Cadastrar ganho para abater o estouro
                <span aria-hidden>›</span>
              </Link>
            </div>
          )}
        </section>

        {/* Metric cards */}
        <section className="flex flex-wrap gap-3 mb-3 animate-fade-up delay-3" aria-label="Métricas do mês">
          <DashboardMetric
            label="Orçamento"
            value={formatCurrency(BUDGET_CENTS)}
          />
          {monthlyIncomeTotalCents > 0 && (
            <DashboardMetric
              label="Ganhos do mês"
              value={formatCurrency(monthlyIncomeTotalCents)}
            />
          )}
          <DashboardMetric
            label="Gasto total"
            value={formatCurrency(metrics.totalSpent)}
          />
        </section>

        <section className="mb-4 animate-fade-up delay-4" aria-label="Atalho para ganhos">
          <Link
            href="/perfil/ganhos"
            className="themed-card group flex min-h-12 items-center gap-2.5 rounded-[14px] bg-white px-3.5 py-2.5 transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.99] hover:shadow-[var(--shadow-card)]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-success)_16%,var(--color-surface)_84%)] text-[var(--color-success)]">
              <Icon name="TrendUp" size={17} weight="bold" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-[var(--color-text-primary)]">
                Ganhos do mês
              </span>
              <span className="block truncate text-[11px] leading-tight text-[var(--color-text-secondary)]">
                Registre ganhos para abater estouros
              </span>
            </span>
            <span className="text-base font-bold text-[var(--color-text-tertiary)] transition-transform duration-150 group-hover:translate-x-0.5">
              ›
            </span>
          </Link>
        </section>

        {/* Category breakdown */}
        {metrics.topCategories.length > 0 && (
          <section
            className="themed-card mb-6 bg-white rounded-[16px] p-5 animate-fade-up delay-5"
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
          </section>
        )}

        {/* Spending timeline */}
        <section className="mb-6 animate-fade-up delay-6">
          <SpendingTimelineChart data={spendingTimeline} />
        </section>

        {/* AI Insight banner */}
        <section className="mb-6 animate-fade-up delay-7" aria-label="Resumo do mês">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-heading text-[#1A1D23]">Resumo do mês</h2>
          </div>
          <AIInsightBanner
            message={insightMessage}
            preview
            dismissible={false}
            cta={{ label: 'Ver mais', href: `/insights?period=${period}&open=monthly_summary` }}
            footerNote={!isMonthlySummaryClosed ? 'Disponível quando o mês fechar.' : undefined}
          >
            <RegenerateInsightButton period={period} hasInsight={Boolean(latestInsight)} hideHeading variant="card" />
          </AIInsightBanner>
        </section>

        {/* Recent expenses */}
        <section aria-label="Últimos gastos" className="animate-fade-up delay-8">
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
            <div className="space-y-2">
              {metrics.recentExpenses.map((expense, i) => (
                <div key={expense.id} className={`animate-fade-up delay-${Math.min(i + 8, 9)}`}>
                  <ExpenseCard
                    expense={expense}
                    variant="compact"
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="h-6" />
      </div>
      {remaining > 0 && <Confetti trigger sessionKey="dashboard-confetti" />}
    </>
  );
}
