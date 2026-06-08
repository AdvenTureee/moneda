import { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { createServiceClient, createSessionClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { cacheTags } from '@/lib/cache';
import { noStoreJson } from '@/lib/http';

const BUCKET = 'expense_receipts';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf',
};

function invalidateExpenseCaches(userId: string) {
  const opts = { expire: 0 } as const;
  revalidateTag(cacheTags.expenses(userId), opts);
  revalidateTag(cacheTags.metrics(userId), opts);
  revalidateTag(cacheTags.insights(userId), opts);
  revalidateTag(cacheTags.monthlyTotals(userId), opts);
}

async function getCurrentUser() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  return user;
}

async function getOwnedExpense(admin: ReturnType<typeof createServiceClient>, expenseId: string, userId: string) {
  const { data, error } = await admin
    .from('expenses')
    .select('id,user_id,receipt_path')
    .eq('id', expenseId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .single();

  if (error || !data) return null;
  return data;
}

export async function GET(req: NextRequest) {
  if (!isSupabaseEnabled()) {
    return noStoreJson({ error: 'Storage indisponível.' }, { status: 501 });
  }

  const user = await getCurrentUser();
  if (!user) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

  const expenseId = new URL(req.url).searchParams.get('expenseId');
  if (!expenseId) {
    return noStoreJson({ error: 'expenseId é obrigatório.' }, { status: 422 });
  }

  const admin = createServiceClient();
  const expense = await getOwnedExpense(admin, expenseId, user.id);
  if (!expense) return noStoreJson({ error: 'Gasto não encontrado.' }, { status: 404 });
  if (!expense.receipt_path) {
    return noStoreJson({ error: 'Nenhum comprovante anexado.' }, { status: 404 });
  }

  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(expense.receipt_path, 60 * 10);

  if (error) return noStoreJson({ error: 'Não foi possível abrir o comprovante.' }, { status: 500 });
  return noStoreJson({ url: data.signedUrl });
}

export async function POST(req: NextRequest) {
  if (!isSupabaseEnabled()) {
    return noStoreJson({ error: 'Storage indisponível.' }, { status: 501 });
  }

  const user = await getCurrentUser();
  if (!user) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const expenseId = String(formData.get('expenseId') ?? '');
  const file = formData.get('file');

  if (!expenseId) return noStoreJson({ error: 'expenseId é obrigatório.' }, { status: 422 });
  if (!file || !(file instanceof File)) {
    return noStoreJson({ error: 'Arquivo não enviado.' }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return noStoreJson({ error: 'Arquivo maior que 10MB.' }, { status: 413 });
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return noStoreJson({ error: 'Formato de comprovante não permitido.' }, { status: 415 });
  }

  const admin = createServiceClient();
  const expense = await getOwnedExpense(admin, expenseId, user.id);
  if (!expense) return noStoreJson({ error: 'Gasto não encontrado.' }, { status: 404 });

  const ext = MIME_TO_EXT[file.type] ?? 'bin';
  const path = `${user.id}/${expenseId}/${uuidv4()}.${ext}`;
  const buffer = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return noStoreJson({ error: 'Falha ao anexar comprovante.' }, { status: 500 });
  }

  const { error: updateError } = await admin
    .from('expenses')
    .update({
      receipt_path: path,
      receipt_file_name: file.name || `comprovante.${ext}`,
      receipt_mime_type: file.type,
      receipt_size_bytes: file.size,
      receipt_uploaded_at: new Date().toISOString(),
    })
    .eq('id', expenseId)
    .eq('user_id', user.id);

  if (updateError) {
    await admin.storage.from(BUCKET).remove([path]);
    return noStoreJson({ error: 'Upload feito, mas não foi possível vincular.' }, { status: 500 });
  }

  if (expense.receipt_path) {
    await admin.storage.from(BUCKET).remove([expense.receipt_path]);
  }

  invalidateExpenseCaches(user.id);
  return noStoreJson({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!isSupabaseEnabled()) {
    return noStoreJson({ error: 'Storage indisponível.' }, { status: 501 });
  }

  const user = await getCurrentUser();
  if (!user) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

  const expenseId = new URL(req.url).searchParams.get('expenseId');
  if (!expenseId) {
    return noStoreJson({ error: 'expenseId é obrigatório.' }, { status: 422 });
  }

  const admin = createServiceClient();
  const expense = await getOwnedExpense(admin, expenseId, user.id);
  if (!expense) return noStoreJson({ error: 'Gasto não encontrado.' }, { status: 404 });

  const { error: updateError } = await admin
    .from('expenses')
    .update({
      receipt_path: null,
      receipt_file_name: null,
      receipt_mime_type: null,
      receipt_size_bytes: null,
      receipt_uploaded_at: null,
    })
    .eq('id', expenseId)
    .eq('user_id', user.id);

  if (updateError) return noStoreJson({ error: 'Não foi possível remover.' }, { status: 500 });
  if (expense.receipt_path) await admin.storage.from(BUCKET).remove([expense.receipt_path]);

  invalidateExpenseCaches(user.id);
  return noStoreJson({ ok: true });
}
