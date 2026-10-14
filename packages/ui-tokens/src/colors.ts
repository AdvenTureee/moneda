/**
 * Tokens de cor do Moneda.
 *
 * A fonte da verdade visual é src/app/globals.css do web (Tailwind v4 com
 * CSS variables e `@theme inline`). Este arquivo espelha os mesmos valores
 * para que o mobile (NativeWind) consuma via `colors` no tailwind.config.
 *
 * Se alterar uma cor aqui, altere também em globals.css — e vice-versa.
 */

export const colors = {
  // Brand
  brandBlue: '#A8C5E0',
  brandBlueDark: '#7AAECF',
  brandGreen: '#5BBF8E',
  brandGreenDark: '#3FA876',

  // Backgrounds / Surfaces (light)
  bgLight: '#F8F9FB',
  surfaceLight: '#FFFFFF',
  surfaceAltLight: '#F1F3F7',

  // Backgrounds / Surfaces (dark)
  bgDark: '#10151C',
  surfaceDark: '#171E27',
  surfaceAltDark: '#202A35',

  // Text
  textPrimaryLight: '#1A1D23',
  textSecondaryLight: '#6B7280',
  textTertiaryLight: '#9CA3AF',

  textPrimaryDark: '#F5F7FA',
  textSecondaryDark: '#C4CCD6',
  textTertiaryDark: '#8D99A7',

  // Semantic
  error: '#E07070',
  errorBg: '#FDF0F0',
  success: '#5BBF8E',
  successBg: '#EEF9F4',
  warning: '#F0A855',
  warningBg: '#FEF6EB',

  // Borders
  borderLight: '#E5E7EB',
  borderDark: '#303B49',
  borderFocus: '#A8C5E0',
} as const;

export type ColorToken = keyof typeof colors;
