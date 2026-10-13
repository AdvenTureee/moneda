'use client';

import { useState, useTransition, useRef, useMemo, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  UploadSimple,
  WarningCircle,
  Check,
  CaretDown,
  PencilSimple,
  Sparkle,
} from '@phosphor-icons/react';
import Link from 'next/link';
import Icon from '@/components/Icon';
import { formatCurrency } from '@/lib/utils';
import type { Category } from '@/types';
import type { ParsedTransaction, ConfirmTransaction } from '@/lib/import/types';

interface ImportViewProps {
  categories: Category[];
}

type Phase = 'upload' | 'review' | 'importing' | 'done';

type TransactionPatch = Partial<Pick<ParsedTransaction, 'date' | 'amountCents' | 'description'>>;

const MAX_AMOUNT_CENTS = 1_000_000_000_00; // R$ 1 bilhão
const MAX_DESCRIPTION_LENGTH = 200;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Cor de receita usada em Ganhos (perfil/ganhos) para manter a mesma leitura.
const INCOME_COLOR = '#10B981';
const INCOME_ICON = 'TrendUp';
const NEUTRAL_EXPENSE_ICON = 'Package';
const NEUTRAL_EXPENSE_COLOR = '#6B7280';

// BottomNav: bottom 16px + ~66px de altura. O card de ação fica 12px acima dela.
const FOOTER_BOTTOM = 'calc(94px + env(safe-area-inset-bottom, 0px))';

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

interface ParseResponse {
  transactions: ParsedTransaction[];
  source: 'ofx' | 'csv';
  bankName?: string;
  accountLast4?: string;
  truncated?: boolean;
}

interface ConfirmResponse {
  imported: number;
  skipped: number;
  errors: string[];
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`w-8 h-8 border-2 border-[#5BBF8E]/30 border-t-[#5BBF8E] rounded-full animate-spin ${className}`}
      aria-hidden
    />
  );
}

