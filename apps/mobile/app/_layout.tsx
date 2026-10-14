import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '../lib/query-client';
import { SessionProvider } from '../lib/session-provider';

/**
 * Layout raiz do Moneda mobile.
 *
 * Providers, em ordem (do mais externo ao mais interno):
 * 1. GestureHandlerRootView — habilita gestos em todo o app
 * 2. SafeAreaProvider — áreas seguras para notch/home indicator
 * 3. QueryClientProvider — TanStack Query com defaults em lib/query-client
 * 4. SessionProvider — escuta onAuthStateChange do Supabase e expõe via contexto
 * 5. Stack do Expo Router — navegação file-based
 *
 * Tema escuro/claro segue o sistema. Forçaremos override quando o usuário
 * escolher manualmente (futuro PR-F).
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const isDark = colorScheme === 'dark';
  const bg = isDark ? '#10151C' : '#F8F9FB';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            {hasMounted ? (
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: bg },
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(app)" />
              </Stack>
            ) : null}
          </SessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
