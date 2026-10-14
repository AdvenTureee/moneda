import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router, Redirect } from 'expo-router';

import { useSession } from '../lib/session-provider';
import { theme } from '../lib/theme';

/**
 * Tela inicial — decidia para onde levar baseado na sessão.
 *
 * - Sem sessão → /(auth)/login
 * - Com sessão e onboarded → /(app)/dashboard
 *
 * Por enquanto, "onboarded" não está implementado — qualquer sessão
 * vai para o dashboard. PR-B trata o wizard de onboarding.
 */
export default function IndexRoute() {
  const { session, isLoading } = useSession();

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      router.replace('/(auth)/login');
      return;
    }
    router.replace('/(app)/dashboard');
  }, [session, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brandGreen,
  },
});
