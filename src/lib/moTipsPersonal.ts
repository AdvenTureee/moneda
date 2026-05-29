import { unstable_cache } from 'next/cache';
import type { MoTip } from '@/data/moTips';
import { buildMoFinancialContext } from '@/lib/moFinancialContext';
import { generatePersonalizedMoTips } from '@/lib/groq';
import { cacheTags } from '@/lib/cache';
import type { User } from '@supabase/supabase-js';

async function generatePersonalMoTipsImpl(user: User, period: string): Promise<MoTip[]> {
  if (!process.env.GROQ_API_KEY) return [];

  const ctx = await buildMoFinancialContext(user, period);
  if (!ctx || ctx.expenseCount === 0) return [];

  const { tips } = await generatePersonalizedMoTips(ctx);
  const finalTexts =
    tips.length >= 2
      ? tips
      : ctx.analyticalSignals.map((s) => s.slice(0, 140)).filter((s) => s.length >= 45).slice(0, 5);

  return finalTexts.map((text, i) => ({
    id: `personal-${period}-${i}`,
    kind: 'personal' as const,
    text,
  }));
}

export async function getPersonalizedMoTips(user: User, period: string): Promise<MoTip[]> {
  return unstable_cache(
    () => generatePersonalMoTipsImpl(user, period),
    ['mo-tips-personal', 'v3', user.id, period],
    {
      tags: [
        cacheTags.metrics(user.id),
        cacheTags.insights(user.id),
        cacheTags.expenses(user.id),
        cacheTags.budgets(user.id),
      ],
      revalidate: 3600,
    },
  )();
}
