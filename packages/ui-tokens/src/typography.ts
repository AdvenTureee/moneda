/**
 * Tipografia do Moneda.
 *
 * O web usa Inter via `next/font`. No mobile, carregue Inter via expo-font
 * (loadAsync) ou use um fallback system-ui até baixar.
 */

export const typography = {
  fontFamily: {
    body: 'Inter',
    heading: 'Inter',
    mono: 'ui-monospace',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  lineHeight: {
    tight: 1.25,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.65,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
} as const;

export type FontSizeToken = keyof typeof typography.fontSize;
