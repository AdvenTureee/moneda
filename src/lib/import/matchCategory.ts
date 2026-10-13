import type { Category } from '@/types';
import { categorizeWithAI } from '@/lib/groq';
import type { ParsedTransaction } from './types';

function matchByKeywords(
  description: string,
  categories: Category[],
): { categoryId: string; confidence: 'high' | 'low' } | null {
  const lower = description.toLowerCase();

  for (const cat of categories) {
    if (!cat.keywords || cat.keywords.length === 0) continue;
    for (const kw of cat.keywords) {
      if (!kw) continue;
      if (lower.includes(kw.toLowerCase())) {
        return { categoryId: cat.id, confidence: 'high' };
      }
    }
  }

  for (const cat of categories) {
    const catName = cat.name.toLowerCase();
    if (catName.length >= 4 && lower.includes(catName)) {
      return { categoryId: cat.id, confidence: 'low' };
    }
  }

  return null;
}

export async function autoCategorize(
  transactions: ParsedTransaction[],
  categories: Category[],
): Promise<ParsedTransaction[]> {
  const needsAI: number[] = [];

  const updated = transactions.map((tx, idx) => {
    if (tx.type === 'income') {
      return { ...tx, suggestedCategoryId: null, confidence: 'none' as const };
    }

    const match = matchByKeywords(tx.description, categories);
    if (match) {
      return {
        ...tx,
        suggestedCategoryId: match.categoryId,
        confidence: match.confidence,
      };
    }

    needsAI.push(idx);
    return tx;
  });

  const hasGroqKey = Boolean(process.env.GROQ_API_KEY);

  if (hasGroqKey && needsAI.length > 0 && needsAI.length <= 50) {
    const aiBatches = needsAI.reduce<number[][]>((batches, idx, i) => {
      const batchIdx = Math.floor(i / 10);
      if (!batches[batchIdx]) batches[batchIdx] = [];
      batches[batchIdx].push(idx);
      return batches;
    }, []);

    for (const batch of aiBatches) {
      await Promise.all(
        batch.map(async (idx) => {
          try {
            const categoryId = await categorizeWithAI(
              updated[idx].description,
              categories,
            );
            const exists = categories.some((c) => c.id === categoryId);
            updated[idx] = {
              ...updated[idx],
              suggestedCategoryId: exists ? categoryId : null,
              confidence: exists ? 'low' : 'none',
            };
          } catch (err) {
            console.error('[matchCategory] AI categorization failed for idx', idx, err);
          }
        }),
      );
    }
  }

  return updated;
}

export function getDefaultCategoryId(categories: Category[]): string | null {
  const outros = categories.find(
    (c) => c.id === 'outros' || c.name.toLowerCase() === 'outros',
  );
  return outros?.id ?? categories[0]?.id ?? null;
}
