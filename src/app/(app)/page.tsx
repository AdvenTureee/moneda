import { redirect } from 'next/navigation';
import Link from 'next/link';
import PageRefreshWrapper from '@/components/PageRefreshWrapper';
import DashboardMetric from '@/components/DashboardMetric';
import AIInsightBanner from '@/components/AIInsightBanner';
import ExpenseCard from '@/components/ExpenseCard';
import CategoryBreakdown from '@/components/CategoryBreakdown';
import DailyHistogram from '@/components/charts/DailyHistogram';
import TrackedMascot from '@/components/TrackedMascot';
import MoTipBubble from '@/components/MoTipBubble';
import Mo from '@/components/Mo';
import Confetti from '@/components/Confetti';
import MonthPicker from '@/components/MonthPicker';
import RegenerateInsightButton from '@/components/RegenerateInsightButton';
import { getDashboardMetrics } from '@/lib/expenses';
import { getBudgets } from '@/lib/budgets';
import { getLatestInsight } from '@/lib/insights';
import { getMonthlyBudgetCents } from '@/lib/monthlyBudget';
import { createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';

async function isUserOnboarded(userId: string): Promise<boolean> {
  if (!isSupabaseEnabled()) return true;
  const admin = createServiceClient();
  const { data } = await admin
    .from('profiles')
    .select('onboarded')
    .eq('id', userId)
    .single();
  return data?.onboarded === true;
}
import { formatCurrency, getCurrentPeriod } from '@/lib/utils';
import { createSessionClient } from '@/lib/supabase/server';

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
  const [metrics, budgets, latestInsight, monthlyBudgetCents] = await Promise.all([
    getDashboardMetrics(user.id, period),
    getBudgets(user.id, period),
    getLatestInsight(user.id, period),
    getMonthlyBudgetCents(user.id, period),
  ]);

  // Orçamento mensal = renda base (profiles.monthly_income_cents) + incomes
  // válidos no período. Se nada disso existir, cai nos budgets por categoria
  // como último recurso para usuários antigos.
  const totalBudgetCents = budgets.reduce((sum, b) => sum + b.amountCents, 0);
  const BUDGET_CENTS = monthlyBudgetCents > 0 ? monthlyBudgetCents : totalBudgetCents;
  const remaining = BUDGET_CENTS - metrics.totalSpent;

  // Custom personalized AI Welcome message if no insight exists yet
  const metadata = user.user_metadata ?? {};
  const fullName = (metadata.name as string | undefined) ??
    (metadata.full_name as string | undefined) ??
    '';
  const firstName = fullName ? fullName.split(' ')[0] : 'Gabriel';
  const avatarUrl = (metadata.avatar_url as string | undefined) ?? null;
  const welcomeMessage = `Olá, ${firstName}! Bem-vindo(a) ao Moneda. Conforme você cadastrar seus gastos ou nos enviar pelo WhatsApp, nossa Inteligência Artificial analisará seus hábitos de consumo para gerar insights financeiros personalizados aqui!`;

  const insightMessage = latestInsight ? latestInsight.message : welcomeMessage;

  return (
    <>
      <PageRefreshWrapper>
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <header className="relative z-40 flex items-center justify-between py-5 animate-fade-up delay-0">
          <div className="flex items-center gap-3">
            <TrackedMascot variant="idle" size={100} />
            <MonthPicker value={period} />
          </div>
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 overflow-hidden ring-4 ring-[#5BBF8E] ring-offset-0"
            style={{ background: '#A8C5E0' }}
            aria-label={user.email ?? 'Usuário'}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              fullName?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? '?'
            )}
          </div>
        </header>

        <MoTipBubble />

        {/* Hero: restante do mês (principal) */}
        <section className="mb-5 animate-fade-up delay-1" aria-label="Restante do mês">
          <p className="text-xs text-[#6B7280] font-medium mb-1">
            Restante este mês
          </p>
          <p
            className="text-[40px] font-extrabold tabular-nums leading-none"
            style={{ color: remaining >= 0 ? '#1A1D23' : '#E07070' }}
            aria-label={
              remaining >= 0
                ? `Restante: ${formatCurrency(remaining)}`
                : `Estourou em ${formatCurrency(Math.abs(remaining))}`
            }
          >
            {remaining >= 0 ? formatCurrency(remaining) : 'Estourou!'}
          </p>
          {remaining < 0 && (
            <p className="text-xs mt-1 font-medium text-[#E07070]">
              −{formatCurrency(Math.abs(remaining))}
            </p>
          )}
        </section>

        {/* Metric cards */}
        <section className="flex gap-3 mb-6 animate-fade-up delay-2" aria-label="Métricas do mês">
          <DashboardMetric
            label="Orçamento"
            value={formatCurrency(BUDGET_CENTS)}
          />
          <DashboardMetric
            label="Gasto total"
            value={formatCurrency(metrics.totalSpent)}
          />
        </section>

        {/* Category breakdown */}
        {metrics.topCategories.length > 0 && (
          <section
            className="mb-6 bg-white rounded-[16px] p-5 animate-fade-up delay-4"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
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

        {/* Daily histogram */}
        {metrics.dailySpending.length > 0 && (
          <section className="mb-6">
            <DailyHistogram data={metrics.dailySpending} period={period} />
          </section>
        )}

        {/* AI Insight banner */}
        <section className="mb-6 animate-fade-up delay-5" aria-label="Resumo do mês">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-heading text-[#1A1D23]">Resumo do mês</h2>
          </div>
          <AIInsightBanner
            message={insightMessage}
            preview
            cta={{ label: 'Ver mais', href: `/insights?period=${period}` }}
          >
            <RegenerateInsightButton period={period} hasInsight={Boolean(latestInsight)} hideHeading variant="card" />
          </AIInsightBanner>
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
                E aí, cadê os gastos? 🕵️ Comece adicionando sua primeira despesa.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {metrics.recentExpenses.map((expense, i) => (
                <div key={expense.id} className={`animate-fade-up delay-${Math.min(i + 6, 8)}`}>
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
      </PageRefreshWrapper>
      {remaining > 0 && <Confetti trigger sessionKey="dashboard-confetti" />}
    </>
  );
}
