// API client - Re-exports from data-sources for backwards compatibility
// Uses DataSource abstraction to support both Supabase (cloud) and Filesystem (CLI)

export {
  api,
  getDataSource,
  getDataSourceInstance,
  isLocalMode,
} from './data-sources';

export type {
  DashboardStats,
  Task,
  Transaction,
  Reminder,
  Idea,
  Category,
  DashboardData,
  IDataSource,
} from './data-sources';

// Re-export DbCategory from supabase for backwards compatibility
export type { DbCategory } from './supabase';
