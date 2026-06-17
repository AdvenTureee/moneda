'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CaretDown } from '@phosphor-icons/react';
import type { Components } from 'react-markdown';
import Icon from '@/components/Icon';
import Mo from '@/components/Mo';
import MoInsightsChat from '@/components/MoInsightsChat';
import CategoryChip from '@/components/CategoryChip';
import PageHeader from '@/components/PageHeader';
import { formatCurrency, isClosedMonthlyPeriod } from '@/lib/utils';
import type { AIInsight } from '@/types';

interface InsightsViewProps {
  period: string;
  monthName: string;
  totalSpent: number;
  expenseCount: number;
  changePct: number | null;
  insights: AIInsight[];
  billingClosingDay: number;
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

function GenerationStatus({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`insight-generation ${compact ? 'insight-generation--compact' : ''}`}>
      <span className="insight-generation__spinner" aria-hidden />
      <p className="text-sm text-[#6B7280]">Analisando seus gastos…</p>
    </div>
  );
}

function formatInsightPeriod(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
}

function buildInsightPreview(message: string, maxLength = 150): string {
  const clean = message
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length <= maxLength) return clean;
  const truncated = clean.slice(0, maxLength).replace(/\s+\S*$/, '').trim();
  return `${truncated || clean.slice(0, maxLength).trim()}...`;
}

