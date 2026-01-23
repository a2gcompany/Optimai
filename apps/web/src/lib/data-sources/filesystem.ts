// FileSystem DataSource - Calls local API server (CLI mode)

import type {
  IDataSource,
  Task,
  Transaction,
  Reminder,
  Idea,
  Category,
  DashboardStats,
  DashboardData,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_LOCAL_API_URL || 'http://localhost:3001';

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export class FileSystemDataSource implements IDataSource {
  // Tasks
  async getTasks(limit = 10): Promise<Task[]> {
    return fetchAPI<Task[]>(`/api/tasks?limit=${limit}`);
  }

  async getTaskStats(): Promise<DashboardStats['tasks']> {
    return fetchAPI<DashboardStats['tasks']>('/api/tasks/stats');
  }

  async createTask(task: Omit<Task, 'id' | 'created_at'>): Promise<Task | null> {
    return fetchAPI<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    return fetchAPI<Task>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteTask(id: string): Promise<boolean> {
    await fetchAPI(`/api/tasks/${id}`, { method: 'DELETE' });
    return true;
  }

  // Finance
  async getTransactions(limit = 10): Promise<Transaction[]> {
    return fetchAPI<Transaction[]>(`/api/transactions?limit=${limit}`);
  }

  async getFinanceSummary(period = 'month'): Promise<DashboardStats['finance']> {
    return fetchAPI<DashboardStats['finance']>(`/api/finance/summary?period=${period}`);
  }

  async getCategories(): Promise<Category[]> {
    return fetchAPI<Category[]>('/api/categories');
  }

  async createTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction | null> {
    return fetchAPI<Transaction>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(tx),
    });
  }

  async deleteTransaction(id: string): Promise<boolean> {
    await fetchAPI(`/api/transactions/${id}`, { method: 'DELETE' });
    return true;
  }

  // Reminders - Not supported in local mode, return empty
  async getReminders(_limit = 5): Promise<Reminder[]> {
    return [];
  }

  async getAllReminders(_limit = 50): Promise<Reminder[]> {
    return [];
  }

  async getReminderStats(): Promise<DashboardStats['reminders']> {
    return { pending: 0, sentToday: 0 };
  }

  async createReminder(_reminder: { title: string; due_date?: string; priority?: number }): Promise<Reminder | null> {
    console.warn('Reminders not supported in local mode');
    return null;
  }

  async updateReminder(_id: string, _updates: Partial<Reminder>): Promise<Reminder | null> {
    console.warn('Reminders not supported in local mode');
    return null;
  }

  async deleteReminder(_id: string): Promise<boolean> {
    console.warn('Reminders not supported in local mode');
    return false;
  }

  // Ideas - Not supported in local mode, return empty
  async getIdeas(_limit = 50): Promise<Idea[]> {
    return [];
  }

  async getIdeasByStatus(_status: Idea['status']): Promise<Idea[]> {
    return [];
  }

  async createIdea(_idea: Omit<Idea, 'id' | 'created_at' | 'votes'>): Promise<Idea | null> {
    console.warn('Ideas not supported in local mode');
    return null;
  }

  async updateIdea(_id: string, _updates: Partial<Idea>): Promise<Idea | null> {
    console.warn('Ideas not supported in local mode');
    return null;
  }

  async deleteIdea(_id: string): Promise<boolean> {
    console.warn('Ideas not supported in local mode');
    return false;
  }

  async voteIdea(_id: string, _delta: number): Promise<boolean> {
    console.warn('Ideas not supported in local mode');
    return false;
  }

  // Combined
  async getDashboardData(): Promise<DashboardData> {
    return fetchAPI<DashboardData>('/api/dashboard');
  }
}
