import AppShell from '@/components/AppShell';

/**
 * Layout do "shell autenticado". Envolve as 9 rotas com `<AppShell>` (que
 * inclui o BottomNav e o modal global "Adicionar Gasto"). Como o layout
 * não re-monta entre navegações dentro do grupo, o nav fica persistente
 * — sem flicker ao trocar de rota.
 *
 * Login (`(auth)/`) e onboarding (`/onboarding/`) ficam de fora.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
