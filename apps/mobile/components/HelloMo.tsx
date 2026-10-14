import { View, Text } from 'react-native';

import { theme } from '../lib/theme';

/**
 * Placeholder visual da Mo — só uma forma simples até termos o SVG/iOS asset
 * da mascote carregado via expo-asset. Não bloqueia o PR-A; substituímos no
 * PR-F (polimento).
 */
export function HelloMo({ label = 'Moneda' }: { label?: string }) {
  return (
    <View
      style={{
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: theme.colors.brandGreen,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: theme.colors.brandGreenDark,
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
        elevation: 6,
      }}
      accessibilityLabel="Mo, mascote do Moneda"
    >
      <Text style={{ color: '#fff', fontSize: 36, fontWeight: '800' }}>M</Text>
      <Text
        style={{
          color: '#fff',
          fontSize: 9,
          letterSpacing: 2,
          marginTop: 2,
          fontWeight: '700',
        }}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}
