import { z } from 'zod';

const cents = z
  .number({ invalid_type_error: 'Valor precisa ser número.' })
  .int('Valor precisa ser inteiro (em centavos).')
  .nonnegative('Valor não pode ser negativo.')
  .lte(100_000_000, 'Valor máximo de R$ 1.000.000,00 por gasto.');

const paymentMethod = z.enum(
  ['pix', 'debit', 'credit', 'cash', 'boleto', 'transfer', 'other'],
  { errorMap: () => ({ message: 'Método de pagamento inválido.' }) },
);

const source = z.enum(['manual', 'whatsapp', 'import'], {
  errorMap: () => ({ message: 'Origem inválida.' }),
});

export const expenseInputSchema = z.object({
  amount: cents,
  category: z
    .string({ required_error: 'Categoria é obrigatória.' })
    .min(1)
    .max(64),
  description: z
    .string({ required_error: 'Descrição é obrigatória.' })
    .min(1, 'Diz rapidinho no que foi.')
    .max(140),
  paymentMethod: paymentMethod.optional(),
  creditDetails: z
    .object({
      purchaseType: z.enum(['single', 'installment']),
      installmentCurrent: z.number().int().min(1).max(360).optional(),
      installmentTotal: z.number().int().min(1).max(360).optional(),
    })
    .optional(),
  source: source.default('manual'),
  tags: z.array(z.string().min(1).max(40)).max(10).default([]),
  occurredAt: z.string().datetime({ offset: true }).optional(),
  isRecurring: z.boolean().optional(),
});

export type ExpenseInputSchema = z.infer<typeof expenseInputSchema>;

export default expenseInputSchema;
