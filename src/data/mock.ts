import type { User, Category, Expense } from '@/types';

export const MOCK_USER: User = {
  id: 'user-001',
  name: 'Gabriel Mauro',
  email: 'gabriel@fieldcorp.com.br',
  phone: '+5511999999999',
  createdAt: new Date('2026-01-01'),
};

export const CATEGORIES: Category[] = [
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
    id: 'outros',
    name: 'Outros',
    icon: 'Package',
    color: '#6B7280',
    keywords: [],
  },
];

function daysAgo(n: number, hour = 12, minute = 0): Date {
  const d = new Date(2026, 4, 8, hour, minute, 0); // 2026-05-08 as base
  d.setDate(d.getDate() - n);
  return d;
}

let expenseIdCounter = 1;
function mkId() {
  return `exp-${String(expenseIdCounter++).padStart(3, '0')}`;
}

export const MOCK_EXPENSES: Expense[] = [
  {
    id: mkId(), userId: 'user-001', amount: 4500, category: 'alimentacao',
    description: 'Almoço iFood', source: 'whatsapp', tags: ['delivery'],
    createdAt: daysAgo(0, 12, 32),
  },
  {
    id: mkId(), userId: 'user-001', amount: 2350, category: 'transporte',
    description: 'Uber para reunião', source: 'whatsapp', tags: [],
    createdAt: daysAgo(1, 9, 15),
  },
  {
    id: mkId(), userId: 'user-001', amount: 1800, category: 'alimentacao',
    description: 'Starbucks', source: 'manual', tags: ['café'],
    createdAt: daysAgo(1, 8, 20),
  },
  {
    id: mkId(), userId: 'user-001', amount: 18740, category: 'alimentacao',
    description: 'Mercado Extra', source: 'manual', tags: ['mercado'],
    createdAt: daysAgo(3, 11, 0),
  },
  {
    id: mkId(), userId: 'user-001', amount: 4990, category: 'lazer',
    description: 'Netflix mensal', source: 'manual', tags: ['assinatura'],
    createdAt: daysAgo(4, 10, 0),
  },
  {
    id: mkId(), userId: 'user-001', amount: 2890, category: 'transporte',
    description: 'Gasolina', source: 'manual', tags: [],
    createdAt: daysAgo(5, 17, 45),
  },
  {
    id: mkId(), userId: 'user-001', amount: 12000, category: 'casa',
    description: 'Conta de luz', source: 'manual', tags: [],
    createdAt: daysAgo(6, 9, 0),
  },
  {
    id: mkId(), userId: 'user-001', amount: 6200, category: 'alimentacao',
    description: 'Jantar restaurante', source: 'whatsapp', tags: ['saída'],
    createdAt: daysAgo(7, 20, 10),
  },
  {
    id: mkId(), userId: 'user-001', amount: 4500, category: 'saude',
    description: 'Farmácia', source: 'whatsapp', tags: [],
    createdAt: daysAgo(8, 14, 30),
  },
  {
    id: mkId(), userId: 'user-001', amount: 3200, category: 'transporte',
    description: 'Uber Eats', source: 'whatsapp', tags: ['delivery'],
    createdAt: daysAgo(9, 19, 55),
  },
  {
    id: mkId(), userId: 'user-001', amount: 15000, category: 'educacao',
    description: 'Curso TypeScript Alura', source: 'manual', tags: ['tech'],
    createdAt: daysAgo(10, 10, 0),
  },
  {
    id: mkId(), userId: 'user-001', amount: 5500, category: 'lazer',
    description: 'Cinema — top gun', source: 'manual', tags: ['cinema'],
    createdAt: daysAgo(11, 19, 30),
  },
  {
    id: mkId(), userId: 'user-001', amount: 9800, category: 'casa',
    description: 'Conta de internet', source: 'manual', tags: [],
    createdAt: daysAgo(12, 9, 0),
  },
  {
    id: mkId(), userId: 'user-001', amount: 7500, category: 'alimentacao',
    description: 'Supermercado Pão de Açúcar', source: 'manual', tags: ['mercado'],
    createdAt: daysAgo(14, 10, 30),
  },
  {
    id: mkId(), userId: 'user-001', amount: 1990, category: 'lazer',
    description: 'Spotify premium', source: 'manual', tags: ['assinatura'],
    createdAt: daysAgo(15, 10, 0),
  },
  {
    id: mkId(), userId: 'user-001', amount: 8900, category: 'saude',
    description: 'Consulta médica', source: 'manual', tags: [],
    createdAt: daysAgo(16, 15, 0),
  },
  {
    id: mkId(), userId: 'user-001', amount: 3600, category: 'alimentacao',
    description: 'Pizza Hut delivery', source: 'whatsapp', tags: ['delivery'],
    createdAt: daysAgo(18, 20, 0),
  },
  {
    id: mkId(), userId: 'user-001', amount: 4200, category: 'transporte',
    description: '99 para o aeroporto', source: 'whatsapp', tags: [],
    createdAt: daysAgo(20, 7, 30),
  },
  {
    id: mkId(), userId: 'user-001', amount: 11500, category: 'casa',
    description: 'Condomínio', source: 'manual', tags: [],
    createdAt: daysAgo(22, 9, 0),
  },
  {
    id: mkId(), userId: 'user-001', amount: 6800, category: 'lazer',
    description: 'Barzinho sexta', source: 'manual', tags: ['bar'],
    createdAt: daysAgo(24, 21, 0),
  },
  {
    id: mkId(), userId: 'user-001', amount: 2100, category: 'alimentacao',
    description: 'Padaria café da manhã', source: 'whatsapp', tags: ['café'],
    createdAt: daysAgo(25, 8, 0),
  },
  {
    id: mkId(), userId: 'user-001', amount: 3900, category: 'saude',
    description: 'Academia Smart Fit', source: 'manual', tags: [],
    createdAt: daysAgo(27, 10, 0),
  },
  {
    id: mkId(), userId: 'user-001', amount: 4800, category: 'educacao',
    description: 'Livros técnicos Amazon', source: 'manual', tags: ['livros'],
    createdAt: daysAgo(28, 14, 0),
  },
  {
    id: mkId(), userId: 'user-001', amount: 9500, category: 'alimentacao',
    description: 'Churrasco com amigos', source: 'manual', tags: ['social'],
    createdAt: daysAgo(29, 12, 0),
  },
];

