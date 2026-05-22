import { redirect } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import DashboardMetric from '@/components/DashboardMetric';
import AIInsightBanner from '@/components/AIInsightBanner';
import ExpenseCard from '@/components/ExpenseCard';
import DonutChart from '@/components/charts/DonutChart';
import DailyHistogram from '@/components/charts/DailyHistogram';
import Icon from '@/components/Icon';
import TrackedMascot from '@/components/TrackedMascot';
import MoTipBubble from '@/components/MoTipBubble';
import Mo from '@/components/Mo';
import Confetti from '@/components/Confetti';
import MonthPicker from '@/components/MonthPicker';
import RegenerateInsightButton from '@/components/RegenerateInsightButton';
import { getDashboardMetrics } from '@/lib/expenses';
import { getBudgets } from '@/lib/budgets';
import { getLatestInsight } from '@/lib/insights';
import { formatCurrency, getCurrentPeriod } from '@/lib/utils';
import { createSessionClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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

  const sp = await searchParams;
  const rawPeriod = Array.isArray(sp.period) ? sp.period[0] : sp.period;
  const period = isValidPeriod(rawPeriod) ? rawPeriod : getCurrentPeriod();

  // Parallel DB queries
  const [metrics, budgets, latestInsight] = await Promise.all([
    getDashboardMetrics(user.id, period),
    getBudgets(user.id, period),
    getLatestInsight(user.id, period),
  ]);

  const donutSegments = metrics.topCategories.map((cat) => ({
    category: cat.categoryName,
    amount: cat.amount,
    color: cat.categoryColor,
    icon: cat.categoryIcon,
  }));

  // Calculate sum of category budgets, fallback to R$ 3.500 if zero
  const totalBudgetCents = budgets.reduce((sum, b) => sum + b.amountCents, 0);
  const BUDGET_CENTS = totalBudgetCents > 0 ? totalBudgetCents : 350000;
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
    <AppShell>
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <header className="relative z-40 flex items-center justify-between py-5 animate-fade-up delay-0">
          <div className="flex items-center gap-3">
            <TrackedMascot variant="idle" size={88} />
            <MonthPicker value={period} />
          </div>
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 overflow-hidden"
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

        {/* Donut chart */}
        {metrics.topCategories.length > 0 && (
          <section
            className="mb-6 bg-white rounded-[16px] p-5 animate-fade-up delay-3"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            aria-label="Gastos por categoria"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-heading text-[#1A1D23]">Por categoria</h2>
              <Link href="/feed" className="text-xs font-medium text-[#A8C5E0]">
                Ver tudo
              </Link>
            </div>

            <div className="flex items-center gap-5">
              <DonutChart
                segments={donutSegments}
                size="md"
                centerLabel="Total"
                centerValue={formatCurrency(metrics.totalSpent)}
              />

              <div className="flex-1 space-y-2 overflow-hidden">
                {metrics.topCategories.slice(0, 4).map((cat, i) => (
                  <div key={cat.categoryId} className={`flex items-center gap-2 animate-fade-up delay-${i + 3}`}>
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: cat.categoryColor }}
                      aria-hidden
                    />
                    <span className="flex-1 text-xs text-[#1A1D23] truncate">
                      <Icon name={cat.categoryIcon} size={14} className="inline" /> {cat.categoryName}
                    </span>
                    <span className="text-xs font-semibold text-[#1A1D23] tabular-nums shrink-0">
                      {formatCurrency(cat.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Daily histogram */}
        {metrics.dailySpending.length > 0 && (
          <section className="mb-6">
            <DailyHistogram data={metrics.dailySpending} period={period} />
          </section>
        )}

        {/* AI Insight banner */}
        <section className="mb-6 animate-fade-up delay-4" aria-label="Resumo do mês">
          <RegenerateInsightButton period={period} hasInsight={Boolean(latestInsight)} />
          <AIInsightBanner
            message={insightMessage}
            preview
            cta={{ label: 'Ver mais', href: `/insights?period=${period}` }}
          />
        </section>

        {/* Recent expenses */}
        <section aria-label="Últimos gastos" className="animate-fade-up delay-5">
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
      {remaining > 0 && <Confetti trigger sessionKey="dashboard-confetti" />}
    </AppShell>
  );
}
