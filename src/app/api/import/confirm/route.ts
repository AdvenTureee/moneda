import { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createServiceClient, createSessionClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { createExpense } from '@/lib/expenses';
import { createIncome } from '@/lib/incomes';
import { cacheTags } from '@/lib/cache';
import { noStoreJson } from '@/lib/http';
import { getDefaultCategoryId } from '@/lib/import/matchCategory';
import { getCategories } from '@/lib/categories';
import type { ConfirmTransaction } from '@/lib/import/types';
import { MAX_TRANSACTIONS_PER_IMPORT } from '@/lib/import/types';
import {
  planSeriesGroups,
  stripInstallmentMarker,
  type SeriesGroup,
} from '@/lib/import/seriesDetection';

function invalidateCaches(userId: string) {
  const opts = { expire: 0 } as const;
  revalidateTag(cacheTags.expenses(userId), opts);
  revalidateTag(cacheTags.metrics(userId), opts);
  revalidateTag(cacheTags.monthlyTotals(userId), opts);
  revalidateTag(cacheTags.profile(userId), opts);
}

interface ConfirmBody {
  transactions: ConfirmTransaction[];
}

const MAX_AMOUNT_CENTS = 100_000_000_000; // R$ 1 bilhão
const MAX_DESCRIPTION_LENGTH = 200;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateTransaction(tx: ConfirmTransaction, index: number): string | null {
  const label = `Transação ${index + 1}`;
  if (!tx || typeof tx !== 'object') return `${label}: dados inválidos.`;
  if (tx.type !== 'expense' && tx.type !== 'income') return `${label}: tipo inválido.`;
  if (typeof tx.date !== 'string' || !ISO_DATE_RE.test(tx.date) || Number.isNaN(new Date(`${tx.date}T00:00:00Z`).getTime()))
    return `${label}: data inválida.`;
  if (!Number.isInteger(tx.amountCents) || tx.amountCents <= 0 || tx.amountCents > MAX_AMOUNT_CENTS)
    return `${label}: valor inválido.`;
  if (typeof tx.description !== 'string' || !tx.description.trim())
    return `${label}: descrição obrigatória.`;
  if (tx.description.trim().length > MAX_DESCRIPTION_LENGTH)
    return `${label}: descrição com mais de ${MAX_DESCRIPTION_LENGTH} caracteres.`;
  if (tx.installment != null) {
    const { current, total } = tx.installment;
    if (
      !Number.isInteger(current) ||
      !Number.isInteger(total) ||
      total < 2 ||
      total > 120 ||
      current < 1 ||
      current > total
    )
      return `${label}: parcela inválida.`;
  }
  return null;
}

/**
 * Já existe série ativa equivalente (ex.: a mesma compra veio em um extrato
 * anterior)? Nesse caso não criamos outra, para não duplicar as parcelas.
 */
async function seriesAlreadyExists(
  userId: string,
  kind: 'installment' | 'recurring',
  description: string,
  amountCents: number,
  totalOccurrences: number | null,
): Promise<boolean> {
  if (!isSupabaseEnabled()) return false;
  const db = createServiceClient();
  let query = db
    .from('expense_series')
    .select('id')
    .eq('user_id', userId)
    .eq('kind', kind)
    .eq('description', description)
    .eq('amount_cents', amountCents)
    .eq('status', 'active')
    .is('deleted_at', null)
    .limit(1);
  query = totalOccurrences === null
    ? query.is('total_occurrences', null)
    : query.eq('total_occurrences', totalOccurrences);
  const { data, error } = await query;
  if (error) throw new Error(`seriesAlreadyExists: ${error.message}`);
  return (data ?? []).length > 0;
}

export async function POST(req: NextRequest) {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

  let body: ConfirmBody;
  try {
    body = await req.json();
  } catch {
    return noStoreJson({ error: 'JSON inválido.' }, { status: 400 });
  }

  if (!body.transactions || !Array.isArray(body.transactions)) {
    return noStoreJson({ error: 'Transações inválidas.' }, { status: 400 });
  }

  if (body.transactions.length === 0) {
    return noStoreJson({ error: 'Nenhuma transação selecionada.' }, { status: 422 });
  }

  if (body.transactions.length > MAX_TRANSACTIONS_PER_IMPORT) {
    return noStoreJson(
      { error: `Limite de ${MAX_TRANSACTIONS_PER_IMPORT} transações por importação.` },
      { status: 422 },
    );
  }

  for (let i = 0; i < body.transactions.length; i++) {
    const invalid = validateTransaction(body.transactions[i], i);
    if (invalid) {
      return noStoreJson({ error: invalid }, { status: 422 });
    }
  }

  const categories = await getCategories(user.id);
  const fallbackCategoryId = getDefaultCategoryId(categories);
  const validCategoryIds = new Set(categories.map((c) => c.id));

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Agrupa parcelas da mesma compra e recorrências em uma única série cada.
  const groups: SeriesGroup<ConfirmTransaction>[] = planSeriesGroups(body.transactions);

  for (const group of groups) {
    const members = group.members;
    const rep = members[0];
    const label = `${rep.description} (${rep.date})`;

    try {
      if (group.kind === 'single') {
        if (rep.type === 'expense') {
          const categoryId = validCategoryIds.has(rep.categoryId)
            ? rep.categoryId
            : fallbackCategoryId ?? 'outros';

          await createExpense({
            userId: user.id,
            amount: rep.amountCents,
            category: categoryId,
            description: rep.description.trim(),
            source: 'import',
            paymentMethod: 'other',
            tags: [],
            occurredAt: rep.date,
          });
        } else {
          await createIncome({
            userId: user.id,
            amount: rep.amountCents,
            description: rep.description.trim(),
            source: 'other',
            isRecurring: false,
            receivedAt: new Date(rep.date),
          });
        }
        imported++;
        continue;
      }

      const categoryId = validCategoryIds.has(rep.categoryId)
        ? rep.categoryId
        : fallbackCategoryId ?? 'outros';
      const seriesDescription = stripInstallmentMarker(rep.description);

      if (group.kind === 'installment' && rep.installment) {
        const total = rep.installment.total;
        if (await seriesAlreadyExists(user.id, 'installment', seriesDescription, rep.amountCents, total)) {
          skipped += members.length;
          continue;
        }
        await createExpense({
          userId: user.id,
          amount: rep.amountCents,
          category: categoryId,
          description: seriesDescription,
          source: 'import',
          paymentMethod: 'credit',
          creditDetails: {
            purchaseType: 'installment',
            installmentCurrent: rep.installment.current,
            installmentTotal: total,
          },
          tags: [],
          occurredAt: rep.date,
        });
        imported += members.length;
        continue;
      }

      // Recorrente: uma série a partir da primeira ocorrência.
      if (await seriesAlreadyExists(user.id, 'recurring', seriesDescription, rep.amountCents, null)) {
        skipped += members.length;
        continue;
      }
      await createExpense({
        userId: user.id,
        amount: rep.amountCents,
        category: categoryId,
        description: seriesDescription,
        source: 'import',
        paymentMethod: 'other',
        tags: [],
        occurredAt: rep.date,
        isRecurring: true,
      });
      imported += members.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      errors.push(`${label}: ${msg}`);
      skipped += members.length;
    }
  }

  invalidateCaches(user.id);

  return noStoreJson({ imported, skipped, errors });
}