// ---- helpers ----

export function getExpensesByUser(userId: string): Expense[] {
  return MOCK_EXPENSES.filter((e) => e.userId === userId);
}

export function getExpensesByPeriod(userId: string, period: string): Expense[] {
  const [year, month] = period.split('-').map(Number);
  return MOCK_EXPENSES.filter((e) => {
    const d = new Date(e.createdAt);
    return e.userId === userId && d.getFullYear() === year && d.getMonth() + 1 === month;
  });
}

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id) ?? getUserCategories().find((c) => c.id === id);
}

export function getCombinedCategories(): Category[] {
  return [...CATEGORIES, ...getUserCategories()];
}

/** In-memory store for expenses added during the session */
let sessionExpenses: Expense[] = [];

export function getSessionExpenses(): Expense[] {
  return sessionExpenses;
}

export function addSessionExpense(expense: Expense): void {
  sessionExpenses = [expense, ...sessionExpenses];
}

export function getAllExpenses(userId: string): Expense[] {
  return [...sessionExpenses, ...MOCK_EXPENSES].filter((e) => e.userId === userId);
}

// ---------------------------------------------------------------------------
// Session-level user categories (for mock mode)
// ---------------------------------------------------------------------------
let userCategories: Category[] = [];

export function addUserCategory(cat: Category): void {
  userCategories = [...userCategories, cat];
}

export function updateUserCategory(cat: Category): void {
  userCategories = userCategories.map((c) => (c.id === cat.id ? { ...c, ...cat } : c));
}

export function deleteUserCategory(id: string): void {
  userCategories = userCategories.filter((c) => c.id !== id);
}

export function getUserCategories(): Category[] {
  return userCategories;
}