export default function ImportView({ categories }: ImportViewProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('upload');
  const [parsing, setParsing] = useState(false);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [source, setSource] = useState<'ofx' | 'csv' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parseWarning, setParseWarning] = useState<string | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmResponse | null>(null);
  const [pending, startTransition] = useTransition();
  const footerRef = useRef<HTMLDivElement>(null);
  const [footerHeight, setFooterHeight] = useState(0);

  // Mantém o espaço do fim da lista igual à altura real do rodapé (muda com quebra de linha e safe-area).
  useLayoutEffect(() => {
    const node = footerRef.current;
    if (!node) return;
    const update = () => setFooterHeight(node.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [phase, transactions.length]);

  const expenses = useMemo(
    () => transactions.filter((t) => t.type === 'expense'),
    [transactions],
  );
  const incomes = useMemo(
    () => transactions.filter((t) => t.type === 'income'),
    [transactions],
  );

  const selectedExpenses = expenses.filter((t) => t.selected);
  const selectedIncomes = incomes.filter((t) => t.selected);

  const totalExpenses = selectedExpenses.reduce((s, t) => s + t.amountCents, 0);
  const totalIncomes = selectedIncomes.reduce((s, t) => s + t.amountCents, 0);
  const totalSelected = selectedExpenses.length + selectedIncomes.length;

  async function handleFileSelect(file: File) {
    setError(null);
    setParseWarning(null);
    setParsing(true);

    const formData = new FormData();
    formData.append('file', file);

    setPhase('upload');

    try {
      const res = await fetch('/api/import/parse', {
        method: 'POST',
        body: formData,
      });
      const data: ParseResponse & { error?: string } = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Erro ao processar arquivo.');
        return;
      }

      if (data.transactions.length === 0) {
        setError('Nenhuma transação encontrada no arquivo.');
        return;
      }

      setTransactions(data.transactions);
      setSource(data.source);
      setPhase('review');

      if (data.truncated) {
        setParseWarning(
          `Arquivo grande — apenas as primeiras 500 transações foram carregadas.`,
        );
      }
    } catch {
      setError('Erro de conexão ao enviar arquivo.');
    } finally {
      setParsing(false);
    }
  }

  function toggleTransaction(id: string) {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t)),
    );
  }

  function toggleTransactionType(id: string) {
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, type: t.type === 'expense' ? 'income' : 'expense' }
          : t,
      ),
    );
  }

  function invertAllTypes() {
    setTransactions((prev) =>
      prev.map((t) => ({
        ...t,
        type: t.type === 'expense' ? ('income' as const) : ('expense' as const),
      })),
    );
  }

  function toggleAllByType(type: 'expense' | 'income', selected: boolean) {
    setTransactions((prev) =>
      prev.map((t) => (t.type === type ? { ...t, selected } : t)),
    );
  }

  function updateCategory(id: string, categoryId: string) {
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, suggestedCategoryId: categoryId } : t,
      ),
    );
  }

  function updateTransaction(id: string, patch: TransactionPatch) {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
  }

  function handleConfirm() {
    startTransition(async () => {
      setPhase('importing');
      setError(null);

      const toImport: ConfirmTransaction[] = transactions
        .filter((t) => t.selected)
        .map((t) => ({
          date: t.date,
          amountCents: t.amountCents,
          description: t.description,
          type: t.type,
          categoryId: t.suggestedCategoryId ?? 'outros',
        }));

      if (toImport.length === 0) {
        setError('Selecione ao menos uma transação.');
        setPhase('review');
        return;
      }

      try {
        const res = await fetch('/api/import/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactions: toImport }),
        });
        const data: ConfirmResponse & { error?: string } = await res.json();

        if (!res.ok) {
          setError(data.error ?? 'Erro ao importar.');
          setPhase('review');
          return;
        }

        setConfirmResult(data);
        setPhase('done');
        router.refresh();
      } catch {
        setError('Erro de conexão ao importar.');
        setPhase('review');
      }
    });
  }

  function handleReset() {
    setTransactions([]);
    setSource(null);
    setError(null);
    setParseWarning(null);
    setConfirmResult(null);
    setPhase('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Cabeçalho de sub-página (mesmo padrão de Perfil > Ganhos, Categorias, Notificações).
  const header = (
    <div className="flex items-center gap-3 py-5 mb-2 animate-fade-up delay-0">
      <Link
        href="/perfil"
        className="p-2 hover:bg-[#F1F3F7] rounded-full transition-colors"
        aria-label="Voltar para Perfil"
      >
        <ArrowLeft size={20} className="text-[#1A1D23]" />
      </Link>
      <div>
        <h1 className="text-xl font-bold text-[#1A1D23]">Importar extrato</h1>
        <p className="text-xs text-[#6B7280]">
          {phase === 'done'
            ? 'Importação concluída.'
            : 'Importe gastos e ganhos do seu banco.'}
        </p>
      </div>
    </div>
  );

  if (phase === 'done' && confirmResult) {
    return (
      <div className="max-w-lg mx-auto px-4 pb-4 [scrollbar-gutter:stable]">
        {header}
        <div className="flex flex-col items-center py-12 text-center animate-fade-up delay-1">
          <div className="w-16 h-16 rounded-full bg-[#EEF9F4] flex items-center justify-center mb-4">
            <Check size={32} weight="bold" className="text-[#2E8F67] dark:text-[#7EE0AE]" />
          </div>
          <h2 className="text-xl font-bold text-[#1A1D23]">
            {confirmResult.imported} transações importadas
          </h2>
          {confirmResult.skipped > 0 && (
            <p className="text-sm text-[#6B7280] mt-1">
              {confirmResult.skipped} transação(ões) pulada(s)
            </p>
          )}
          {confirmResult.errors.length > 0 && (
            <div className="mt-4 w-full rounded-[12px] bg-[#FDF0F0] border border-[#F4D7D7] p-3 text-left text-[#B14C4C] dark:text-[var(--color-error)]">
              <p className="text-xs font-bold mb-1">Erros:</p>
              <ul className="space-y-1">
                {confirmResult.errors.slice(0, 5).map((e, i) => (
                  <li key={i} className="text-xs">{e}</li>
                ))}
                {confirmResult.errors.length > 5 && (
                  <li className="text-xs">
                    +{confirmResult.errors.length - 5} erro(s) adicional(is)
                  </li>
                )}
              </ul>
            </div>
          )}
          <div className="mt-6 flex gap-3 w-full">
            <button
              type="button"
              onClick={handleReset}
              className="gesture-button flex-1 rounded-full bg-[#F1F3F7] py-3.5 text-[15px] font-semibold text-[#6B7280] hover:bg-[#E5E7EB]"
            >
              Importar outro
            </button>
            <Link
              href="/app"
              className="gesture-button-primary flex-1 flex items-center justify-center rounded-full bg-[#5BBF8E] py-3.5 text-[15px] font-semibold text-white hover:bg-[#4AA77C] shadow-[0_6px_20px_rgba(91,191,142,0.35)]"
            >
              Ver dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-4 [scrollbar-gutter:stable]">
      {header}

      {error && (
        <div
          role="alert"
          className="mt-2 flex items-start gap-2 px-4 py-3 rounded-[12px] bg-[#FDF0F0] text-[#B14C4C] border border-[#F4D7D7] dark:text-[var(--color-error)]"
        >
          <WarningCircle size={18} className="shrink-0 mt-px" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {parseWarning && (
        <div className="mt-2 flex items-start gap-2 px-4 py-3 rounded-[12px] bg-[#FFF7E8] text-[#8A5A12] border border-[#FDE9C8] dark:text-[var(--color-warning)] dark:border-[color-mix(in_srgb,var(--color-warning)_28%,transparent)]">
          <WarningCircle size={18} className="shrink-0 mt-px" />
          <p className="text-sm font-medium">{parseWarning}</p>
        </div>
      )}

      {phase === 'upload' && !parsing && (
        <section className="mt-4 animate-fade-up delay-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".ofx,.qfx,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="gesture-button w-full flex flex-col items-center gap-3 py-12 rounded-[16px] border-2 border-dashed border-[#D1D9E6] hover:border-[#5BBF8E] hover:bg-[#EEF9F4] transition-colors"
          >
            <div className="w-14 h-14 rounded-full bg-[#F8F9FB] flex items-center justify-center">
              <UploadSimple size={28} weight="bold" className="text-[#5BBF8E]" />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-[#1A1D23]">
                Selecionar arquivo
              </p>
              <p className="text-sm text-[#6B7280] mt-1">
                Formatos suportados: OFX e CSV
              </p>
            </div>
          </button>
          <div className="mt-6 space-y-2 px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Como importar
            </h2>
            <ol className="text-sm text-[#6B7280] space-y-2 list-none">
              <li>1. Acesse o app ou site do seu banco</li>
              <li>2. Exporte o extrato em formato OFX ou CSV</li>
              <li>3. Selecione o arquivo aqui acima</li>
              <li>4. Revise as transações e confirme a importação</li>
            </ol>
          </div>
        </section>
      )}

      {parsing && (
        <div className="mt-6 flex flex-col items-center py-12" role="status">
          <Spinner />
          <p className="text-sm text-[#6B7280] mt-3">Processando arquivo...</p>
        </div>
      )}

      {phase === 'importing' && (
        <div className="mt-6 flex flex-col items-center py-12" role="status">
          <Spinner />
          <p className="text-sm text-[#6B7280] mt-3">Importando transações...</p>
        </div>
      )}

      {phase === 'review' && (
        <section className="mt-4 animate-fade-up delay-1">
          <div className="flex items-center gap-3 mb-3 px-1">
            <span className="text-xs font-medium text-[#6B7280]">
              {source?.toUpperCase()} · {transactions.length} transações
            </span>
            <button
              type="button"
              onClick={invertAllTypes}
              className="text-xs font-semibold text-[#6B7280] hover:text-[#1A1D23] transition-colors"
            >
              Inverter tipos
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="ml-auto text-xs font-semibold text-[#6B7280] hover:text-[#1A1D23] transition-colors"
            >
              Cancelar
            </button>
          </div>

          {expenses.length > 0 && (
            <TransactionSection
              title="Despesas"
              transactions={expenses}
              categories={categories}
              onToggle={toggleTransaction}
              onToggleAll={(sel) => toggleAllByType('expense', sel)}
              onUpdateCategory={updateCategory}
              onToggleType={toggleTransactionType}
              onUpdate={updateTransaction}
            />
          )}

          {incomes.length > 0 && (
            <div className="mt-6">
              <TransactionSection
                title="Receitas"
                transactions={incomes}
                categories={categories}
                onToggle={toggleTransaction}
                onToggleAll={(sel) => toggleAllByType('income', sel)}
                onUpdateCategory={updateCategory}
                onToggleType={toggleTransactionType}
                onUpdate={updateTransaction}
                isIncome
              />
            </div>
          )}

          {/* Espaço reservado para que o fim da lista não fique coberto pelo card flutuante. */}
          <div aria-hidden style={{ height: footerHeight + 24 }} />
        </section>
      )}

      {/* Fora da <section> animada: animate-fade-up usa transform, o que quebraria o position: fixed. */}
      {phase === 'review' && (
        <div
          ref={footerRef}
          className="themed-card fixed left-1/2 z-[38] -translate-x-1/2 rounded-[22px] p-3 shadow-md"
          style={{
            width: 'min(calc(100vw - 1.5rem), 36rem)',
            bottom: FOOTER_BOTTOM,
          }}
        >
          <p className="text-sm px-1 mb-2.5 tabular-nums">
            <span className="font-bold text-[#1A1D23]">
              {totalSelected} selecionada(s)
            </span>
            <span className="text-[#6B7280]">
              {' · '}
              {formatCurrency(totalExpenses)} em despesas
              {totalIncomes > 0 && ` + ${formatCurrency(totalIncomes)} em receitas`}
            </span>
          </p>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={totalSelected === 0 || pending}
            className="gesture-button-primary w-full bg-[#5BBF8E] hover:bg-[#4AA77C] text-white font-semibold text-[15px] h-12 rounded-full shadow-[0_6px_20px_rgba(91,191,142,0.35)] disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {pending ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Importando...
              </>
            ) : (
              `Importar ${totalSelected} transação(ões)`
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function TransactionSection({
  title,
  transactions,
  categories,
  onToggle,
  onToggleAll,
  onUpdateCategory,
  onToggleType,
  onUpdate,
  isIncome,
}: {
  title: string;
  transactions: ParsedTransaction[];
  categories: Category[];
  onToggle: (id: string) => void;
  onToggleAll: (selected: boolean) => void;
  onUpdateCategory: (id: string, categoryId: string) => void;
  onToggleType: (id: string) => void;
  onUpdate: (id: string, patch: TransactionPatch) => void;
  isIncome?: boolean;
}) {
  const allSelected = transactions.every((t) => t.selected);

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2.5 px-1">
        <button
          type="button"
          onClick={() => onToggleAll(!allSelected)}
          className={`w-5 h-5 rounded-[6px] border flex items-center justify-center transition-colors ${
            allSelected
              ? 'bg-[#5BBF8E] border-[#5BBF8E] text-white'
              : 'border-[#D1D5DB] bg-white text-transparent'
          }`}
          aria-label={`${allSelected ? 'Desmarcar' : 'Marcar'} todas as ${title.toLowerCase()}`}
        >
          {allSelected && <Check size={12} weight="bold" />}
        </button>
        <h2 className="text-sm font-bold text-[#1A1D23]">
          {title} ({transactions.length})
        </h2>
      </div>
      <div className="space-y-2">
        {transactions.map((tx) => (
          <TransactionRow
            key={tx.id}
            tx={tx}
            categories={categories}
            onToggle={() => onToggle(tx.id)}
            onUpdateCategory={(catId) => onUpdateCategory(tx.id, catId)}
            onToggleType={() => onToggleType(tx.id)}
            onUpdate={(patch) => onUpdate(tx.id, patch)}
            isIncome={isIncome}
          />
        ))}
      </div>
    </div>
  );
}

function TransactionRow({
  tx,
  categories,
  onToggle,
  onUpdateCategory,
  onToggleType,
  onUpdate,
  isIncome,
}: {
  tx: ParsedTransaction;
  categories: Category[];
  onToggle: () => void;
  onUpdateCategory: (categoryId: string) => void;
  onToggleType: () => void;
  onUpdate: (patch: TransactionPatch) => void;
  isIncome?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draftDescription, setDraftDescription] = useState(tx.description);
  const [draftDate, setDraftDate] = useState(tx.date);
  const [draftAmount, setDraftAmount] = useState((tx.amountCents / 100).toFixed(2));

  const draftAmountCents = Math.round(Number(draftAmount.replace(',', '.')) * 100);
  const draftErrors: string[] = [];
  if (!draftDescription.trim()) draftErrors.push('Informe a descrição.');
  if (draftDescription.trim().length > MAX_DESCRIPTION_LENGTH)
    draftErrors.push(`Descrição com no máximo ${MAX_DESCRIPTION_LENGTH} caracteres.`);
  if (!isValidIsoDate(draftDate)) draftErrors.push('Data inválida.');
  if (
    !Number.isFinite(draftAmountCents) ||
    draftAmountCents <= 0 ||
    draftAmountCents > MAX_AMOUNT_CENTS
  )
    draftErrors.push('Valor deve ser maior que zero.');
  const draftValid = draftErrors.length === 0;

  const category = isIncome
    ? undefined
    : categories.find((c) => c.id === tx.suggestedCategoryId);
  const tileIcon = isIncome ? INCOME_ICON : category?.icon ?? NEUTRAL_EXPENSE_ICON;
  const tileColor = isIncome ? INCOME_COLOR : category?.color ?? NEUTRAL_EXPENSE_COLOR;

  function startEditing() {
    setDraftDescription(tx.description);
    setDraftDate(tx.date);
    setDraftAmount((tx.amountCents / 100).toFixed(2));
    setEditing(true);
  }

  function saveEditing() {
    if (!draftValid) return;
    onUpdate({
      description: draftDescription.trim(),
      date: draftDate,
      amountCents: draftAmountCents,
    });
    setEditing(false);
  }

  if (editing) {
    const inputClass =
      'w-full border border-[#E5E7EB] rounded-[10px] px-3 py-2.5 text-sm text-[#1A1D23] bg-[#F8F9FB] outline-none focus:border-[#A8C5E0] focus:bg-white transition-colors';
    const labelClass = 'block text-xs font-bold text-[#6B7280] uppercase mb-1.5';
    return (
      <div className="rounded-[12px] border border-[#A8C5E0] bg-white dark:bg-[var(--color-surface)] p-3 space-y-3">
        <label className="block">
          <span className={labelClass}>Descrição</span>
          <input
            type="text"
            value={draftDescription}
            maxLength={MAX_DESCRIPTION_LENGTH}
            onChange={(e) => setDraftDescription(e.target.value)}
            className={inputClass}
          />
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <label className="block">
            <span className={labelClass}>Data</span>
            <input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Valor (R$)</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              value={draftAmount}
              onChange={(e) => setDraftAmount(e.target.value)}
              className={`${inputClass} tabular-nums`}
            />
          </label>
        </div>
        {!draftValid && (
          <p className="text-xs text-[#B14C4C] dark:text-[var(--color-error)]">{draftErrors[0]}</p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="gesture-button rounded-full bg-[#F1F3F7] px-4 py-2 text-xs font-bold text-[#6B7280] hover:bg-[#E5E7EB] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={saveEditing}
            disabled={!draftValid}
            className="gesture-button-primary rounded-full bg-[#5BBF8E] px-4 py-2 text-xs font-bold text-white hover:bg-[#4AA77C] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Salvar
          </button>
        </div>
      </div>
    );
  }

  const chipClass =
    'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors';

  return (
    <div
      className={`themed-card flex items-start gap-3 rounded-[12px] p-3 transition-opacity duration-150 ${
        tx.selected ? '' : 'opacity-60'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`mt-2.5 w-5 h-5 shrink-0 rounded-[6px] border flex items-center justify-center transition-colors ${
          tx.selected
            ? 'bg-[#5BBF8E] border-[#5BBF8E] text-white'
            : 'border-[#D1D5DB] bg-white text-transparent'
        }`}
        aria-label={tx.selected ? 'Desmarcar' : 'Marcar'}
      >
        {tx.selected && <Check size={12} weight="bold" />}
      </button>

      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${tileColor}22`, color: tileColor }}
        aria-hidden
      >
        <Icon name={tileIcon} size={20} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[15px] font-medium leading-tight text-[#1A1D23] truncate">
            {tx.description}
          </p>
          <span
            className={`text-[15px] font-semibold tabular-nums shrink-0 ${
              isIncome ? 'text-[#10B981]' : 'text-[#1A1D23]'
            }`}
          >
            {isIncome ? '+' : '-'}
            {formatCurrency(tx.amountCents)}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-[#6B7280] mr-0.5">{formatDate(tx.date)}</span>
          <button
            type="button"
            onClick={startEditing}
            className={`${chipClass} border-[#E5E7EB] bg-[#F8F9FB] text-[#6B7280] hover:bg-[#F1F3F7]`}
            aria-label="Editar transação"
            title="Editar descrição, data e valor"
          >
            <PencilSimple size={11} weight="bold" /> Editar
          </button>
          <button
            type="button"
            onClick={onToggleType}
            className={`${chipClass} ${
              isIncome
                ? 'border-[#BFE5D2] bg-[#EEF9F4] text-[#2E8F67] hover:bg-[#DDF2E8] dark:text-[#7EE0AE]'
                : 'border-[#E5E7EB] bg-[#F8F9FB] text-[#6B7280] hover:bg-[#F1F3F7]'
            }`}
            aria-label={`Alterar para ${isIncome ? 'despesa' : 'receita'}`}
            title="Alternar entre despesa e receita"
          >
            {isIncome ? 'Receita' : 'Despesa'}
          </button>
          {!isIncome && (
            <div className="relative">
              <select
                value={tx.suggestedCategoryId ?? ''}
                onChange={(e) => onUpdateCategory(e.target.value)}
                className="appearance-none text-[11px] font-semibold text-[#6B7280] bg-[#F8F9FB] border border-[#E5E7EB] rounded-full pl-2.5 pr-6 py-1 outline-none focus:border-[#A8C5E0] cursor-pointer transition-colors"
                aria-label="Categoria da transação"
              >
                <option value="">Sem categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <CaretDown
                size={10}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none"
              />
            </div>
          )}
          {tx.confidence === 'low' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#386F95] dark:text-[#A8C5E0]">
              <Sparkle size={11} weight="fill" /> Sugerido por IA
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
