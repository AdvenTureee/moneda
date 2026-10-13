import { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createSessionClient } from '@/lib/supabase/server';
import { createExpense } from '@/lib/expenses';
import { createIncome } from '@/lib/incomes';
import { cacheTags } from '@/lib/cache';
import { noStoreJson } from '@/lib/http';
import { getDefaultCategoryId } from '@/lib/import/matchCategory';
import { getCategories } from '@/lib/categories';
import type { ConfirmTransaction } from '@/lib/import/types';
import { MAX_TRANSACTIONS_PER_IMPORT } from '@/lib/import/types';

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

  const categories = await getCategories(user.id);
  const fallbackCategoryId = getDefaultCategoryId(categories);
  const validCategoryIds = new Set(categories.map((c) => c.id));

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const tx of body.transactions) {
    try {
      if (tx.type === 'expense') {
        const categoryId = validCategoryIds.has(tx.categoryId)
          ? tx.categoryId
          : fallbackCategoryId ?? 'outros';

        await createExpense({
          userId: user.id,
          amount: tx.amountCents,
          category: categoryId,
          description: tx.description,
          source: 'import',
          paymentMethod: 'other',
          tags: [],
          occurredAt: tx.date,
        });
        imported++;
      } else {
        await createIncome({
          userId: user.id,
          amount: tx.amountCents,
          description: tx.description,
          source: 'other',
          isRecurring: false,
          receivedAt: new Date(tx.date),
        });
        imported++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      errors.push(`${tx.description} (${tx.date}): ${msg}`);
      skipped++;
    }
  }

  invalidateCaches(user.id);

  return noStoreJson({ imported, skipped, errors });
}
