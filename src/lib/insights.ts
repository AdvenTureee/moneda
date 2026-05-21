import type { AIInsight } from '@/types';
import type { Database } from '@/types/supabase';
import { createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';

type AIInsightRow = Database['public']['Tables']['ai_insights']['Row'];

function rowToAIInsight(row: AIInsightRow): AIInsight {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as import('@/types').AIInsightType,
    message: row.message,
    period: row.period,
    createdAt: new Date(row.created_at),
  };
}

export async function getLatestInsight(userId: string, period: string): Promise<AIInsight | null> {
  if (isSupabaseEnabled()) {
    const db = createServiceClient();
    const { data, error } = await db
      .from('ai_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('period', period)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`getLatestInsight: ${error.message}`);
    return data ? rowToAIInsight(data) : null;
  }

  return null;
}
