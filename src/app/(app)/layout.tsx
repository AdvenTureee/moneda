import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { TERMS_VERSION } from '@/lib/legal';
import { getProfileGateStatus } from '@/lib/profiles';
import { createSessionClient, isSupabaseEnabled } from '@/lib/supabase/server';

/**
 * Layout do "shell autenticado". Envolve as 9 rotas com `<AppShell>` (que
 * inclui o BottomNav e o modal global "Adicionar Gasto"). Como o layout
 * não re-monta entre navegações dentro do grupo, o nav fica persistente
 * — sem flicker ao trocar de rota.
 *
 * Login (`(auth)/`) e onboarding (`/onboarding/`) ficam de fora.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let requiresTermsAcceptance = false;
  let requiresWhatsappPhone = false;

  if (isSupabaseEnabled()) {
    const supabase = await createSessionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const profile = await getProfileGateStatus(user.id);
    requiresTermsAcceptance =
      !profile.termsAcceptedAt ||
      profile.termsVersion !== TERMS_VERSION;
    requiresWhatsappPhone = !profile.hasWhatsappPhone;
  }

  return (
    <AppShell
      requiresTermsAcceptance={requiresTermsAcceptance}
      requiresWhatsappPhone={requiresWhatsappPhone}
    >
      {children}
    </AppShell>
  );
}
