/**
 * @moneda/shared
 *
 * Tipos, schemas e utilitários compartilhados entre o Moneda web (Next.js)
 * e o Moneda mobile (Expo / React Native).
 *
 * Esta package não tem dependência de Next.js — pode ser importada de qualquer
 * contexto. O tipo `Database` (gerado para o Supabase) é re-exportado a partir
 * do web para evitar drift entre as duas pontas.
 */

export * from './types';
export * from './money';
export * from './defaults';

export { default as expenseSchema } from './schemas/expense';
export { default as profileSchema } from './schemas/profile';
export { Database } from './supabase';
