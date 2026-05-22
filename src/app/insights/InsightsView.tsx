'use client';

import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import Icon from '@/components/Icon';
import Mo from '@/components/Mo';
import DonutChart from '@/components/charts/DonutChart';
import MonthlyTrendChart, { type MonthlyTrendPoint } from '@/components/charts/MonthlyTrendChart';
import BudgetProgressList, { type BudgetProgressItem } from '@/components/charts/BudgetProgressList';
import ChartCard from '@/components/charts/ChartCard';
import CategoryChip from '@/components/CategoryChip';
import { formatCurrency } from '@/lib/utils';
import type { Category, AIInsight } from '@/types';

interface TopCategory {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amount: number;
  percentage: number;
}

interface InsightsViewProps {
  period: string;
  monthName: string;
  totalSpent: number;
  expenseCount: number;
  changePct: number | null;
  topCategories: TopCategory[];
  insights: AIInsight[];
  categories: Category[];
  monthlyTotals: MonthlyTrendPoint[];
  budgetProgress: BudgetProgressItem[];
}

const TYPE_FILTERS = [
  { value: null, label: 'Todos', icon: 'Sparkle' },
  { value: 'monthly_summary', label: 'Resumos', icon: 'Lightbulb' },
  { value: 'category_alert', label: 'Alertas', icon: 'Warning' },
  { value: 'spending_pattern', label: 'Padrões', icon: 'TrendUp' },
] as const;

const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  monthly_summary: { label: 'Resumo Mensal', icon: 'Lightbulb', color: '#5BBF8E' },
  category_alert: { label: 'Alerta de Gasto', icon: 'Warning', color: '#F0A855' },
  spending_pattern: { label: 'Padrão de Gasto', icon: 'TrendUp', color: '#7AAECF' },
};

function formatInsightPeriod(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
}

