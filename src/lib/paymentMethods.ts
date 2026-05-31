import { Bank, CreditCard, CurrencyDollar, type IconProps } from '@phosphor-icons/react';
import type { ComponentType } from 'react';
import type { ExpensePaymentMethod } from '@/types';

export type PaymentMethodBadge = {
  label: string;
  shortLabel: string;
  iconName: string;
  Icon: ComponentType<IconProps>;
  color: string;
  bg: string;
};

export const PAYMENT_METHOD_BADGES: Partial<Record<ExpensePaymentMethod, PaymentMethodBadge>> = {
  pix: {
    label: 'PIX',
    shortLabel: 'PIX',
    iconName: 'CurrencyDollar',
    Icon: CurrencyDollar,
    color: '#2E8F67',
    bg: '#DDF7EA',
  },
  debit: {
    label: 'Débito',
    shortLabel: 'Débito',
    iconName: 'Bank',
    Icon: Bank,
    color: '#477FA8',
    bg: '#E3F0FA',
  },
  credit: {
    label: 'Crédito',
    shortLabel: 'Crédito',
    iconName: 'CreditCard',
    Icon: CreditCard,
    color: '#B57922',
    bg: '#FEF1D6',
  },
};

export const LEGEND_PAYMENT_METHODS: ExpensePaymentMethod[] = ['pix', 'debit', 'credit'];
