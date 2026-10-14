import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from './supabase';

interface SessionContextValue {
  session: Session | null;
  isLoading: boolean;
  /** Conveniência: força refetch da sessão. */
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  isLoading: true,
  refresh: async () => {},
});

/**
 * Provider que mantém a sessão do Supabase em estado React.
 *
 * - Inicializa com `getSession()` (lê do SecureStore via `persistSession`).
 * - Inscreve em `onAuthStateChange` para reagir a login/logout/refresh.
 * - Expõe `session`, `isLoading` e `refresh` para o app.
 *
 * No web o equivalente vem de `@supabase/ssr` em cookies HttpOnly — no
 * mobile, mantemos a sessão no Keychain/Keystore via SecureStore.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session ?? null);
      setIsLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      // Quando o evento for INITIAL_SESSION, mantemos loading; depois, idle.
      if (_event !== 'INITIAL_SESSION') setIsLoading(false);
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      isLoading,
      refresh: async () => {
        const { data } = await supabase.auth.getSession();
        setSession(data.session ?? null);
      },
    }),
    [session, isLoading],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