export default function InsightsView({
  period,
  monthName,
  totalSpent,
  expenseCount,
  changePct,
  insights: initialInsights,
  billingClosingDay,
}: InsightsViewProps) {
  const [generating, setGenerating] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>(initialInsights);
  const [genError, setGenError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const isClosedPeriod = isClosedMonthlyPeriod(period, billingClosingDay);

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

  const searchParams = useSearchParams();
  const autoOpened = useRef(false);

  useEffect(() => {
    if (autoOpened.current) return;
    const openType = searchParams.get('open');
    if (!openType) return;
    const target = insights.find((i) => i.type === openType && i.period === period);
    if (!target) return;
    autoOpened.current = true;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(target.id);
      return next;
    });
    requestAnimationFrame(() => {
      document.getElementById(`insight-${target.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [searchParams, insights, period]);

  async function handleGenerate() {
    if (!isClosedPeriod) {
      setGenError('O resumo mensal fica disponível quando o mês fechar.');
      return;
    }
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
  const hasMonthlySummary = insights.some((i) => i.type === 'monthly_summary');

  const summaryGenerateButton = expenseCount > 0 && (
    <div className="flex items-center justify-end">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating || !isClosedPeriod}
        className={`insight-generate-button ${!isClosedPeriod ? 'insight-generate-button--locked' : ''}`}
        aria-label={
          isClosedPeriod
            ? hasMonthlySummary ? 'Regenerar resumo do mês' : 'Gerar resumo do mês'
            : 'Resumo do mês disponível quando o mês fechar'
        }
      >
        {generating && <span className="insight-generate-button__spinner" aria-hidden />}
        <span>
          {generating
            ? 'Gerando…'
            : !isClosedPeriod
              ? 'Mês aberto'
              : hasMonthlySummary
                ? 'Regenerar'
                : 'Gerar'}
        </span>
      </button>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 pb-4">
      <PageHeader title="Insights" subtitle={monthName} />

      <MoInsightsChat period={period} expenseCount={expenseCount} />

      {/* Gasto total do mês */}
      <section
        className="ai-insight-banner text-white rounded-[20px] p-5 mb-6 shadow-md animate-fade-up delay-2"
        aria-label={`Gasto total de ${monthName}`}
      >
        <p className="text-xs font-semibold uppercase tracking-wider opacity-85">
          Gasto total do mês
        </p>
        <p className="text-[11px] font-medium capitalize opacity-80 mt-0.5">{monthName}</p>
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

      {/* Análise da Mo */}
      <section className="mb-6 animate-fade-up delay-3">
        <h2 className="text-sm font-heading text-[#1A1D23] mb-3">
          Análise da Mo
        </h2>

        {/* Search + Type filter */}
        {insights.length > 0 && (
          <div className="mb-4 animate-fade-up delay-3">
            <div className="relative mb-3">
              <Icon name="MagnifyingGlass" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar insights..."
                className="themed-field w-full pl-9 pr-4 py-2.5 rounded-[10px] bg-white border border-[#E5E7EB] text-sm text-[#1A1D23] placeholder:text-[#9CA3AF] outline-none focus:border-[#A8C5E0] transition-colors"
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

        {/* Error / spinner — só aqui quando o resumo mensal ainda não aparece na lista */}
        {genError && !groupedByType.has('monthly_summary') && (
          <p className="text-xs text-[#E07070] mb-3 animate-fade-up delay-3">{genError}</p>
        )}

        {generating && !groupedByType.has('monthly_summary') && (
          <div className="themed-card bg-white rounded-[16px] p-5 mb-4 insight-generation-card">
            <GenerationStatus />
          </div>
        )}

        {/* Empty state — no insights yet */}
        {!generating && insights.length === 0 && expenseCount > 0 && (
          <div
            className="themed-card bg-white rounded-[16px] p-6 text-center animate-fade-up delay-4"
          >
            <Mo variant="thinking" size={112} className="mx-auto mb-2" />
            <p className="text-sm text-[#6B7280]">
              {isClosedPeriod
                ? 'Nenhuma análise gerada ainda.'
                : 'A Mo fecha esse resumo quando o mês terminar.'}
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !isClosedPeriod}
              className="insight-generate-button insight-generate-button--large mt-4"
              aria-label={
                isClosedPeriod
                  ? 'Gerar primeira análise'
                  : 'Resumo do mês disponível quando o mês fechar'
              }
            >
              Gerar primeira análise
            </button>
          </div>
        )}

        {/* Empty filter results */}
        {!generating && insights.length > 0 && filteredInsights.length === 0 && (
          <div
            className="themed-card bg-white rounded-[16px] p-6 text-center animate-fade-up delay-4"
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
        {filteredInsights.length > 0 && (
          <div className="space-y-5">
            {Array.from(groupedByType.entries()).map(([type, items], groupIndex) => {
              const meta = TYPE_META[type];
              return (
                <div
                  key={type}
                  className={`animate-fade-up delay-${Math.min(groupIndex + 4, 8)}`}
                >
                  <div className="mb-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.color }} />
                        {meta.label}
                      </h3>
                      {type === 'monthly_summary' && summaryGenerateButton}
                    </div>
                    {type === 'monthly_summary' && !isClosedPeriod && (
                      <div className="mt-3 border-t border-[var(--color-border)]/70 pt-2 text-center text-[11px] font-semibold text-[var(--color-text-secondary)]">
                        Disponível quando o mês fechar.
                      </div>
                    )}
                  </div>
                  {type === 'monthly_summary' && genError && (
                    <p className="text-xs text-[#E07070] -mt-1 mb-2">{genError}</p>
                  )}
                  {type === 'monthly_summary' && generating && (
                    <div className="themed-card bg-white rounded-[14px] p-4 mb-2 insight-generation-card insight-generation-card--inline">
                      <GenerationStatus compact />
                    </div>
                  )}
                  <div className="space-y-2">
                    {items.map((insight, itemIndex) => {
                      const expanded = expandedIds.has(insight.id);
                      const alerts = insight.metadata?.alerts as string[] | undefined;
                      const preview = buildInsightPreview(insight.message);
                      return (
                        <div
                          key={insight.id}
                          id={`insight-${insight.id}`}
                          className={`insight-card themed-card bg-white rounded-[14px] overflow-hidden ${expanded ? 'insight-card--expanded' : ''}`}
                          style={{
                            boxShadow: 'var(--shadow-card)',
                          }}
                        >
                          {/* Card header */}
                          <button
                            type="button"
                            onClick={() => toggleExpand(insight.id)}
                            className="insight-card__trigger w-full min-h-[88px] px-4 py-3.5 text-left"
                            aria-expanded={expanded}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                                style={{ background: `${meta.color}18`, color: meta.color }}
                                aria-hidden
                              >
                                <Icon name={meta.icon} size={20} color={meta.color} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex items-center gap-2">
                                  <span
                                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                                    style={{ background: `${meta.color}16`, color: meta.color }}
                                  >
                                    {meta.label}
                                  </span>
                                  <span className="text-[11px] text-[#9CA3AF] capitalize">
                                    {formatInsightPeriod(insight.generatedAt)}
                                  </span>
                                </div>
                                <span className="block truncate text-base font-bold text-[#1A1D23]">
                                  {meta.label}
                                </span>
                                <span className="insight-card__preview-wrap">
                                  <span className="insight-card__preview block line-clamp-2 text-xs leading-relaxed text-[#6B7280]">
                                    {preview}
                                  </span>
                                </span>
                              </div>
                              <span
                                className="insight-card__chevron mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1F3F7] text-[#6B7280]"
                                aria-hidden
                              >
                                <CaretDown size={16} weight="bold" />
                              </span>
                            </div>
                          </button>

                          {/* Card body (expandable) */}
                          <div
                            className={`insight-accordion ${expanded ? 'insight-accordion--open' : ''}`}
                          >
                            <div className="insight-accordion__inner min-h-0 overflow-hidden">
                              <div className="px-4 pb-4 pt-3 border-t border-[#F1F3F7]">
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
