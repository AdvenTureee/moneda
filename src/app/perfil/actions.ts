'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createSessionClient, createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';
import type { NotificationPrefs } from './notification-prefs';

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

const SUPPORTED_CURRENCIES = ['BRL', 'USD', 'EUR', 'GBP'] as const;
type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

function isSupportedCurrency(s: unknown): s is SupportedCurrency {
  return typeof s === 'string' && (SUPPORTED_CURRENCIES as readonly string[]).includes(s);
}

export async function updateCurrency(formData: FormData): Promise<ActionResult> {
  const raw = formData.get('currency');
  if (!isSupportedCurrency(raw)) {
    return { ok: false, error: 'Moeda não suportada.' };
  }

  if (!isSupabaseEnabled()) {
    return { ok: false, error: 'Configuração indisponível neste ambiente.' };
  }

  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sessão expirada. Entre novamente.' };

  const admin = createServiceClient();
  const { error } = await admin
    .from('profiles')
    .update({ currency: raw })
    .eq('id', user.id);
  if (error) {
    console.error('[updateCurrency]', error);
    return { ok: false, error: 'Não foi possível salvar. Tente novamente.' };
  }

  revalidatePath('/perfil');
  revalidatePath('/perfil/moeda');
  return { ok: true, message: `Moeda atualizada para ${raw}.` };
}

export async function updateEmail(formData: FormData): Promise<ActionResult> {
  const raw = formData.get('email');
  const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Informe um email válido.' };
  }

  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sessão expirada. Entre novamente.' };
  if (user.email?.toLowerCase() === email) {
    return { ok: false, error: 'Este já é o seu email atual.' };
  }

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const origin = host ? `${proto}://${host}` : '';

  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: origin ? `${origin}/auth/callback?next=/perfil` : undefined },
  );
  if (error) {
    console.error('[updateEmail]', error);
    return { ok: false, error: 'Não foi possível solicitar a troca de email. Tente novamente.' };
  }

  return {
    ok: true,
    message: `Enviamos um link de confirmação para ${email} e para ${user.email}. Clique nos dois para concluir a troca.`,
  };
}

export async function updateNotificationPrefs(formData: FormData): Promise<ActionResult> {
  if (!isSupabaseEnabled()) {
    return { ok: false, error: 'Indisponível neste ambiente.' };
  }

  const prefs: NotificationPrefs = {
    email_summary_weekly: formData.get('email_summary_weekly') === 'on',
    email_budget_alert: formData.get('email_budget_alert') === 'on',
    push_budget_alert: formData.get('push_budget_alert') === 'on',
  };

  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sessão expirada. Entre novamente.' };

  const admin = createServiceClient();
  const { error } = await admin
    .from('profiles')
    .update({ notification_prefs: prefs } as never)
    .eq('id', user.id);
  if (error) {
    console.error('[updateNotificationPrefs]', error);
    return { ok: false, error: 'Não foi possível salvar as preferências.' };
  }

  revalidatePath('/perfil/notificacoes');
  return { ok: true, message: 'Preferências atualizadas.' };
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
  if (error) {
    console.error('[resetPassword]', error);
    return { ok: false, error: 'Não foi possível enviar o email. Tente novamente.' };
  }

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
