'use server';

import { redirect } from 'next/navigation';
import { revalidatePath, revalidateTag } from 'next/cache';
import { headers } from 'next/headers';
import { createAnonClient, createSessionClient, createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { allUserTags, cacheTags } from '@/lib/cache';
import { PASSWORD_REQUIREMENTS_LABEL, isStrongPassword } from '@/lib/password';
import {
  buildProfileIdentityPiiUpdate,
  buildProfilePhonePiiUpdate,
} from '@/lib/security/profilePii';
import { normalizeWhatsappPhone } from '@/lib/phone';
import { resolveUserHasPassword } from '@/lib/auth/password';
import { normalizeBillingClosingDay } from '@/lib/billingCycle';
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
  revalidateTag(cacheTags.profile(user.id), { expire: 0 });
  return { ok: true, message: `Moeda atualizada para ${raw}.` };
}

export async function updateBillingClosingDay(formData: FormData): Promise<ActionResult> {
  if (!isSupabaseEnabled()) {
    return { ok: false, error: 'Configuração indisponível neste ambiente.' };
  }

  const raw = Number(formData.get('billingClosingDay'));
  if (!Number.isInteger(raw) || raw < 1 || raw > 28) {
    return { ok: false, error: 'Dia de fechamento deve estar entre 1 e 28.' };
  }

  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sessão expirada. Entre novamente.' };

  const admin = createServiceClient();
  const { error } = await admin
    .from('profiles')
    .update({ billing_closing_day: normalizeBillingClosingDay(raw) })
    .eq('id', user.id);
  if (error) {
    console.error('[updateBillingClosingDay]', error);
    return { ok: false, error: 'Não foi possível salvar o fechamento.' };
  }

  revalidatePath('/app');
  revalidatePath('/perfil');
  revalidatePath('/perfil/fechamento');
  for (const tag of allUserTags(user.id)) revalidateTag(tag, { expire: 0 });
  return { ok: true, message: `Fechamento atualizado para dia ${raw}.` };
}

export async function sendEmailChangeOtp(formData: FormData): Promise<ActionResult> {
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

  // Re-autenticação se tem senha
  let hasPassword = false;
  if (isSupabaseEnabled()) {
    const admin = createServiceClient();
    const { data } = await admin
      .from('profiles')
      .select('has_password')
      .eq('id', user.id)
      .maybeSingle();
    if (typeof data?.has_password === 'boolean') hasPassword = data.has_password;
  }
  if (hasPassword) {
    const currentPassword = formData.get('currentPassword');
    if (typeof currentPassword !== 'string' || !currentPassword) {
      return { ok: false, error: 'Informe sua senha atual para trocar o email.' };
    }
    const { error: verifyError } = await createAnonClient().auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });
    if (verifyError) {
      console.error('[sendEmailChangeOtp:verify]', verifyError);
      return { ok: false, error: 'Senha atual incorreta.' };
    }
  }

  if (isSupabaseEnabled()) {
    const admin = createServiceClient();
    // Remove pending anterior se houver
    await admin.from('pending_email_changes').delete().eq('user_id', user.id);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: insertError } = await admin.from('pending_email_changes').insert({
      user_id: user.id,
      new_email: email,
      expires_at: expiresAt,
    });
    if (insertError) {
      console.error('[sendEmailChangeOtp:insert]', insertError);
      return { ok: false, error: 'Erro interno. Tente novamente.' };
    }

    // Envia OTP via Supabase Auth usando o template de email customizado
    const { error: otpError } = await createAnonClient().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (otpError) {
      console.error('[sendEmailChangeOtp:otp]', otpError);
      return { ok: false, error: 'Não foi possível enviar o código. Verifique o email e tente novamente.' };
    }

    return { ok: true, message: `Enviamos um código de 6 dígitos para ${email}.` };
  }

  // Fallback sem Supabase: simula sucesso para desenvolvimento
  return { ok: true, message: `Modo dev: código 123456 enviado para ${email}.` };
}

