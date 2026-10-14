import { Text, type TextProps, type TextStyle } from 'react-native';

import { formatBRL } from '@moneda/shared';

interface MoneyProps extends Omit<TextProps, 'children'> {
  /** Valor em centavos. */
  cents: number;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const SIZE_STYLE: Record<NonNullable<MoneyProps['size']>, TextStyle> = {
  sm: { fontSize: 14 },
  md: { fontSize: 16 },
  lg: { fontSize: 20 },
  xl: { fontSize: 24 },
  '2xl': { fontSize: 30 },
};

/**
 * <Money cents={3500} /> → "R$ 35,00"
 * Formato pt-BR vindo de @moneda/shared (mesma formatação do web).
 */
export function Money({ cents, size = 'md', style, ...rest }: MoneyProps) {
  return (
    <Text {...rest} style={[SIZE_STYLE[size], style]}>
      {formatBRL(cents)}
    </Text>
  );
}
