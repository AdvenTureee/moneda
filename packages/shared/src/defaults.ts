import type { Category } from './types';

/**
 * Categorias default do Moneda (seed inicial na criação do usuário).
 *
 * Espelha `CATEGORIES` em src/data/mock.ts do web. Atualize os dois lados
 * caso mude a lista — ou extraia para esta package e faça o web re-importar.
 */
export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'alimentacao',
    name: 'Alimentação',
    icon: 'Hamburger',
    color: '#F59E0B',
    keywords: [
      'almoço', 'almoco', 'jantar', 'lanche', 'café', 'cafe', 'ifood', 'rappi',
      'uber eats', 'mcdonalds', 'restaurante', 'padaria', 'mercado', 'supermercado',
      'starbucks', 'pizza', 'hamburguer', 'sushi',
    ],
  },
  {
    id: 'transporte',
    name: 'Transporte',
    icon: 'Car',
    color: '#3B82F6',
    keywords: [
      'uber', '99', 'taxi', 'táxi', 'gasolina', 'combustivel', 'metro', 'metrô',
      'onibus', 'ônibus', 'estacionamento', 'pedagio', 'pedágio', 'passagem',
    ],
  },
  {
    id: 'lazer',
    name: 'Lazer',
    icon: 'GameController',
    color: '#8B5CF6',
    keywords: [
      'cinema', 'netflix', 'spotify', 'steam', 'jogo', 'show', 'teatro', 'bar',
      'balada', 'viagem', 'hotel', 'ingresso', 'disney', 'prime', 'hbo',
    ],
  },
  {
    id: 'saude',
    name: 'Saúde',
    icon: 'Pill',
    color: '#EF4444',
    keywords: [
      'farmácia', 'farmacia', 'médico', 'medico', 'dentista', 'exame',
      'hospital', 'remédio', 'remedio', 'plano de saúde', 'academia', 'gym',
    ],
  },
  {
    id: 'casa',
    name: 'Casa',
    icon: 'House',
    color: '#10B981',
    keywords: [
      'aluguel', 'condomínio', 'condominio', 'luz', 'água', 'agua', 'internet',
      'telefone', 'gás', 'gas', 'faxina', 'reforma', 'móvel', 'movel',
    ],
  },
  {
    id: 'educacao',
    name: 'Educação',
    icon: 'Books',
    color: '#06B6D4',
    keywords: [
      'curso', 'faculdade', 'escola', 'livro', 'udemy', 'alura', 'mensalidade',
      'material escolar', 'treinamento', 'inglês', 'ingles',
    ],
  },
  {
    id: 'pet',
    name: 'Pet',
    icon: 'PawPrint',
    color: '#EC4899',
    keywords: [
      'pet', 'cachorro', 'gato', 'ração', 'racao', 'veterinário', 'veterinario',
      'banho e tosa', 'petshop',
    ],
  },
  {
    id: 'outros',
    name: 'Outros',
    icon: 'Package',
    color: '#6B7280',
    keywords: [],
  },
];

/** Lista reduzida de IDs — útil para testes e UI. */
export const DEFAULT_CATEGORY_IDS: readonly string[] =
  DEFAULT_CATEGORIES.map((c) => c.id);