export async function confirmEmailChangeOtp(formData: FormData): Promise<ActionResult> {
  const rawEmail = formData.get('email');
  const rawOtp = formData.get('otp');
  const newEmail = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  const otp = typeof rawOtp === 'string' ? rawOtp.trim() : '';

  if (!newEmail || !otp) {
    return { ok: false, error: 'Informe o código recebido por email.' };
  }

  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sessão expirada. Entre novamente.' };

  if (!isSupabaseEnabled()) {
    // Fallback dev: aceita 123456
    if (otp !== '123456') {
      return { ok: false, error: 'Código inválido.' };
    }
    return { ok: true, message: 'Email alterado com sucesso (modo dev).' };
  }

  const admin = createServiceClient();

  // Verifica pending
  const { data: pending, error: pendingError } = await admin
    .from('pending_email_changes')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (pendingError || !pending) {
    console.error('[confirmEmailChangeOtp:pending]', pendingError);
    return { ok: false, error: 'Nenhuma solicitação de troca encontrada. Solicite um novo código.' };
  }
  if (pending.new_email !== newEmail) {
    return { ok: false, error: 'Email não corresponde à solicitação. Solicite um novo código.' };
  }
  if (new Date(pending.expires_at) < new Date()) {
    await admin.from('pending_email_changes').delete().eq('user_id', user.id);
    return { ok: false, error: 'Código expirado. Solicite um novo.' };
  }

  if (pending.attempts >= 5) {
    await admin.from('pending_email_changes').delete().eq('user_id', user.id);
    return { ok: false, error: 'Muitas tentativas inválidas. Solicite um novo código.' };
  }

  // Verifica OTP com Supabase
  const { error: verifyError } = await createAnonClient().auth.verifyOtp({
    email: newEmail,
    token: otp,
    type: 'email',
  });
  if (verifyError) {
    console.error('[confirmEmailChangeOtp:verify]', verifyError);
    await admin.from('pending_email_changes').update({ attempts: pending.attempts + 1 }).eq('user_id', user.id);
    if (verifyError.message?.includes('expired')) {
      return { ok: false, error: 'Código expirado. Solicite um novo.' };
    }
    return { ok: false, error: 'Código inválido. Verifique e tente novamente.' };
  }

  // Remove temp user criado pelo signInWithOtp (se existir)
  try {
    const { data: { users } } = await admin.auth.admin.listUsers();
    const tempUser = users.find((u) => u.email === newEmail && u.id !== user.id);
    if (tempUser) {
      await admin.auth.admin.deleteUser(tempUser.id);
    }
  } catch (e) {
    console.error('[confirmEmailChangeOtp:cleanup]', e);
  }

  // Atualiza email do usuário via Admin API
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    email: newEmail,
  });
  if (updateError) {
    console.error('[confirmEmailChangeOtp:update]', updateError);
    return { ok: false, error: 'Não foi possível alterar o email. Tente novamente.' };
  }

  // Sincroniza PII na tabela profiles
  try {
    const name = user.user_metadata?.name as string | undefined;
    const profileUpdate = buildProfileIdentityPiiUpdate({
      name: name ?? '',
      email: newEmail,
    });
    const { error: profileError } = await admin
      .from('profiles')
      .update(profileUpdate)
      .eq('id', user.id);
    if (profileError) {
      console.error('[confirmEmailChangeOtp:pii]', profileError);
    }
  } catch (e) {
    console.error('[confirmEmailChangeOtp:pii]', e);
  }

  // Limpa pending
  await admin.from('pending_email_changes').delete().eq('user_id', user.id);

  revalidatePath('/perfil');
  revalidateTag(cacheTags.profile(user.id), { expire: 0 });

  return { ok: true, message: 'Email alterado com sucesso.' };
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
  revalidateTag(cacheTags.profile(user.id), { expire: 0 });
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