export default function InsightsView({
  period,
  monthName,
  totalSpent,
  expenseCount,
  changePct,
  topCategories,
  insights: initialInsights,
  categories,
  monthlyTotals,
  budgetProgress,
}: InsightsViewProps) {
  const [generating, setGenerating] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>(initialInsights);
  const [genError, setGenError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const donutSegments = topCategories.map((cat) => ({
    category: cat.categoryName,
    amount: cat.amount,
    color: cat.categoryColor,
    icon: cat.categoryIcon,
  }));

  const filteredInsights = useMemo(() => {
    let result = [...insights];

    if (activeType) {
      result = result.filter((i) => i.type === activeType);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((i) => i.message.toLowerCase().includes(q));
    }

    result.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
    return result;
  }, [insights, activeType, search]);

  const groupedByType = useMemo(() => {
    const groups = new Map<string, AIInsight[]>();
    const order = ['monthly_summary', 'category_alert', 'spending_pattern'];
    for (const type of order) {
      const items = filteredInsights.filter((i) => i.type === type);
      if (items.length > 0) groups.set(type, items);
    }
    return groups;
  }, [filteredInsights]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error ?? 'Erro ao gerar análise.');
        return;
      }

      const newInsight: AIInsight = {
        id: data.id,
        userId: '',
        type: data.type,
        message: data.message,
        period: data.period,
        metadata: data.metadata ?? {},
        generatedAt: new Date(data.generatedAt),
        createdAt: new Date(),
      };

      setInsights((prev) => {
        const idx = prev.findIndex((i) => i.id === newInsight.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = newInsight;
          return copy;
        }
        return [newInsight, ...prev];
      });
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.add(newInsight.id);
        return next;
      });
    } catch {
      setGenError('Erro ao conectar com o servidor.');
    } finally {
      setGenerating(false);
    }
  }

  function handleTypeClick(value: string | null) {
    setActiveType((prev) => (prev === value ? null : value));
  }

  const markdownComponents: Components = {
    p: ({ children }) => <p className="text-sm text-[#1A1D23] mb-3 last:mb-0">{children}</p>,
    strong: ({ children }) => <strong className="font-semibold text-[#1A1D23]">{children}</strong>,
    ul: ({ children }) => <ul className="space-y-1 mb-3 last:mb-0">{children}</ul>,
    ol: ({ children }) => <ol className="space-y-1 mb-3 last:mb-0 list-decimal ml-4">{children}</ol>,
    li: ({ children }) => <li className="text-sm text-[#1A1D23] ml-4 list-disc">{children}</li>,
    h1: ({ children }) => <h1 className="text-base font-heading text-[#1A1D23] mb-3">{children}</h1>,
    h2: ({ children }) => <h2 className="text-base font-heading text-[#1A1D23] mb-3">{children}</h2>,
    h3: ({ children }) => <h3 className="text-sm font-heading text-[#1A1D23] mb-2">{children}</h3>,
  };

  const hasFilter = activeType !== null || search.trim().length > 0;

  return (
    <div className="max-w-lg mx-auto px-4 pb-24">
      {/* Header */}
      <header className="py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-heading text-[#1A1D23]">Insights</h1>
            <p className="text-xs text-[#6B7280] mt-1 capitalize">{monthName}</p>
          </div>
          {topCategories.length > 0 && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-1.5 text-xs font-bold rounded-full bg-[#5BBF8E] text-white active:scale-95 transition-all duration-75 disabled:opacity-40 shadow-sm hover:brightness-105"
              style={{ boxShadow: '0 4px 14px rgba(91, 191, 142, 0.3)' }}
            >
              {generating ? 'Gerando…' : insights.length > 0 ? 'Regenerar' : 'Gerar'}
            </button>
          )}
        </div>
      </header>

      {/* Hero total */}
      <section
        className="bg-gradient-to-br from-[#A8C5E0] to-[#7AAECF] text-white rounded-[20px] p-5 mb-6 shadow-md"
        style={{ boxShadow: '0 8px 24px rgba(168, 197, 224, 0.3)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider opacity-85">Gasto total</p>
        <p className="text-3xl font-extrabold mt-1.5 tabular-nums">
          {formatCurrency(totalSpent)}
        </p>
        <div className="flex items-center gap-4 mt-2">
          <p className="text-xs opacity-75">{expenseCount} transações</p>
          {changePct !== null && (
            <p className={`text-xs font-semibold ${changePct > 0 ? 'text-red-200' : 'text-green-200'}`}>
              {changePct > 0 ? `↑ ${changePct}%` : `↓ ${Math.abs(changePct)}%`} em relação ao mês anterior
            </p>
          )}
        </div>
      </section>

      {/* Category breakdown */}
      {topCategories.length > 0 && (
        <div className="mb-6 animate-fade-up delay-2">
          <ChartCard
            title="Gastos por categoria"
            ariaLabel="Gastos por categoria"
          >
            <div className="flex items-center gap-5">
              <DonutChart
                segments={donutSegments}
                size="md"
                centerLabel="Total"
                centerValue={formatCurrency(totalSpent)}
              />

              <div className="flex-1 space-y-2 overflow-hidden">
                {topCategories.map((cat) => (
                  <div key={cat.categoryId} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: cat.categoryColor }}
                      aria-hidden
                    />
                    <Icon name={cat.categoryIcon} size={14} className="shrink-0" />
                    <span className="flex-1 text-xs text-[#1A1D23] truncate">{cat.categoryName}</span>
                    <span className="text-xs font-semibold text-[#1A1D23] tabular-nums shrink-0">{formatCurrency(cat.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>
      )}

      {/* Monthly trend */}
      {monthlyTotals.some((m) => m.total > 0) && (
        <div className="mb-6">
          <MonthlyTrendChart data={monthlyTotals} currentPeriod={period} />
        </div>
      )}

      {/* Budget progress */}
      {budgetProgress.length > 0 && (
        <div className="mb-6">
          <BudgetProgressList items={budgetProgress} />
        </div>
      )}

      {/* Empty state — no expenses */}
      {topCategories.length === 0 && (
        <section
          className="bg-white rounded-[16px] p-8 mb-6 text-center"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <Mo variant="sad" size={128} className="mx-auto mb-3 animate-bounce-in" />
          <p className="text-base font-semibold text-[#1A1D23]">Nenhum gasto no período</p>
          <p className="text-sm text-[#6B7280] mt-1 max-w-[260px] mx-auto">
            Cadastre seus gastos que eu analiso tudo pra você! 🪙
          </p>
        </section>
      )}

      {/* AI Insights Section */}
      <section className="mb-6">
        <h2 className="text-sm font-heading text-[#1A1D23] mb-3">
          Análise da Mo
        </h2>

        {/* Search + Type filter */}
        {insights.length > 0 && (
          <div className="mb-4">
            <div className="relative mb-3">
              <Icon name="MagnifyingGlass" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar insights..."
                className="w-full pl-9 pr-4 py-2.5 rounded-[10px] bg-white border border-[#E5E7EB] text-sm text-[#1A1D23] placeholder:text-[#9CA3AF] outline-none focus:border-[#A8C5E0] transition-colors"
                aria-label="Buscar insights"
              />
            </div>
            <div
              className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4"
              style={{ scrollbarWidth: 'none' }}
              role="group"
              aria-label="Filtrar por tipo"
            >
              {TYPE_FILTERS.map((f) => (
                <CategoryChip
                  key={f.label}
                  icon={f.icon}
                  label={f.label}
                  selected={activeType === f.value}
                  onClick={() => handleTypeClick(f.value)}
                  size="sm"
                />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {genError && (
          <p className="text-xs text-[#E07070] mb-3">{genError}</p>
        )}

        {/* Generating spinner */}
        {generating && (
          <div
            className="bg-white rounded-[16px] p-5 mb-4"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 border-2 border-[#A8C5E0] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[#6B7280]">Analisando seus gastos…</p>
            </div>
          </div>
        )}

        {/* Empty state — no insights yet */}
        {!generating && insights.length === 0 && topCategories.length > 0 && (
          <div
            className="bg-white rounded-[16px] p-6 text-center"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <Mo variant="thinking" size={112} className="mx-auto mb-2" />
            <p className="text-sm text-[#6B7280]">
              Nenhuma análise gerada ainda.
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="mt-3 px-5 py-2.5 text-sm font-semibold text-white bg-[#A8C5E0] hover:bg-[#7AAECF] rounded-[10px] transition-colors"
            >
              Gerar primeira análise
            </button>
          </div>
        )}

        {/* Empty filter results */}
        {!generating && insights.length > 0 && filteredInsights.length === 0 && (
          <div
            className="bg-white rounded-[16px] p-6 text-center"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <Mo variant="thinking" size={104} className="mx-auto mb-2" />
            <p className="text-sm text-[#6B7280]">
              Nenhum resultado para {search ? `"${search.trim()}"` : 'este filtro'}.
            </p>
            {hasFilter && (
              <button
                type="button"
                onClick={() => { setSearch(''); setActiveType(null); }}
                className="mt-2 text-xs text-[#A8C5E0] hover:text-[#7AAECF] transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {/* Insight groups */}
        {!generating && filteredInsights.length > 0 && (
          <div className="space-y-5">
            {Array.from(groupedByType.entries()).map(([type, items]) => {
              const meta = TYPE_META[type];
              return (
                <div key={type}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                    {meta.label}
                  </h3>
                  <div className="space-y-2">
                    {items.map((insight) => {
                      const expanded = expandedIds.has(insight.id);
                      const alerts = insight.metadata?.alerts as string[] | undefined;
                      return (
                        <div
                          key={insight.id}
                          className="bg-white rounded-[12px] overflow-hidden transition-shadow duration-150"
                          style={{
                            boxShadow: expanded
                              ? '0 2px 12px rgba(0,0,0,0.08)'
                              : '0 1px 4px rgba(0,0,0,0.05)',
                          }}
                        >
                          {/* Card header */}
                          <button
                            type="button"
                            onClick={() => toggleExpand(insight.id)}
                            className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-[#F8F9FB] transition-colors"
                          >
                            <Icon name={meta.icon} size={18} color={meta.color} />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-semibold text-[#1A1D23] block truncate">
                                {meta.label}
                              </span>
                              <span className="text-xs text-[#6B7280] block">
                                {formatInsightPeriod(insight.generatedAt)}
                              </span>
                            </div>
                            <span className={`text-[#9CA3AF] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
                              ▼
                            </span>
                          </button>

                          {/* Card body (expandable) */}
                          <div
                            className={`transition-all duration-200 ease-in-out overflow-hidden ${expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                              }`}
                          >
                            <div className="px-4 pb-4 pt-1 border-t border-[#F1F3F7]">
                              <div className="flex items-start gap-2">
                                <div className="flex-1 space-y-1">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={markdownComponents}
                                  >
                                    {insight.message}
                                  </ReactMarkdown>

                                  {/* Alerts from metadata */}
                                  {alerts && alerts.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-[#FEF6EB]">
                                      <p className="text-xs font-semibold text-[#F0A855] flex items-center gap-1 mb-1.5">
                                        <Icon name="Warning" size={14} /> Alertas detectados
                                      </p>
                                      <ul className="space-y-1">
                                        {alerts.map((alert, j) => (
                                          <li key={j} className="text-xs text-[#6B7280] flex gap-1.5">
                                            <span className="text-[#F0A855] shrink-0">•</span>
                                            <ReactMarkdown
                                              remarkPlugins={[remarkGfm]}
                                              components={markdownComponents}
                                            >
                                              {alert}
                                            </ReactMarkdown>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
