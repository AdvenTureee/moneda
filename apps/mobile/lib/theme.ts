import { colors } from '@moneda/ui-tokens';

/**
 * Tema nativo para StyleSheet e libs que pedem cores literais.
 *
 * NativeWind já consome cores via classes (`bg-brand-green`), mas há
 * cenários em que precisamos de `tintColor`, `backgroundColor` etc.
 * diretamente em `style={{}}` ou em componentes que não aceitam className.
 */
export const theme = {
  colors: {
    brandGreen: colors.brandGreen,
    brandGreenDark: colors.brandGreenDark,
    brandBlue: colors.brandBlue,
    brandBlueDark: colors.brandBlueDark,
    surface: colors.surfaceLight,
    surfaceAlt: colors.surfaceAltLight,
    surfaceDark: colors.surfaceDark,
    surfaceAltDark: colors.surfaceAltDark,
    textPrimary: colors.textPrimaryLight,
    textSecondary: colors.textSecondaryLight,
    textTertiary: colors.textTertiaryLight,
    textPrimaryDark: colors.textPrimaryDark,
    textSecondaryDark: colors.textSecondaryDark,
    textTertiaryDark: colors.textTertiaryDark,
    border: colors.borderLight,
    borderDark: colors.borderDark,
    error: colors.error,
    success: colors.success,
    warning: colors.warning,
  },
  radii: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    full: 9999,
  },
  spacing: (n: number) => n * 4,
} as const;

export type Theme = typeof theme;
