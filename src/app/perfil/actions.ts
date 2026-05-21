'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createSessionClient, createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export async function updateDisplayName(formData: FormData): Promise<ActionResult> {
  const raw = formData.get('name');
  const name = typeof raw === 'string' ? raw.trim() : '';

  if (name.length < 2) {
    return { ok: false, error: 'O nome deve ter pelo menos 2 caracteres.' };
  }
  if (name.length > 80) {
    return { ok: false, error: 'O nome deve ter no máximo 80 caracteres.' };
  }

  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sessão expirada. Entre novamente.' };

  const { error } = await supabase.auth.updateUser({ data: { name } });
  if (error) return { ok: false, error: 'Não foi possível atualizar o nome. Tente novamente.' };

  revalidatePath('/perfil');
  return { ok: true, message: 'Nome atualizado.' };
}

export async function sendPasswordReset(): Promise<ActionResult> {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: 'Sessão expirada. Entre novamente.' };

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const origin = host ? `${proto}://${host}` : '';

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: origin ? `${origin}/auth/callback?next=/perfil` : undefined,
  });
  if (error) return { ok: false, error: 'Não foi possível enviar o email. Tente novamente.' };

  return { ok: true, message: `Enviamos um link de redefinição para ${user.email}.` };
}

export async function signOut(): Promise<void> {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function deleteAccount(): Promise<ActionResult> {
  if (!isSupabaseEnabled()) {
    return { ok: false, error: 'Exclusão indisponível neste ambiente.' };
  }

  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sessão expirada. Entre novamente.' };

  const admin = createServiceClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, error: 'Não foi possível excluir a conta. Tente novamente.' };

  await supabase.auth.signOut();
  redirect('/login');
}
