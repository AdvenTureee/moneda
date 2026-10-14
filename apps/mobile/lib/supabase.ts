import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@moneda/shared';

/**
 * Adaptador de storage para o cliente Supabase no mobile.
 *
 * Persistimos tokens em expo-secure-store (Keychain no iOS, Keystore no
 * Android). Strings são gravadas como UTF-8 — o SecureStore não tem
 * constraint de tamanho prático para tokens JWT (< 4 KB).
 */
const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      /* ignore — storage cheio ou indisponível */
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* ignore */
    }
  },
};

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  // Não joga em runtime — falha visível só na primeira chamada.
  // eslint-disable-next-line no-console
  console.warn(
    '[moneda/mobile] EXPO_PUBLIC_SUPABASE_URL ou EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ausentes. ' +
      'Copie apps/mobile/.env.example para .env e preencha as variáveis.',
  );
}

/**
 * Cliente Supabase único do app.
 *
 * Usa o tipo Database gerado pelo Supabase CLI e re-exportado em
 * @moneda/shared. Isso garante que as queries conhecem as tabelas reais.
 */
export const supabase = createClient<Database>(url ?? '', publishableKey ?? '', {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

/** Helper: retorna a sessão atual (ou null). Não renova — só lê. */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
}

/** Helper: usuário atual ou null. */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}
