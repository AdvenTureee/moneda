import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session-provider';
import { theme } from '../../lib/theme';

export default function ProfileRoute() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.title}>Perfil</Text>
      <Text style={styles.email}>{session?.user?.email}</Text>

      <Pressable
        onPress={() => Alert.alert('Em construção', 'Preferências no PR-F.')}
        style={({ pressed }) => [
          styles.menuItem,
          { backgroundColor: theme.colors.surfaceAlt, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={styles.menuTitle}>Preferências</Text>
        <Text style={styles.menuBody}>Tema, notificações, conexões.</Text>
      </Pressable>

      <Pressable
        onPress={handleSignOut}
        style={({ pressed }) => [
          styles.signOut,
          { opacity: pressed ? 0.7 : 0.92 },
        ]}
      >
        <Text style={styles.signOutText}>Sair da conta</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.textPrimary },
  email: { fontSize: 14, color: theme.colors.textSecondary, marginVertical: 16 },
  menuItem: { borderRadius: 16, padding: 16, marginBottom: 12 },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  menuBody: { fontSize: 14, color: theme.colors.textSecondary },
  signOut: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: theme.colors.error,
  },
  signOutText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
