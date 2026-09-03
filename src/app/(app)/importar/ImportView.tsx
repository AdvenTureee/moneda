'use client';

import { useState, useTransition, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  UploadSimple,
  WarningCircle,
  Check,
  X,
  CaretDown,
  Sparkle,
} from '@phosphor-icons/react';
import Link from 'next/link';
import Icon from '@/components/Icon';
import PageHeader from '@/components/PageHeader';
import { formatCurrency } from '@/lib/utils';
import type { Category } from '@/types';
import type { ParsedTransaction, ConfirmTransaction } from '@/lib/import/types';

interface ImportViewProps {
  categories: Category[];
}

type Phase = 'upload' | 'review' | 'importing' | 'done';

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

export default function ImportView({ categories }: ImportViewProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('upload');
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [source, setSource] = useState<'ofx' | 'csv' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parseWarning, setParseWarning] = useState<string | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmResponse | null>(null);
  const [pending, startTransition] = useTransition();

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
    }
  }

  function toggleTransaction(id: string) {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t)),
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

  if (phase === 'done' && confirmResult) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 pb-4">
        <PageHeader title="Importação" subtitle="" />
        <div className="flex flex-col items-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[#EEF9F4] flex items-center justify-center mb-4">
            <Check size={32} weight="bold" className="text-[#2E8F67]" />
          </div>
          <h2 className="text-xl font-heading text-[#1A1D23]">
            {confirmResult.imported} transações importadas
          </h2>
          {confirmResult.skipped > 0 && (
            <p className="text-sm text-[#6B7280] mt-1">
              {confirmResult.skipped} transção(ões) pulada(s)
            </p>
          )}
          {confirmResult.errors.length > 0 && (
            <div className="mt-4 w-full rounded-[12px] bg-[#FDF0F0] border border-[#F4D7D7] p-3 text-left">
              <p className="text-xs font-bold text-[#B14C4C] mb-1">Erros:</p>
              <ul className="space-y-1">
                {confirmResult.errors.slice(0, 5).map((e, i) => (
                  <li key={i} className="text-xs text-[#B14C4C]">{e}</li>
                ))}
                {confirmResult.errors.length > 5 && (
                  <li className="text-xs text-[#B14C4C]">
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
              className="flex-1 rounded-full bg-[#F1F3F7] py-3 text-sm font-bold text-[#6B7280] transition-colors hover:bg-[#E5E7EB] active:scale-[0.98]"
            >
              Importar outro
            </button>
            <Link
              href="/app"
              className="flex-1 rounded-full bg-[#5BBF8E] py-3 text-sm font-bold text-white transition-colors hover:bg-[#4AA77C] active:scale-[0.98] flex items-center justify-center"
            >
              Ver dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-4">
      <PageHeader
        title="Importar extrato"
        subtitle="Importe gastos e ganhos do seu banco."
        action={
          <Link
            href="/perfil"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F1F3F7] transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} weight="bold" className="text-[#1A1D23]" />
          </Link>
        }
      />

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-center gap-2 px-4 py-3 rounded-[12px] bg-[#FDF0F0] text-[#B14C4C] border border-[#F4D7D7]"
        >
          <WarningCircle size={18} className="shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {parseWarning && (
        <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-[12px] bg-[#FFF7E8] text-[#8A5A12] border border-[#FDE9C8]">
          <WarningCircle size={18} className="shrink-0" />
          <p className="text-sm font-medium">{parseWarning}</p>
        </div>
      )}

      {phase === 'upload' && !pending && (
        <section className="mt-6">
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
            className="w-full flex flex-col items-center gap-3 py-12 rounded-[20px] border-2 border-dashed border-[#E5E7EB] hover:border-[#5BBF8E] hover:bg-[#EEF9F4] transition-all active:scale-[0.99]"
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
          <div className="mt-5 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
              Como importar
            </p>
            <div className="text-sm text-[#6B7280] space-y-2">
              <p>1. Acesse o app ou site do seu banco</p>
              <p>2. Exporte o extrato em formato OFX ou CSV</p>
              <p>3. Selecione o arquivo aqui acima</p>
              <p>4. Revise as transações e confirme a importação</p>
            </div>
          </div>
        </section>
      )}

      {pending && phase !== 'review' && (
        <div className="mt-6 flex flex-col items-center py-12">
          <span className="w-8 h-8 border-2 border-[#5BBF8E]/30 border-t-[#5BBF8E] rounded-full animate-spin" />
          <p className="text-sm text-[#6B7280] mt-3">Processando arquivo...</p>
        </div>
      )}

      {phase === 'importing' && (
        <div className="mt-6 flex flex-col items-center py-12">
          <span className="w-8 h-8 border-2 border-[#5BBF8E]/30 border-t-[#5BBF8E] rounded-full animate-spin" />
          <p className="text-sm text-[#6B7280] mt-3">Importando transações...</p>
        </div>
      )}

      {phase === 'review' && (
        <section className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
              {source?.toUpperCase()} · {transactions.length} transações
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="ml-auto text-xs font-medium text-[#6B7280] hover:text-[#1A1D23] transition-colors"
            >
              Cancelar
            </button>
          </div>

          {expenses.length > 0 && (
            <TransactionSection
              title="Despesas"
              icon="outros"
              transactions={expenses}
              categories={categories}
              onToggle={toggleTransaction}
              onToggleAll={(sel) => toggleAllByType('expense', sel)}
              onUpdateCategory={updateCategory}
            />
          )}

          {incomes.length > 0 && (
            <div className="mt-4">
              <TransactionSection
                title="Receitas"
                icon="ganhos"
                transactions={incomes}
                categories={categories}
                onToggle={toggleTransaction}
                onToggleAll={(sel) => toggleAllByType('income', sel)}
                onUpdateCategory={updateCategory}
                isIncome
              />
            </div>
          )}

          <div className="sticky bottom-0 mt-6 -mx-4 px-4 py-3 bg-white border-t border-[#E5E7EB]">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm">
                <span className="font-bold text-[#1A1D23]">
                  {totalSelected} selecionada(s)
                </span>
                <span className="text-[#6B7280] ml-2">
                  {formatCurrency(totalExpenses)} em despesas
                  {totalIncomes > 0 && ` + ${formatCurrency(totalIncomes)} em receitas`}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={totalSelected === 0 || pending}
              className="w-full bg-[#5BBF8E] hover:bg-[#4AA77C] active:bg-[#3FA876] text-white font-bold py-3.5 rounded-full transition-colors duration-150 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
        </section>
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
  isIncome,
}: {
  title: string;
  icon: string;
  transactions: ParsedTransaction[];
  categories: Category[];
  onToggle: (id: string) => void;
  onToggleAll: (selected: boolean) => void;
  onUpdateCategory: (id: string, categoryId: string) => void;
  isIncome?: boolean;
}) {
  const allSelected = transactions.every((t) => t.selected);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
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
        <h3 className="text-sm font-bold text-[#1A1D23]">
          {title} ({transactions.length})
        </h3>
      </div>
      <div className="space-y-1.5">
        {transactions.map((tx) => (
          <TransactionRow
            key={tx.id}
            tx={tx}
            categories={categories}
            onToggle={() => onToggle(tx.id)}
            onUpdateCategory={(catId) => onUpdateCategory(tx.id, catId)}
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
  isIncome,
}: {
  tx: ParsedTransaction;
  categories: Category[];
  onToggle: () => void;
  onUpdateCategory: (categoryId: string) => void;
  isIncome?: boolean;
}) {
  const matchedCategory = categories.find(
    (c) => c.id === tx.suggestedCategoryId,
  );

  return (
    <div
      className={`flex items-start gap-2.5 rounded-[12px] border p-3 transition-colors ${
        tx.selected
          ? 'bg-white border-[#E5E7EB]'
          : 'bg-[#F8F9FB] border-transparent opacity-60'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`mt-0.5 w-5 h-5 shrink-0 rounded-[6px] border flex items-center justify-center transition-colors ${
          tx.selected
            ? 'bg-[#5BBF8E] border-[#5BBF8E] text-white'
            : 'border-[#D1D5DB] bg-white text-transparent'
        }`}
        aria-label={tx.selected ? 'Desmarcar' : 'Marcar'}
      >
        {tx.selected && <Check size={12} weight="bold" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-[#1A1D23] truncate">
            {tx.description}
          </p>
          <span
            className={`text-sm font-bold tabular-nums shrink-0 ${
              isIncome ? 'text-[#2E8F67]' : 'text-[#1A1D23]'
            }`}
          >
            {isIncome ? '+' : '-'}
            {formatCurrency(tx.amountCents)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-[#9CA3AF]">{formatDate(tx.date)}</span>
          {!isIncome && (
            <div className="relative">
              <select
                value={tx.suggestedCategoryId ?? ''}
                onChange={(e) => onUpdateCategory(e.target.value)}
                className="appearance-none text-xs font-medium text-[#6B7280] bg-[#F8F9FB] border border-[#E5E7EB] rounded-[6px] pl-2 pr-6 py-1 outline-none focus:border-[#A8C5E0] cursor-pointer transition-colors"
              >
                <option value="">Sem categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <CaretDown
                size={10}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none"
              />
            </div>
          )}
          {tx.confidence === 'low' && (
            <span className="flex items-center gap-0.5 text-[10px] text-[#A8C5E0]">
              <Sparkle size={9} weight="fill" /> IA
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
