'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowsClockwise,
  CalendarBlank,
  Check,
  DotsThree,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Tag,
  Trash,
  X,
} from '@phosphor-icons/react';
import { useToast } from '@/components/ToastProvider';
import Icon from '@/components/Icon';
import DatePicker from '@/components/DatePicker';
import { formatCurrency, formatDateSection } from '@/lib/utils';
import { saveIncomeAction, deleteIncomeAction, updateIncomeAction } from '../actions-finance';
import type { Income, IncomeSource } from '@/types';
import type { MouseEvent } from 'react';

interface IncomesViewProps {
  initialIncomes: Income[];
}

const INCOME_SOURCES = [
  { id: 'salary' as IncomeSource, name: 'Salário', icon: 'Briefcase', color: '#10B981' },
  { id: 'freelance' as IncomeSource, name: 'Freelance', icon: 'Rocket', color: '#8B5CF6' },
  { id: 'investment' as IncomeSource, name: 'Investimento', icon: 'TrendUp', color: '#3B82F6' },
  { id: 'rent' as IncomeSource, name: 'Aluguel', icon: 'House', color: '#EC4899' },
  { id: 'gift' as IncomeSource, name: 'Presente', icon: 'Gift', color: '#F59E0B' },
  { id: 'other' as IncomeSource, name: 'Outro', icon: 'Package', color: '#6B7280' },
];

type IncomeFilterTab = 'source' | 'type' | 'period';
type IncomeTypeFilter = 'all' | 'recurring' | 'single';
type IncomePeriodFilter = 'all' | 'this-month' | 'last-30' | 'last-90';

const INCOME_TYPE_OPTIONS: Array<{ value: IncomeTypeFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'recurring', label: 'Recorrentes' },
  { value: 'single', label: 'Avulsos' },
];

const INCOME_PERIOD_OPTIONS: Array<{ value: IncomePeriodFilter; label: string }> = [
  { value: 'all', label: 'Todo período' },
  { value: 'this-month', label: 'Mês atual' },
  { value: 'last-30', label: 'Últimos 30 dias' },
  { value: 'last-90', label: 'Últimos 90 dias' },
];

function centsToDisplay(cents: number) {
  if (cents <= 0) return '';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getIncomeDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function groupIncomesByDate(incomes: Income[]): Array<{ dateKey: string; label: string; items: Income[] }> {
  const map = new Map<string, { label: string; items: Income[] }>();

  for (const income of incomes) {
    const date = getIncomeDate(income.receivedAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (!map.has(key)) {
      map.set(key, { label: formatDateSection(date), items: [] });
    }
    map.get(key)!.items.push(income);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, value]) => ({ dateKey, ...value }));
}

