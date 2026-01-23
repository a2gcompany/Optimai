// Interface for data source abstraction (Supabase vs Local Filesystem)

export interface DashboardStats {
  tasks: {
    total: number;
    pending: number;
    completed: number;
    overdue: number;
  };
  finance: {
    totalIncome: number;
    totalExpenses: number;
    net: number;
    transactionCount: number;
  };
  reminders: {
    pending: number;
    sentToday: number;
  };
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string | null;
  tags?: string[];
  created_at: string;
  updated_at?: string;
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
}

export interface Reminder {
  id: string;
  title: string;
  message?: string | null;
  due_date?: string | null;
  scheduled_at?: string | null;
  priority: number;
  is_completed: boolean;
  list_name?: string | null;
  sent_at?: string | null;
}

export interface Idea {
  id: string;
  title: string;
  description?: string | null;
  category: 'feature' | 'improvement' | 'bugfix' | 'research' | 'other';
  status: 'backlog' | 'evaluating' | 'planned' | 'in_progress' | 'done' | 'rejected';
  priority: number;
  effort?: 'xs' | 's' | 'm' | 'l' | 'xl';
  impact?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  votes: number;
  created_at: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  parent_id: string | null;
  type: 'income' | 'expense' | 'transfer';
  is_system: boolean;
  created_at: string;
}

export interface DashboardData {
  stats: DashboardStats;
  recentTasks: Task[];
  recentTransactions: Transaction[];
  upcomingReminders: Reminder[];
}

/**
 * Interface for data source implementations
 * Can be backed by Supabase (cloud) or local filesystem (CLI)
 */
export interface IDataSource {
  // Tasks
  getTasks(limit?: number): Promise<Task[]>;
  getTaskStats(): Promise<DashboardStats['tasks']>;
  createTask(task: Omit<Task, 'id' | 'created_at'>): Promise<Task | null>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task | null>;
  deleteTask(id: string): Promise<boolean>;

  // Finance
  getTransactions(limit?: number): Promise<Transaction[]>;
  getFinanceSummary(period?: string): Promise<DashboardStats['finance']>;
  getCategories(): Promise<Category[]>;
  createTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction | null>;
  deleteTransaction(id: string): Promise<boolean>;

  // Reminders
  getReminders(limit?: number): Promise<Reminder[]>;
  getAllReminders(limit?: number): Promise<Reminder[]>;
  getReminderStats(): Promise<DashboardStats['reminders']>;
  createReminder(reminder: { title: string; due_date?: string; priority?: number }): Promise<Reminder | null>;
  updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder | null>;
  deleteReminder(id: string): Promise<boolean>;

  // Ideas
  getIdeas(limit?: number): Promise<Idea[]>;
  getIdeasByStatus(status: Idea['status']): Promise<Idea[]>;
  createIdea(idea: Omit<Idea, 'id' | 'created_at' | 'votes'>): Promise<Idea | null>;
  updateIdea(id: string, updates: Partial<Idea>): Promise<Idea | null>;
  deleteIdea(id: string): Promise<boolean>;
  voteIdea(id: string, delta: number): Promise<boolean>;

  // Combined
  getDashboardData(): Promise<DashboardData>;
}
