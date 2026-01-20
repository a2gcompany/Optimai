// API client para comunicarse con los microservicios de Optimai

const CORE_API_URL = process.env.NEXT_PUBLIC_CORE_API_URL || 'http://localhost:3001';
const FINANCE_API_URL = process.env.NEXT_PUBLIC_FINANCE_API_URL || 'http://localhost:3002';

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
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  type: 'income' | 'expense';
  description?: string;
  category?: string;
  date: string;
}

export interface Reminder {
  id: string;
  message: string;
  scheduled_at: string;
  sent_at?: string;
}

class APIClient {
  private async fetch<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data ?? data;
  }

  // Tasks
  async getTasks(limit = 10): Promise<Task[]> {
    try {
      return await this.fetch<Task[]>(`${CORE_API_URL}/api/tasks?limit=${limit}`);
    } catch {
      return [];
    }
  }

  async getTaskStats(): Promise<DashboardStats['tasks']> {
    try {
      return await this.fetch<DashboardStats['tasks']>(`${CORE_API_URL}/api/tasks/stats`);
    } catch {
      return { total: 0, pending: 0, completed: 0, overdue: 0 };
    }
  }

  // Finance
  async getTransactions(limit = 10): Promise<Transaction[]> {
    try {
      return await this.fetch<Transaction[]>(`${FINANCE_API_URL}/api/transactions?limit=${limit}`);
    } catch {
      return [];
    }
  }

  async getFinanceSummary(period = 'month'): Promise<DashboardStats['finance']> {
    try {
      return await this.fetch<DashboardStats['finance']>(`${FINANCE_API_URL}/api/summary?period=${period}`);
    } catch {
      return { totalIncome: 0, totalExpenses: 0, net: 0, transactionCount: 0 };
    }
  }

  // Reminders
  async getReminders(limit = 5): Promise<Reminder[]> {
    try {
      return await this.fetch<Reminder[]>(`${CORE_API_URL}/api/reminders?limit=${limit}`);
    } catch {
      return [];
    }
  }

  async getReminderStats(): Promise<DashboardStats['reminders']> {
    try {
      return await this.fetch<DashboardStats['reminders']>(`${CORE_API_URL}/api/reminders/stats`);
    } catch {
      return { pending: 0, sentToday: 0 };
    }
  }

  // Combined dashboard data
  async getDashboardData(): Promise<{
    stats: DashboardStats;
    recentTasks: Task[];
    recentTransactions: Transaction[];
    upcomingReminders: Reminder[];
  }> {
    const [taskStats, financeStats, reminderStats, recentTasks, recentTransactions, upcomingReminders] =
      await Promise.all([
        this.getTaskStats(),
        this.getFinanceSummary(),
        this.getReminderStats(),
        this.getTasks(5),
        this.getTransactions(5),
        this.getReminders(5),
      ]);

    return {
      stats: {
        tasks: taskStats,
        finance: financeStats,
        reminders: reminderStats,
      },
      recentTasks,
      recentTransactions,
      upcomingReminders,
    };
  }
}

export const api = new APIClient();
