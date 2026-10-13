import { NextRequest } from 'next/server';
import { createSessionClient } from '@/lib/supabase/server';
import { getCategories } from '@/lib/categories';
import { autoCategorize } from '@/lib/import/matchCategory';
import { parseOFXContent } from '@/lib/import/ofxParser';
import { parseCSVContent } from '@/lib/import/csvParser';
import { MAX_FILE_SIZE_BYTES, MAX_TRANSACTIONS_PER_IMPORT } from '@/lib/import/types';
import { noStoreJson } from '@/lib/http';

function detectFileType(filename: string, content: string): 'ofx' | 'csv' | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.ofx') || lower.endsWith('.qfx')) return 'ofx';
  if (lower.endsWith('.csv')) return 'csv';

  const trimmed = content.trimStart().slice(0, 200);
  if (trimmed.startsWith('OFXHEADER') || trimmed.startsWith('<?')) return 'ofx';
  if (trimmed.includes(',') || trimmed.includes(';')) return 'csv';

  return null;
}

export async function POST(req: NextRequest) {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return noStoreJson({ error: 'Arquivo inválido.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return noStoreJson({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return noStoreJson(
      { error: 'Arquivo muito grande. Limite de 5MB.' },
      { status: 413 },
    );
  }

  let content: string;
  try {
    content = await file.text();
  } catch {
    return noStoreJson({ error: 'Não foi possível ler o arquivo.' }, { status: 400 });
  }

  if (!content.trim()) {
    return noStoreJson({ error: 'Arquivo vazio.' }, { status: 400 });
  }

  const fileType = detectFileType(file.name, content);
  if (!fileType) {
    return noStoreJson(
      { error: 'Formato não suportado. Use OFX ou CSV.' },
      { status: 422 },
    );
  }

  try {
    let parsed;
    if (fileType === 'ofx') {
      parsed = parseOFXContent(content);
    } else {
      const csvResult = parseCSVContent(content);
      parsed = { transactions: csvResult.transactions };
    }

    let transactions = parsed.transactions.slice(0, MAX_TRANSACTIONS_PER_IMPORT);

    if (transactions.length === 0) {
      return noStoreJson(
        { error: 'Nenhuma transação encontrada no arquivo.' },
        { status: 422 },
      );
    }

    const categories = await getCategories(user.id);
    transactions = await autoCategorize(transactions, categories);

    return noStoreJson({
      transactions,
      source: fileType,
      bankName: parsed.bankName,
      accountLast4: parsed.accountLast4,
      truncated: parsed.transactions.length > MAX_TRANSACTIONS_PER_IMPORT,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao processar arquivo.';
    return noStoreJson({ error: message }, { status: 422 });
  }
}
