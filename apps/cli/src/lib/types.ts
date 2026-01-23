// Shared types for Optimai local data

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  type: 'task';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string | null;
  tags?: string[];
  source?: 'manual' | 'apple_reminders' | 'telegram';
  created_at: string;
  updated_at?: string;
}

export interface TasksFile {
  version: string;
  lastModified: string;
  tasks: Task[];
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  type: 'income' | 'expense' | 'transfer';
  description?: string | null;
  category?: string;
  category_id?: string;
  date: string;
  created_at?: string;
}

export interface TransactionsFile {
  version: string;
  lastModified: string;
  transactions: Transaction[];
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'transfer';
  color?: string;
  icon?: string;
}

export interface ConfigFile {
  version: string;
  webPort: number;
  apiPort: number;
  categories: Category[];
}
