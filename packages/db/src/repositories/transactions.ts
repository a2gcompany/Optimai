import { getSupabaseClient } from '../client';
import type { Tables, InsertTables, UpdateTables, Json } from '../types';

export type Transaction = Tables<'transactions'>;
export type TransactionInsert = InsertTables<'transactions'>;
export type TransactionUpdate = UpdateTables<'transactions'>;

export type TransactionType = 'income' | 'expense';

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

export async function getTransactionById(id: string): Promise<Transaction | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function getTransactionsByUser(
  userId: string,
  filters?: TransactionFilters
): Promise<Transaction[]> {
  const supabase = getSupabaseClient();
  let query = supabase.from('transactions').select('*').eq('user_id', userId);

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  if (filters?.startDate) {
    query = query.gte('date', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('date', filters.endDate);
  }

  if (filters?.minAmount !== undefined) {
    query = query.gte('amount', filters.minAmount);
  }

  if (filters?.maxAmount !== undefined) {
    query = query.lte('amount', filters.maxAmount);
  }

  query = query.order('date', { ascending: false });

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function createTransaction(
  transaction: TransactionInsert
): Promise<Transaction> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      ...transaction,
      source: transaction.source || { type: 'manual' },
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createTransactions(
  transactions: TransactionInsert[]
): Promise<Transaction[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('transactions')
    .insert(
      transactions.map((t) => ({
        ...t,
        source: t.source || { type: 'manual' },
      }))
    )
    .select();

  if (error) throw error;
  return data || [];
}

export async function updateTransaction(
  id: string,
  updates: TransactionUpdate
): Promise<Transaction> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('transactions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('transactions').delete().eq('id', id);

  if (error) throw error;
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
    } else {
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
