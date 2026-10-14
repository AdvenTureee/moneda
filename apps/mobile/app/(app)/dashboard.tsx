import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HelloMo } from '../../components/HelloMo';
import { useSession } from '../../lib/session-provider';
import { theme } from '../../lib/theme';

/**
 * Dashboard — placeholder do PR-A.
 *
 * Mostra que o login deu certo (email do user) e uma saudação.
 * Conteúdo real (orçamento, top categorias, gráficos) entra no PR-B.2.
 */
export default function DashboardRoute() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <View style={styles.hero}>
        <HelloMo />
      </View>

      <Text style={styles.greeting}>
        Olá, {session?.user?.email?.split('@')[0] ?? 'Mo'}!
      </Text>
      <Text style={styles.subtitle}>Login OK — você está no Moneda mobile.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>PR-A — Hello World</Text>
        <Text style={styles.cardBody}>
          Este é o esqueleto do app mobile. As telas reais (Dashboard, Feed,
          Adicionar gasto, Insights da Mo, Perfil) chegam no PR-B.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20 },
  hero: { alignItems: 'center', marginBottom: 24 },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 24,
  },
  card: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 16,
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});
