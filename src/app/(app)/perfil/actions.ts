'use server';

import { redirect } from 'next/navigation';
import { revalidatePath, revalidateTag } from 'next/cache';
import { headers } from 'next/headers';
import { createSessionClient, createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { cacheTags } from '@/lib/cache';
import { PASSWORD_REQUIREMENTS_LABEL, isStrongPassword } from '@/lib/password';
import {
  buildProfileIdentityPiiUpdate,
  buildProfilePhonePiiUpdate,
} from '@/lib/security/profilePii';
import { normalizeWhatsappPhone } from '@/lib/phone';
import { resolveUserHasPassword } from '@/lib/auth/password';
import type { NotificationPrefs } from './notification-prefs';

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const DELETE_REASON_CODES = [
  'not_using',
  'hard_to_use',
  'missing_feature',
  'technical_issue',
  'privacy_concern',
  'other',
] as const;

const DELETE_REASON_CODE_SET = new Set<string>(DELETE_REASON_CODES);

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

  if (isSupabaseEnabled()) {
    try {
      const admin = createServiceClient();
      const { error: profileError } = await admin
        .from('profiles')
        .update({
          ...buildProfileIdentityPiiUpdate({
            name,
            email: user.email ?? null,
          }),
        })
        .eq('id', user.id);
      if (profileError) {
        console.error('[updateDisplayName] profile sync failed', {
          message: profileError.message,
          code: profileError.code,
        });
        return { ok: false, error: 'Nome atualizado no Auth, mas não foi possível proteger o perfil.' };
      }
    } catch {
      return { ok: false, error: 'Configuração de proteção de dados indisponível.' };
    }
  }

  revalidatePath('/perfil');
  revalidateTag(cacheTags.profile(user.id), { expire: 0 });
  return { ok: true, message: 'Nome atualizado.' };
}

export async function updateWhatsappPhone(rawPhone: string | null): Promise<ActionResult> {
  if (!isSupabaseEnabled()) {
    return { ok: false, error: 'Configuração indisponível neste ambiente.' };
  }

  const hasValue = typeof rawPhone === 'string' && rawPhone.trim().length > 0;
  const normalizedPhone = hasValue ? normalizeWhatsappPhone(rawPhone) : null;
  if (hasValue && !normalizedPhone) {
    return { ok: false, error: 'Informe um telefone válido com DDD.' };
  }

  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sessão expirada. Entre novamente.' };

  try {
    const admin = createServiceClient();
    const { error } = await admin
      .from('profiles')
      .update(buildProfilePhonePiiUpdate(normalizedPhone))
      .eq('id', user.id);

    if (error) {
      console.error('[updateWhatsappPhone]', { message: error.message, code: error.code });
      if (error.code === '23505') {
        return { ok: false, error: 'Este telefone já está vinculado a outra conta.' };
      }
      return { ok: false, error: 'Não foi possível salvar o telefone.' };
    }
  } catch {
    return { ok: false, error: 'Configuração de proteção de dados indisponível.' };
  }

  revalidatePath('/perfil');
  revalidatePath('/perfil/whatsapp');
  revalidateTag(cacheTags.profile(user.id), { expire: 0 });
  return {
    ok: true,
    message: normalizedPhone ? 'Telefone do WhatsApp atualizado.' : 'Telefone removido.',
  };
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

/**
 * Define uma senha inicial ou conclui uma redefinição aberta por email.
 */
export async function setInitialPassword(formData: FormData): Promise<ActionResult> {
  const password = String(formData.get('password') ?? '');
  if (!isStrongPassword(password)) {
    return { ok: false, error: PASSWORD_REQUIREMENTS_LABEL };
  }

  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sessão expirada. Entre novamente.' };

  let profileHasPassword: boolean | null = null;
  if (isSupabaseEnabled()) {
    const admin = createServiceClient();
    const { data } = await admin
      .from('profiles')
      .select('has_password')
      .eq('id', user.id)
      .maybeSingle();
    if (typeof data?.has_password === 'boolean') profileHasPassword = data.has_password;
  }
  const hadPassword = resolveUserHasPassword(user, profileHasPassword);

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error('[setInitialPassword]', error);
    return { ok: false, error: 'Não foi possível atualizar a senha. Tente novamente.' };
  }

  if (isSupabaseEnabled()) {
    const admin = createServiceClient();
    const { error: profileError } = await admin
      .from('profiles')
      .update({ has_password: true })
      .eq('id', user.id);
    if (profileError) {
      console.error('[setInitialPassword:profile]', profileError);
    }
  }

  revalidatePath('/perfil');
  revalidatePath('/perfil/senha');
  revalidateTag(cacheTags.profile(user.id), { expire: 0 });
  return { ok: true, message: hadPassword ? 'Senha atualizada.' : 'Senha definida. Agora você pode entrar com email também.' };
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
    redirectTo: origin ? `${origin}/redefinir-senha` : undefined,
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

export async function deleteAccount(formData?: FormData): Promise<ActionResult> {
  if (!isSupabaseEnabled()) {
    return { ok: false, error: 'Exclusão indisponível neste ambiente.' };
  }

  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sessão expirada. Entre novamente.' };

  const admin = createServiceClient();
  const reasonCodes = formData
    ?.getAll('reasonCodes')
    .filter((value): value is string => typeof value === 'string' && DELETE_REASON_CODE_SET.has(value)) ?? [];
  const otherReason = String(formData?.get('otherReason') ?? '').trim().slice(0, 500);

  if (reasonCodes.length > 0 || otherReason) {
    const { error: feedbackError } = await admin
      .from('account_deletion_feedback')
      .insert({
        reason_codes: Array.from(new Set(reasonCodes)),
        other_reason: otherReason || null,
      });
    if (feedbackError) {
      console.error('[deleteAccount:feedback]', feedbackError);
      return { ok: false, error: 'Não foi possível registrar o motivo. Tente novamente.' };
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, error: 'Não foi possível excluir a conta. Tente novamente.' };

  await supabase.auth.signOut();
  redirect('/login');
}
