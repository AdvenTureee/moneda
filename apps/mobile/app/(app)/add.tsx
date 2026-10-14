import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../../lib/theme';

export default function AddRoute() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.title}>Adicionar gasto</Text>
      <Text style={styles.subtitle}>
        Chega no PR-B.4 (formulário) e PR-C (voz com Groq Whisper).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.textPrimary },
  subtitle: { fontSize: 14, marginTop: 4, color: theme.colors.textSecondary },
});
