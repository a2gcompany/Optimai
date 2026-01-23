// Data Source Factory - Automatic detection of local vs cloud environment

import type { IDataSource } from './types';
import { SupabaseDataSource } from './supabase';
import { FileSystemDataSource } from './filesystem';

// Export all types
export * from './types';
export { SupabaseDataSource } from './supabase';
export { FileSystemDataSource } from './filesystem';

/**
 * Detect if running in local CLI mode
 */
export function isLocalMode(): boolean {
  return process.env.NEXT_PUBLIC_IS_LOCAL_CLI === 'true';
}

/**
 * Get the appropriate data source based on environment
 * - Local CLI mode: FileSystemDataSource (calls localhost:3001)
 * - Vercel/Cloud: SupabaseDataSource
 */
export function getDataSource(): IDataSource {
  if (isLocalMode()) {
    return new FileSystemDataSource();
  }
  return new SupabaseDataSource();
}

// Singleton instance
let _dataSourceInstance: IDataSource | null = null;

/**
 * Get singleton data source instance
 */
export function getDataSourceInstance(): IDataSource {
  if (!_dataSourceInstance) {
    _dataSourceInstance = getDataSource();
  }
  return _dataSourceInstance;
}

/**
 * Create a new API client using the appropriate data source
 * For backwards compatibility with existing code
 */
export const api = {
  get instance(): IDataSource {
    return getDataSourceInstance();
  },

  // Proxy all methods for convenience
  getTasks: (limit?: number) => getDataSourceInstance().getTasks(limit),
  getTaskStats: () => getDataSourceInstance().getTaskStats(),
  createTask: (task: Parameters<IDataSource['createTask']>[0]) => getDataSourceInstance().createTask(task),
  updateTask: (id: string, updates: Parameters<IDataSource['updateTask']>[1]) => getDataSourceInstance().updateTask(id, updates),
  deleteTask: (id: string) => getDataSourceInstance().deleteTask(id),

  getTransactions: (limit?: number) => getDataSourceInstance().getTransactions(limit),
  getFinanceSummary: (period?: string) => getDataSourceInstance().getFinanceSummary(period),
  getCategories: () => getDataSourceInstance().getCategories(),
  createTransaction: (tx: Parameters<IDataSource['createTransaction']>[0]) => getDataSourceInstance().createTransaction(tx),
  deleteTransaction: (id: string) => getDataSourceInstance().deleteTransaction(id),

  getReminders: (limit?: number) => getDataSourceInstance().getReminders(limit),
  getAllReminders: (limit?: number) => getDataSourceInstance().getAllReminders(limit),
  getReminderStats: () => getDataSourceInstance().getReminderStats(),
  createReminder: (reminder: Parameters<IDataSource['createReminder']>[0]) => getDataSourceInstance().createReminder(reminder),
  updateReminder: (id: string, updates: Parameters<IDataSource['updateReminder']>[1]) => getDataSourceInstance().updateReminder(id, updates),
  deleteReminder: (id: string) => getDataSourceInstance().deleteReminder(id),

  getIdeas: (limit?: number) => getDataSourceInstance().getIdeas(limit),
  getIdeasByStatus: (status: Parameters<IDataSource['getIdeasByStatus']>[0]) => getDataSourceInstance().getIdeasByStatus(status),
  createIdea: (idea: Parameters<IDataSource['createIdea']>[0]) => getDataSourceInstance().createIdea(idea),
  updateIdea: (id: string, updates: Parameters<IDataSource['updateIdea']>[1]) => getDataSourceInstance().updateIdea(id, updates),
  deleteIdea: (id: string) => getDataSourceInstance().deleteIdea(id),
  voteIdea: (id: string, delta: number) => getDataSourceInstance().voteIdea(id, delta),

  getDashboardData: () => getDataSourceInstance().getDashboardData(),
};
