// Transactions are stored in localStorage since optimai_transactions table doesn't exist
// This module provides a server-side fallback

export interface Transaction {
  id: string;
  user_id?: string;
  amount: number;
  currency: string;
  type: 'income' | 'expense' | 'transfer';
  description?: string;
  category_id?: string;
  date: string;
  created_at?: string;
  updated_at?: string;
}

export interface TransactionInsert {
  user_id?: string;
  amount: number;
  currency?: string;
  type: 'income' | 'expense' | 'transfer';
  description?: string;
  category_id?: string;
  date: string;
}

export type TransactionUpdate = Partial<TransactionInsert>;

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface TransactionFilters {
  type?: TransactionType;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
}

// In-memory storage for server-side operations
const transactionsCache = new Map<string, Transaction>();

// Initialize with sample data
function initSampleData(): void {
  if (transactionsCache.size > 0) return;

  const samples: Transaction[] = [
    { id: 'tx-1', amount: 5000, currency: 'EUR', type: 'income', description: 'Booking Roger Sanchez - Ushuaia', category_id: 'cat-13', date: '2026-01-20' },
    { id: 'tx-2', amount: 1250.50, currency: 'EUR', type: 'expense', description: 'Publicidad Meta - PAIDDADS', category_id: 'cat-11', date: '2026-01-19' },
    { id: 'tx-3', amount: 2500, currency: 'EUR', type: 'income', description: 'Comisión Prophecy - Ultra', category_id: 'cat-13', date: '2026-01-18' },
    { id: 'tx-4', amount: 89.99, currency: 'EUR', type: 'expense', description: 'Suscripción OpenAI API', category_id: 'cat-10', date: '2026-01-17' },
    { id: 'tx-5', amount: 350, currency: 'EUR', type: 'expense', description: 'Vuelo Madrid-Ibiza', category_id: 'cat-12', date: '2026-01-16' },
    { id: 'tx-6', amount: 15000, currency: 'EUR', type: 'income', description: 'Pago mensual A2G FZCO', category_id: 'cat-1', date: '2026-01-01' },
    { id: 'tx-7', amount: 2500, currency: 'EUR', type: 'expense', description: 'Alquiler oficina Dubai', category_id: 'cat-6', date: '2026-01-05' },
  ];

  for (const tx of samples) {
    transactionsCache.set(tx.id, tx);
  }
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  initSampleData();
  return transactionsCache.get(id) || null;
}

export async function getTransactionsByUser(
  userId: string,
  filters?: TransactionFilters
): Promise<Transaction[]> {
  initSampleData();

  let transactions = Array.from(transactionsCache.values());

  if (filters?.type) {
    transactions = transactions.filter(t => t.type === filters.type);
  }

  if (filters?.categoryId) {
    transactions = transactions.filter(t => t.category_id === filters.categoryId);
  }

  if (filters?.startDate) {
    transactions = transactions.filter(t => t.date >= filters.startDate!);
  }

  if (filters?.endDate) {
    transactions = transactions.filter(t => t.date <= filters.endDate!);
  }

  if (filters?.minAmount !== undefined) {
    transactions = transactions.filter(t => t.amount >= filters.minAmount!);
  }

  if (filters?.maxAmount !== undefined) {
    transactions = transactions.filter(t => t.amount <= filters.maxAmount!);
  }

  // Sort by date descending
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (filters?.offset) {
    transactions = transactions.slice(filters.offset);
  }

  if (filters?.limit) {
    transactions = transactions.slice(0, filters.limit);
  }

  return transactions;
}

export async function createTransaction(
  transaction: TransactionInsert
): Promise<Transaction> {
  initSampleData();

  const newTx: Transaction = {
    id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: transaction.user_id,
    amount: transaction.amount,
    currency: transaction.currency || 'EUR',
    type: transaction.type,
    description: transaction.description,
    category_id: transaction.category_id,
    date: transaction.date,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  transactionsCache.set(newTx.id, newTx);
  return newTx;
}

export async function createTransactions(
  transactions: TransactionInsert[]
): Promise<Transaction[]> {
  const results: Transaction[] = [];
  for (const tx of transactions) {
    results.push(await createTransaction(tx));
  }
  return results;
}

export async function updateTransaction(
  id: string,
  updates: TransactionUpdate
): Promise<Transaction> {
  initSampleData();

  const existing = transactionsCache.get(id);
  if (!existing) {
    throw new Error('Transaction not found');
  }

  const updated: Transaction = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  transactionsCache.set(id, updated);
  return updated;
}

export async function deleteTransaction(id: string): Promise<void> {
  transactionsCache.delete(id);
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  net: number;
  transactionCount: number;
  byCategory: Record<string, { total: number; count: number }>;
}

export async function getFinancialSummary(
  userId: string,
  startDate: string,
  endDate: string
): Promise<FinancialSummary> {
  const transactions = await getTransactionsByUser(userId, {
    startDate,
    endDate,
  });

  const summary: FinancialSummary = {
    totalIncome: 0,
    totalExpenses: 0,
    net: 0,
    transactionCount: transactions.length,
    byCategory: {},
  };

  for (const t of transactions) {
    const amount = Math.abs(t.amount);

    if (t.type === 'income') {
      summary.totalIncome += amount;
    } else if (t.type === 'expense') {
      summary.totalExpenses += amount;
    }

    const categoryId = t.category_id || 'uncategorized';
    if (!summary.byCategory[categoryId]) {
      summary.byCategory[categoryId] = { total: 0, count: 0 };
    }
    summary.byCategory[categoryId].total += amount;
    summary.byCategory[categoryId].count += 1;
  }

  summary.net = summary.totalIncome - summary.totalExpenses;

  return summary;
}

export async function getRecentTransactions(
  userId: string,
  limit: number = 10
): Promise<Transaction[]> {
  return getTransactionsByUser(userId, { limit });
}

export async function getAllTransactions(limit = 50): Promise<Transaction[]> {
  initSampleData();
  const transactions = Array.from(transactionsCache.values());
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return transactions.slice(0, limit);
}

// Class-based repository for compatibility
export const TransactionsRepository = {
  findById: getTransactionById,
  findByUserId: getTransactionsByUser,
  create: createTransaction,
  createMany: createTransactions,
  update: updateTransaction,
  delete: deleteTransaction,
  getSummary: getFinancialSummary,
  getRecent: getRecentTransactions,
  getAll: getAllTransactions,
};
