import { z } from 'zod';

export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório.').max(80),
  monthlyBudgetCents: z
    .number({ invalid_type_error: 'Orçamento precisa ser número.' })
    .int()
    .nonnegative()
    .lte(1_000_000_000, 'Orçamento muito alto.'),
  monthlyIncomeCents: z
    .number()
    .int()
    .nonnegative()
    .lte(1_000_000_000)
    .nullable()
    .optional(),
  billingClosingDay: z
    .number()
    .int()
    .min(1)
    .max(31)
    .nullable()
    .optional(),
  salaryDay: z
    .number()
    .int()
    .min(1)
    .max(31)
    .nullable()
    .optional(),
  currency: z.string().length(3).default('BRL'),
  hasPet: z.boolean().optional(),
  timezone: z.string().min(1).default('America/Sao_Paulo'),
  termsAcceptedAt: z.string().datetime({ offset: true }).optional(),
  termsVersion: z.string().min(1).optional(),
});

export type ProfileSchema = z.infer<typeof profileSchema>;

export default profileSchema;
