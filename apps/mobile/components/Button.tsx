import { Pressable, Text, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';

import { theme } from '../lib/theme';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  children: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const COLORS: Record<Variant, { bg: string; fg: string }> = {
  primary: { bg: theme.colors.brandGreen, fg: '#FFFFFF' },
  secondary: { bg: theme.colors.surfaceAlt, fg: theme.colors.textPrimary },
  ghost: { bg: 'transparent', fg: theme.colors.brandGreenDark },
};

export function Button({
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  children,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const isInactive = disabled || loading;
  const c = COLORS[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? children}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      disabled={isInactive}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 44,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
          backgroundColor: c.bg,
          opacity: isInactive ? 0.6 : pressed ? 0.92 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.fg} />
      ) : (
        <Text
          style={{
            color: c.fg,
            fontSize: 16,
            fontWeight: '700',
          }}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}
