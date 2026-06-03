import { Bank, Barcode, CreditCard, CurrencyDollar, Money, type IconProps } from '@phosphor-icons/react';
import type { ComponentType } from 'react';
import type { ExpensePaymentMethod } from '@/types';

export type PaymentMethodBadge = {
  label: string;
  shortLabel: string;
  iconName: string;
  Icon: ComponentType<IconProps>;
  color: string;
  bg: string;
  bgDark?: string;
};

export const PAYMENT_METHOD_BADGES: Partial<Record<ExpensePaymentMethod, PaymentMethodBadge>> = {
  pix: {
    label: 'PIX',
    shortLabel: 'PIX',
    iconName: 'CurrencyDollar',
    Icon: CurrencyDollar,
    color: '#4DB6AC',
    bg: '#E0F4F2',
    bgDark: 'rgba(77, 182, 172, 0.18)',
  },
  debit: {
    label: 'Débito',
    shortLabel: 'Débito',
    iconName: 'Bank',
    Icon: Bank,
    color: '#477FA8',
    bg: '#E3F0FA',
    bgDark: 'rgba(71, 127, 168, 0.18)',
  },
  credit: {
    label: 'Crédito',
    shortLabel: 'Crédito',
    iconName: 'CreditCard',
    Icon: CreditCard,
    color: '#B57922',
    bg: '#FEF1D6',
    bgDark: 'rgba(181, 121, 34, 0.18)',
  },
  boleto: {
    label: 'Boleto',
    shortLabel: 'Boleto',
    iconName: 'Barcode',
    Icon: Barcode,
    color: '#6B4FA3',
    bg: '#EFE8FF',
    bgDark: 'rgba(107, 79, 163, 0.18)',
  },
  cash: {
    label: 'Dinheiro',
    shortLabel: 'Dinheiro',
    iconName: 'Money',
    Icon: Money,
    color: '#2E8F67',
    bg: '#DDF7EA',
    bgDark: 'rgba(46, 143, 103, 0.18)',
  },
};

export const LEGEND_PAYMENT_METHODS: ExpensePaymentMethod[] = ['pix', 'debit', 'credit', 'boleto', 'cash'];
