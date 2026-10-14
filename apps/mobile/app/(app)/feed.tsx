import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../../lib/theme';

export default function FeedRoute() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.title}>Feed</Text>
      <Text style={styles.subtitle}>
        Chega no PR-B.3 — lista paginada, filtros e edição.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.textPrimary },
  subtitle: { fontSize: 14, marginTop: 4, color: theme.colors.textSecondary },
});
