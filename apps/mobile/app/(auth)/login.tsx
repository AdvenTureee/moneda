import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { HelloMo } from '../../components/HelloMo';
import { theme } from '../../lib/theme';

/**
 * Tela de login — email/senha como MVP.
 *
 * Google sign-in real (com expo-auth-session + PKCE + scheme "moneda://...")
 * fica para o PR-B.1. Aqui deixamos o botão como placeholder visível para
 * sabermos visualmente que existe.
 */
export default function LoginRoute() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSignIn() {
    if (!email.trim() || !password) {
      Alert.alert('Faltou algo', 'Preencha e-mail e senha.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      Alert.alert('Não deu certo', error.message);
      return;
    }
    router.replace('/(app)/dashboard');
  }

  function handleGooglePlaceholder() {
    setGoogleLoading(true);
    setTimeout(() => {
      setGoogleLoading(false);
      Alert.alert(
        'Em construção',
        'Login com Google chega no PR-B.1 (Expo Auth Session + PKCE).',
      );
    }, 300);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroBlock}>
          <HelloMo />
          <Text style={styles.brand}>Moneda</Text>
          <Text style={styles.tagline}>Seu dinheiro, finalmente claro.</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            accessibilityLabel="E-mail"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="seu@email.com"
            placeholderTextColor={theme.colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
          <TextInput
            accessibilityLabel="Senha"
            secureTextEntry
            placeholder="Senha"
            placeholderTextColor={theme.colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />

          <Button
            onPress={handleSignIn}
            loading={loading}
            style={{ marginTop: 8 }}
            accessibilityLabel="Entrar com e-mail e senha"
          >
            Entrar
          </Button>

          <Button
            variant="secondary"
            onPress={handleGooglePlaceholder}
            loading={googleLoading}
            accessibilityLabel="Entrar com Google"
          >
            Continuar com Google
          </Button>
        </View>

        <Text style={styles.legal}>
          Ao continuar você concorda com nossos termos e LGPD.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  heroBlock: { alignItems: 'center', marginBottom: 40 },
  brand: {
    marginTop: 24,
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  tagline: {
    marginTop: 4,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  form: { width: '100%', gap: 12 },
  input: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  legal: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: 24,
  },
});