export default function IncomesView({ initialIncomes }: IncomesViewProps) {
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [amountCents, setAmountCents] = useState(0);
  const [amountDisplay, setAmountDisplay] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSource, setSelectedSource] = useState<IncomeSource>('salary');
  const [isRecurring, setIsRecurring] = useState(false);
  const [receivedAtDate, setReceivedAtDate] = useState(() => {
    return toDateInputValue(new Date());
  });
  const [mounted, setMounted] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeSource, setActiveSource] = useState<IncomeSource | null>(null);
  const [activeType, setActiveType] = useState<IncomeTypeFilter>('all');
  const [activePeriod, setActivePeriod] = useState<IncomePeriodFilter>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<IncomeFilterTab>('source');
  const [filtersPosition, setFiltersPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const { showToast } = useToast();
  const [isAdding, startAdding] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [isUpdating, startUpdating] = useTransition();
  const isSaving = isAdding || isUpdating;
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const menuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const filtersAnchorRef = useRef<HTMLDivElement | null>(null);
  const [menuIncome, setMenuIncome] = useState<Income | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const openedFromQueryRef = useRef(false);
  const openFrameRef = useRef<number | null>(null);
  const dragStartYRef = useRef(0);
  const dragStartTimeRef = useRef(0);
  const dragYRef = useRef(0);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (openFrameRef.current) window.cancelAnimationFrame(openFrameRef.current);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput), 180);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useLayoutEffect(() => {
    if (!filtersOpen) return;

    const update = () => {
      const anchor = filtersAnchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = Math.min(420, window.innerWidth - 16);
      setFiltersPosition({
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
        width,
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [filtersOpen]);

  const resetForm = () => {
    setAmountCents(0);
    setAmountDisplay('');
    setDescription('');
    setSelectedSource('salary');
    setIsRecurring(false);
    setReceivedAtDate(toDateInputValue(new Date()));
  };

  const handleAmountChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      setAmountCents(0);
      setAmountDisplay('');
      return;
    }
    const cents = parseInt(digits, 10);
    setAmountCents(cents);
    setAmountDisplay(centsToDisplay(cents));
  };

  const openIncomeModal = (mode: 'add' | 'edit') => {
    setDragY(window.innerHeight);
    dragYRef.current = 0;
    isDraggingRef.current = false;
    setIsDragging(false);
    setModalMode(mode);
    if (openFrameRef.current) window.cancelAnimationFrame(openFrameRef.current);
    openFrameRef.current = window.requestAnimationFrame(() => {
      setDragY(0);
      openFrameRef.current = null;
    });
  };

  const openAddModal = () => {
    setEditingIncome(null);
    resetForm();
    openIncomeModal('add');
  };

  useEffect(() => {
    if (!mounted || openedFromQueryRef.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('modal') !== 'add') return;

    openedFromQueryRef.current = true;
    openAddModal();
  }, [mounted]);

  const openEditModal = (income: Income) => {
    setEditingIncome(income);
    setAmountCents(income.amount);
    setAmountDisplay(centsToDisplay(income.amount));
    setDescription(income.description);
    setSelectedSource(income.source);
    setIsRecurring(income.isRecurring);
    setReceivedAtDate(toDateInputValue(income.receivedAt));
    openIncomeModal('edit');
  };

  const closeIncomeModal = () => {
    if (isAdding || isUpdating) return;
    setModalMode(null);
    setEditingIncome(null);
    setDragY(0);
    dragYRef.current = 0;
    isDraggingRef.current = false;
    setIsDragging(false);
  };

  const handleModalHandlePointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (isSaving || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    event.stopPropagation();
    dragStartYRef.current = event.clientY;
    dragStartTimeRef.current = performance.now();
    dragYRef.current = 0;
    isDraggingRef.current = true;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [isSaving]);

  const handleModalHandlePointerMove = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingRef.current) return;
    event.preventDefault();
    const nextDragY = Math.max(0, event.clientY - dragStartYRef.current);
    dragYRef.current = nextDragY;
    setDragY(nextDragY);
  }, []);

  const handleModalHandlePointerUp = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingRef.current) return;
    event.preventDefault();
    const finalDragY = dragYRef.current;
    const elapsed = Math.max(performance.now() - dragStartTimeRef.current, 1);
    const velocity = finalDragY / elapsed;
    isDraggingRef.current = false;
    dragYRef.current = 0;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (finalDragY > 80 || velocity > 0.65) {
      closeIncomeModal();
      return;
    }

    setDragY(0);
  }, [closeIncomeModal]);

  const cancelModalDrag = useCallback(() => {
    isDraggingRef.current = false;
    dragYRef.current = 0;
    setIsDragging(false);
    setDragY(0);
  }, []);

  const handleSubmitIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (amountCents <= 0 || !description.trim()) return;

    const save = async () => {
      try {
        const result = modalMode === 'edit' && editingIncome
          ? await updateIncomeAction(
              editingIncome.id,
              description,
              amountCents,
              selectedSource,
              isRecurring,
              receivedAtDate
            )
          : await saveIncomeAction(
              description,
              amountCents,
              selectedSource,
              isRecurring,
              receivedAtDate
            );

        if (result.ok) {
          showToast('success', modalMode === 'edit' ? 'Ganho atualizado com sucesso!' : 'Ganho lançado com sucesso!');
          setModalMode(null);
          setEditingIncome(null);
          resetForm();
        } else {
          showToast('error', result.error);
        }
      } catch (err: any) {
        showToast('error', err.message || 'Erro inesperado ao salvar.');
      }
    };

    if (modalMode === 'edit') {
      startUpdating(save);
    } else {
      startAdding(save);
    }
  };

  const handleDeleteIncome = (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este ganho?')) return;
    setMenuIncome(null);
    setDeletingId(id);
    startDeleting(async () => {
      try {
        const result = await deleteIncomeAction(id);
        if (result.ok) {
          showToast('success', 'Ganho excluído.');
        } else {
          showToast('error', result.error);
        }
      } catch (err: any) {
        showToast('error', err.message || 'Erro ao excluir.');
      } finally {
        setDeletingId(null);
      }
    });
  };

  const now = new Date();
  const currentMonthTotal = initialIncomes.reduce((sum, item) => {
    const receivedAt = getIncomeDate(item.receivedAt);
    const isCurrentMonth =
      receivedAt.getFullYear() === now.getFullYear() &&
      receivedAt.getMonth() === now.getMonth();
    return isCurrentMonth ? sum + item.amount : sum;
  }, 0);
  const isEditing = modalMode === 'edit';
  const filteredIncomes = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const last30 = new Date(now);
    last30.setDate(now.getDate() - 30);
    const last90 = new Date(now);
    last90.setDate(now.getDate() - 90);

    return initialIncomes
      .filter((income) => {
        if (activeSource && income.source !== activeSource) return false;
        if (activeType === 'recurring' && !income.isRecurring) return false;
        if (activeType === 'single' && income.isRecurring) return false;

        const receivedAt = getIncomeDate(income.receivedAt);
        if (activePeriod === 'this-month' && receivedAt < monthStart) return false;
        if (activePeriod === 'last-30' && receivedAt < last30) return false;
        if (activePeriod === 'last-90' && receivedAt < last90) return false;

        if (!query) return true;
        const sourceName = INCOME_SOURCES.find((source) => source.id === income.source)?.name.toLowerCase() ?? '';
        return income.description.toLowerCase().includes(query) || sourceName.includes(query);
      })
      .sort((a, b) => getIncomeDate(b.receivedAt).getTime() - getIncomeDate(a.receivedAt).getTime());
  }, [activePeriod, activeSource, activeType, debouncedSearch, initialIncomes]);
  const incomeGroups = useMemo(() => groupIncomesByDate(filteredIncomes), [filteredIncomes]);

  const activeSourceMeta = activeSource ? INCOME_SOURCES.find((source) => source.id === activeSource) : null;
  const activeTypeLabel = INCOME_TYPE_OPTIONS.find((option) => option.value === activeType)?.label ?? 'Todos';
  const activePeriodLabel = INCOME_PERIOD_OPTIONS.find((option) => option.value === activePeriod)?.label ?? 'Todo período';
  const activeFilterCount =
    (activeSource ? 1 : 0) +
    (activeType !== 'all' ? 1 : 0) +
    (activePeriod !== 'all' ? 1 : 0) +
    (searchInput.trim() ? 1 : 0);
  const filterTabs: Array<{
    id: IncomeFilterTab;
    label: string;
    value: string;
    icon: typeof Tag;
    active: boolean;
  }> = [
    {
      id: 'source',
      label: 'Origem',
      value: activeSourceMeta?.name ?? 'Todas',
      icon: Tag,
      active: activeSource !== null,
    },
    {
      id: 'type',
      label: 'Tipo',
      value: activeTypeLabel,
      icon: ArrowsClockwise,
      active: activeType !== 'all',
    },
    {
      id: 'period',
      label: 'Período',
      value: activePeriodLabel,
      icon: CalendarBlank,
      active: activePeriod !== 'all',
    },
  ];

  const openFilterTab = useCallback((tabId: IncomeFilterTab) => {
    setActiveFilterTab(tabId);
    setFiltersOpen(true);
  }, []);

  const selectFilterAndClose = useCallback((selectFilter: () => void) => {
    selectFilter();
    setFiltersOpen(false);
  }, []);

  const clearFilters = useCallback(() => {
    setActiveSource(null);
    setActiveType('all');
    setActivePeriod('all');
    setSearchInput('');
    setDebouncedSearch('');
    setFiltersOpen(false);
  }, []);
  const menuItemClass =
    'expense-action-item group flex min-h-10 w-full items-center gap-3 rounded-[11px] px-3.5 text-left text-sm font-medium transition-[background,color,transform] duration-150 active:scale-[0.985] disabled:opacity-50';
  const menuItemDangerClass =
    'expense-action-item expense-action-item--danger group flex min-h-10 w-full items-center gap-3 rounded-[11px] px-3.5 text-left text-sm font-medium transition-[background,color,transform] duration-150 active:scale-[0.985] disabled:opacity-50';
  const menuIconClass = 'expense-action-icon shrink-0 transition-colors';
  const menuDangerIconClass = 'expense-action-danger-icon shrink-0 transition-colors';

  const placeMenu = (incomeId: string) => {
    const trigger = menuButtonRefs.current[incomeId];
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(264, window.innerWidth - 16);
    const estimatedHeight = 92;
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    const below = rect.bottom + 8;
    const top =
      below + estimatedHeight > window.innerHeight - 8
        ? Math.max(8, rect.top - estimatedHeight - 8)
        : below;

    setMenuPosition({ top, left });
  };

  const openActionMenu = (event: MouseEvent<HTMLButtonElement>, income: Income) => {
    event.stopPropagation();
    placeMenu(income.id);
    setMenuIncome(income);
  };

  const closeActionMenu = () => {
    setMenuIncome(null);
  };

  const runMenuAction = (action: () => void) => {
    closeActionMenu();
    action();
  };

  useEffect(() => {
    if (!menuIncome) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeActionMenu();
    }

    function handleViewportChange() {
      if (menuIncome) placeMenu(menuIncome.id);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [menuIncome]);

  return (
    <div className="max-w-lg mx-auto px-4 pb-4 [scrollbar-gutter:stable]">
      {/* Header */}
      <div className="flex items-center gap-3 py-5 mb-2 animate-fade-up delay-0">
        <Link
          href="/perfil"
          className="p-2 hover:bg-[#F1F3F7] rounded-full transition-colors"
          aria-label="Voltar para Perfil"
        >
          <ArrowLeft size={20} className="text-[#1A1D23]" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#1A1D23]">Ganhos</h1>
          <p className="text-xs text-[#6B7280]">Registre valores que ajudam a abater estouros do orçamento.</p>
        </div>
      </div>

      {/* Summary Card */}
      <div
        className="ai-insight-banner text-white rounded-[20px] p-5 mb-4 shadow-md transition-all animate-fade-up delay-1"
      >
        <p className="text-xs font-semibold uppercase tracking-wider opacity-85">Ganhos deste mês</p>
        <p className="text-3xl font-extrabold mt-1.5 tabular-nums">
          {formatCurrency(currentMonthTotal)}
        </p>
        <p className="text-xs opacity-75 mt-2">
          Soma dos valores recebidos no mês atual.
        </p>
      </div>

      <div className="mb-3 animate-fade-up delay-2">
        <button
          type="button"
          onClick={openAddModal}
          className="gesture-button w-full flex items-center justify-center gap-2 py-3 rounded-[12px] text-sm font-semibold text-[#A8C5E0] border border-dashed border-[#D1D9E6] hover:border-[#A8C5E0] hover:bg-[#F8F9FB] transition-colors"
        >
          <Plus size={18} />
          Adicionar ganho
        </button>
      </div>

      <div className="themed-card mb-5 space-y-2.5 rounded-[14px] bg-white p-2.5 animate-fade-up delay-3">
        <div className="relative">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7C8898] dark:text-[#94A3B8]"
            aria-hidden
          />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Buscar ganho..."
            className="themed-field h-9 w-full rounded-[9px] border border-[#E5E7EB] bg-[#F8F9FB] pl-9 pr-3 text-sm text-[#1A1D23] placeholder:text-[#7C8898] outline-none transition-colors focus:border-[#A8C5E0] dark:border-white/10 dark:bg-white/6 dark:text-[#F5F7FA] dark:placeholder:text-[#94A3B8]"
            aria-label="Buscar ganhos"
          />
        </div>

        <div
          ref={filtersAnchorRef}
          className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 text-[11px] font-semibold text-[#1A1D23] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {filterTabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => openFilterTab(tab.id)}
                aria-label={`Filtro de ${tab.label.toLowerCase()}: ${tab.value}. Clique para alterar.`}
                aria-pressed={tab.active}
                className={`group flex h-8 max-w-[180px] shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 text-center outline-none transition-[background-color,border-color,box-shadow,color,transform] duration-150 ease-out active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#A8C5E0] focus-visible:ring-offset-1 ${
                  tab.active
                    ? 'border-[#5BBF8E]/45 bg-[#EEF9F4] text-[#2E8F67] hover:border-[#5BBF8E]/70 hover:bg-[#EAF7F0] dark:border-[#5BBF8E]/45 dark:bg-[#5BBF8E]/14 dark:text-[#7EE0AE]'
                    : 'border-[#E5E7EB] bg-[#F8F9FB] text-[#1A1D23] hover:border-[#A8C5E0]/70 hover:bg-[#EEF2F7] dark:border-white/10 dark:bg-white/6 dark:text-[#CBD5E1] dark:hover:bg-white/10'
                }`}
              >
                <TabIcon
                  size={13}
                  weight="bold"
                  className={`shrink-0 ${tab.active ? 'text-[#3FA876] dark:text-[#7EE0AE]' : 'text-[#7C8898] dark:text-[#94A3B8]'}`}
                  aria-hidden
                />
                <span className="min-w-0 truncate">{tab.value}</span>
                {tab.active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#5BBF8E]" aria-hidden />}
              </button>
            );
          })}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="h-8 shrink-0 rounded-full px-3 text-[11px] font-bold text-[#5BBF8E] outline-none transition-colors hover:bg-[#EEF9F4] focus-visible:ring-2 focus-visible:ring-[#A8C5E0] focus-visible:ring-offset-1 dark:hover:bg-white/8"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* History section */}
      <section className="animate-fade-up delay-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] mb-3 px-1">
          Histórico de ganhos ({filteredIncomes.length})
        </h2>

        {initialIncomes.length === 0 ? (
          <div className="bg-white rounded-[20px] py-12 px-6 border border-[#F1F3F7] text-center" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.01)' }}>
            <div className="w-12 h-12 rounded-full bg-[#EEF9F4] text-[#10B981] flex items-center justify-center mx-auto mb-3">
              <Check size={24} />
            </div>
            <p className="text-sm font-bold text-[#1A1D23]">Nenhum ganho cadastrado</p>
            <p className="text-xs text-[#6B7280] mt-1 max-w-[260px] mx-auto">
              Seus ganhos serão listados aqui assim que forem adicionados.
            </p>
          </div>
        ) : filteredIncomes.length === 0 ? (
          <div className="bg-white rounded-[20px] py-10 px-6 border border-[#F1F3F7] text-center" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.01)' }}>
            <div className="w-12 h-12 rounded-full bg-[#EEF9F4] text-[#10B981] flex items-center justify-center mx-auto mb-3">
              <MagnifyingGlass size={22} />
            </div>
            <p className="text-sm font-bold text-[#1A1D23]">Nenhum ganho encontrado</p>
            <p className="text-xs text-[#6B7280] mt-1 max-w-[260px] mx-auto">
              Ajuste busca ou filtros para ver outros ganhos.
            </p>
          </div>
        ) : (
          incomeGroups.map((group, groupIndex) => {
            const dayTotal = group.items.reduce((sum, income) => sum + income.amount, 0);

            return (
              <section
                key={group.dateKey}
                className={`mb-7 animate-fade-up delay-${Math.min(groupIndex + 2, 8)}`}
                aria-labelledby={`income-date-${group.dateKey}`}
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[color-mix(in_srgb,var(--color-border)_70%,transparent)]" />
                  <h3
                    id={`income-date-${group.dateKey}`}
                    className="shrink-0 rounded-full border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-xs font-bold text-[#6B7280] shadow-sm"
                  >
                    {group.label}
                  </h3>
                  <span className="shrink-0 rounded-full bg-[#EEF9F4] px-3 py-1.5 text-xs font-bold text-[#2E8F67] tabular-nums">
                    +{formatCurrency(dayTotal)}
                  </span>
                </div>

                <div className="space-y-2.5 border-l-2 border-[color-mix(in_srgb,var(--color-border)_72%,transparent)] pl-3">
                  {group.items.map((item) => {
                    const srcMeta = INCOME_SOURCES.find((source) => source.id === item.source) ?? INCOME_SOURCES[5];
                    const isItemDeleting = deletingId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`themed-card flex w-full items-center gap-3 rounded-[10px] bg-white px-4 py-3 transition-all duration-75 ${
                          isItemDeleting ? 'bg-[#FDF0F0] opacity-45' : ''
                        }`}
                        role="group"
                        aria-label={`${item.description}, ${formatCurrency(item.amount)}`}
                      >
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          disabled={isDeleting || isSaving}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-not-allowed"
                        >
                          <div
                            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                            style={{
                              backgroundColor: `${srcMeta.color}22`,
                              color: srcMeta.color,
                            }}
                          >
                            <Icon name={srcMeta.icon} size={20} aria-hidden />
                            {item.isRecurring && (
                              <span
                                className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-[#D4A34A] text-white shadow-[0_1px_4px_rgba(0,0,0,0.18)] ring-1 ring-white/80"
                                aria-label="Recorrente"
                              >
                                <ArrowsClockwise size={10} weight="bold" aria-hidden />
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-medium leading-tight text-[#1A1D23]">
                              {item.description}
                            </p>
                            <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-[#6B7280]">
                              <span className="min-w-0 flex-1 truncate">{srcMeta.name}</span>
                              {item.isRecurring && (
                                <span className="shrink-0 rounded-full bg-[#FEF1D6] px-1.5 py-0.5 text-[10px] font-bold text-[#B57922]">
                                  Recorrente
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-end">
                            <span className="text-[15px] font-semibold text-[#10B981] tabular-nums">
                              +{formatCurrency(item.amount)}
                            </span>
                          </div>
                        </button>

                        <button
                          ref={(node) => {
                            menuButtonRefs.current[item.id] = node;
                          }}
                          type="button"
                          onClick={(event) => openActionMenu(event, item)}
                          disabled={isDeleting || isSaving}
                          className="gesture-icon-button flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F1F3F7]/70 text-[#6B7280] transition-colors hover:bg-[#E9EDF3] active:scale-95 disabled:opacity-50 dark:bg-white/8 dark:text-[#CBD5E1] dark:hover:bg-white/12"
                          aria-label="Mais opções do ganho"
                          aria-haspopup="menu"
                          aria-expanded={menuIncome?.id === item.id}
                        >
                          <DotsThree size={22} weight="bold" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </section>

      {mounted && filtersOpen && filtersPosition && createPortal(
        <>
          <button
            type="button"
            className="fixed inset-0 z-[100] cursor-default bg-transparent"
            aria-label="Fechar filtros"
            onClick={() => setFiltersOpen(false)}
          />
          <div
            className="date-range-menu fixed z-[101] max-h-[calc(100dvh-16px)] overflow-hidden rounded-[18px] p-2 backdrop-blur-xl"
            style={{
              top: filtersPosition.top,
              left: filtersPosition.left,
              width: filtersPosition.width,
            }}
            role="dialog"
            aria-label="Filtros de ganhos"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-2 pb-2 pt-1">
              <div>
                <p className="text-sm font-bold text-[#2E8F67] dark:text-[#7EE0AE]">Filtros</p>
                <p className="text-xs font-medium text-[#6B7280]">
                  {filterTabs.find((tab) => tab.id === activeFilterTab)?.label}: {filterTabs.find((tab) => tab.id === activeFilterTab)?.value}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-[9px] px-2.5 py-2 text-xs font-semibold text-[#5BBF8E] transition-colors hover:bg-[#EEF9F4] dark:hover:bg-white/8"
                  >
                    Limpar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-[9px] text-[#6B7280] transition-colors hover:bg-[#F1F3F7] dark:text-[#CBD5E1] dark:hover:bg-white/8"
                  aria-label="Fechar"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>
            </div>

            <div className="mt-2 max-h-[min(360px,calc(100dvh-140px))] overflow-y-auto overscroll-contain rounded-[14px] border border-[color-mix(in_srgb,var(--color-border)_76%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)] p-2">
              {activeFilterTab === 'source' && (
                <div className="space-y-1" role="tabpanel" aria-label="Filtro de origem">
                  <button
                    type="button"
                    onClick={() => selectFilterAndClose(() => setActiveSource(null))}
                    className={`date-range-option flex min-h-11 w-full items-center gap-2 rounded-[11px] px-3 text-left text-sm font-semibold transition-colors ${
                      activeSource === null ? 'date-range-option--selected' : ''
                    }`}
                  >
                    <Icon name="Sparkle" size={15} aria-hidden />
                    Todas
                  </button>
                  {INCOME_SOURCES.map((source) => (
                    <button
                      key={source.id}
                      type="button"
                      onClick={() => selectFilterAndClose(() => setActiveSource((prev) => (prev === source.id ? null : source.id)))}
                      className={`date-range-option flex min-h-11 w-full items-center gap-2 rounded-[11px] px-3 text-left text-sm font-semibold transition-colors ${
                        activeSource === source.id ? 'date-range-option--selected' : ''
                      }`}
                    >
                      <Icon name={source.icon} size={15} color={source.color} aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{source.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeFilterTab === 'type' && (
                <div className="grid grid-cols-1 gap-1.5" role="tabpanel" aria-label="Filtro de tipo">
                  {INCOME_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => selectFilterAndClose(() => setActiveType(option.value))}
                      className={`date-range-option flex min-h-11 items-center gap-2 rounded-[11px] px-3 text-left text-sm font-semibold transition-colors ${
                        activeType === option.value ? 'date-range-option--selected' : ''
                      }`}
                    >
                      <ArrowsClockwise size={15} aria-hidden />
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {activeFilterTab === 'period' && (
                <div className="grid grid-cols-1 gap-1.5" role="tabpanel" aria-label="Filtro de período">
                  {INCOME_PERIOD_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => selectFilterAndClose(() => setActivePeriod(option.value))}
                      className={`date-range-option flex min-h-11 items-center gap-2 rounded-[11px] px-3 text-left text-sm font-semibold transition-colors ${
                        activePeriod === option.value ? 'date-range-option--selected' : ''
                      }`}
                    >
                      <CalendarBlank size={15} aria-hidden />
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>,
        document.body
      )}

      {menuIncome && typeof document !== 'undefined' && createPortal(
        <>
          <button
            type="button"
            className="fixed inset-0 z-[80] cursor-default bg-transparent"
            aria-label="Fechar menu de opções"
            onClick={closeActionMenu}
          />
          <div
            role="menu"
            className="expense-action-menu fixed z-[81] max-h-[calc(100dvh-16px)] w-[min(264px,calc(100vw-16px))] overflow-y-auto rounded-[18px] p-1.5 backdrop-blur-xl"
            style={{ top: menuPosition.top, left: menuPosition.left }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => runMenuAction(() => openEditModal(menuIncome))}
              className={menuItemClass}
            >
              <PencilSimple size={17} className={menuIconClass} />
              Editar ganho
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => runMenuAction(() => handleDeleteIncome(menuIncome.id))}
              className={menuItemDangerClass}
            >
              <Trash size={17} className={menuDangerIconClass} />
              Excluir ganho
            </button>
          </div>
        </>,
        document.body
      )}

      {mounted && modalMode && createPortal(
        <div
          className="modal-wave-backdrop fixed inset-0 z-[70] flex items-end justify-center p-0"
          onClick={closeIncomeModal}
        >
          <div
            role="dialog"
            aria-modal
            aria-label={isEditing ? 'Editar ganho' : 'Adicionar ganho'}
            className="modal-sheet add-expense-sheet flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] bg-white shadow-[var(--shadow-overlay)]"
            style={{
              transform: dragY > 0 ? `translateY(${dragY}px)` : 'translateY(0)',
              transition: isDragging ? 'none' : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="add-expense-grab flex min-h-12 w-full touch-none select-none items-center justify-center cursor-grab active:cursor-grabbing"
              aria-label="Arraste para baixo para fechar"
              disabled={isSaving}
              onPointerDown={handleModalHandlePointerDown}
              onPointerMove={handleModalHandlePointerMove}
              onPointerUp={handleModalHandlePointerUp}
              onPointerCancel={cancelModalDrag}
              onLostPointerCapture={cancelModalDrag}
              onContextMenu={(e) => e.preventDefault()}
            >
              <span className="add-expense-grab__bar h-1.5 w-14 rounded-full" />
            </button>

            <div className="flex shrink-0 items-start justify-between px-5 pb-3 pt-0">
              <div>
                <h2 className="text-lg font-bold text-[#1A1D23]">{isEditing ? 'Editar ganho' : 'Adicionar ganho'}</h2>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  {isEditing ? 'Ajuste o valor que entra no orçamento do mês.' : 'Registre um valor recebido para abater o orçamento do mês.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeIncomeModal}
                disabled={isSaving}
                aria-label="Fechar"
                className="gesture-icon-button flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#F1F3F7] transition-colors disabled:opacity-40"
              >
                <X size={18} className="text-[#6B7280]" />
              </button>
            </div>

            <form onSubmit={handleSubmitIncome} className="min-h-0 flex-1 flex flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2">
              <div className="mb-4">
                <div
                  className={`flex items-center gap-2 border-2 rounded-[12px] px-4 py-3.5 transition-all focus-within:border-[#10B981] ${
                    amountCents > 0 ? 'themed-field-active' : 'themed-field'
                  }`}
                  style={{
                    borderColor: amountCents > 0 ? '#10B981' : 'var(--color-border)',
                  }}
                >
                  <span className="text-xl font-bold text-[#9CA3AF]">R$</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={amountDisplay}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0,00"
                    className="min-w-0 w-full text-2xl font-extrabold bg-transparent outline-none tabular-nums text-[#1A1D23] placeholder:text-[#9CA3AF]"
                    required
                    aria-label="Valor em reais"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-[#6B7280] uppercase mb-1.5">Descrição</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex.: salário mensal, projeto web..."
                  className="w-full border border-[#E5E7EB] rounded-[12px] px-4 py-3 text-sm text-[#1A1D23] bg-[#F8F9FB] outline-none focus:border-[#A8C5E0] focus:bg-white transition-colors"
                  required
                  maxLength={80}
                />
              </div>

              <div className="mb-4 grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase mb-1.5">Recebido em</label>
                  <DatePicker
                    value={receivedAtDate}
                    onChange={setReceivedAtDate}
                    ariaLabel="Data de recebimento"
                    className="w-full flex items-center gap-2 border border-[#E5E7EB] rounded-[12px] px-3 py-3 text-sm text-left bg-[#F8F9FB] outline-none focus:border-[#A8C5E0] transition-colors"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <button
                    type="button"
                    onClick={() => setIsRecurring(!isRecurring)}
                    aria-pressed={isRecurring}
                    className={`flex items-center gap-2.5 justify-center border rounded-[12px] py-3 text-sm font-semibold select-none touch-manipulation transition-colors duration-75 active:scale-95 overflow-hidden ${
                      isRecurring
                        ? 'border-[#D4A34A] bg-[#FEF8E7] text-[#B8860B]'
                        : 'border-[#E5E7EB] bg-[#F8F9FB] text-[#6B7280] hover:border-[#A8C5E0]'
                    }`}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <ArrowsClockwise size={16} className={`shrink-0 ${isRecurring ? 'animate-spin-slow' : ''}`} />
                    <span className="truncate">Recorrente</span>
                  </button>
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">Origem do ganho</label>
                <div className="grid grid-cols-2 min-[380px]:grid-cols-3 gap-2">
                  {INCOME_SOURCES.map((src) => {
                    const isSelected = selectedSource === src.id;
                    return (
                      <button
                        key={src.id}
                        type="button"
                        onClick={() => setSelectedSource(src.id)}
                        aria-pressed={isSelected}
                        className={`flex items-center min-[380px]:flex-col justify-center gap-2 min-[380px]:gap-1 py-2.5 px-2 rounded-[12px] border-2 transition-all duration-75 active:scale-95 ${
                          isSelected
                            ? 'border-[#10B981] bg-[#EEF9F4]'
                            : 'border-[#E5E7EB] bg-white hover:border-[#A8C5E0]'
                        }`}
                      >
                        <Icon name={src.icon} size={18} className={isSelected ? 'text-[#047857]' : 'text-[#6B7280]'} />
                        <span
                          className={`text-[10px] font-bold truncate ${
                            isSelected ? 'text-[#047857]' : 'text-[#6B7280]'
                          }`}
                        >
                          {src.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              </div>

              <div
                className="shrink-0 px-5 pt-3"
                style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
              >
                <button
                  type="submit"
                  disabled={isSaving || amountCents <= 0 || !description.trim()}
                  className="gesture-button-primary flex w-full items-center justify-center gap-2 rounded-full py-4 text-[15px] font-semibold text-white transition-all duration-75 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    background: amountCents > 0 && description.trim() ? '#5BBF8E' : '#9CA3AF',
                    boxShadow: amountCents > 0 && description.trim() ? '0 6px 20px rgba(91, 191, 142, 0.35)' : undefined,
                  }}
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {isEditing ? 'Salvando...' : 'Lançando...'}
                    </span>
                  ) : (
                    <>
                      {isEditing ? <Check size={16} /> : <Plus size={16} />}
                      <span>
                        {isEditing
                          ? 'Salvar alterações'
                          : amountCents > 0
                            ? `Salvar — ${formatCurrency(amountCents)}`
                            : 'Salvar Ganho'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
