// API client para comunicarse con Supabase directamente
// Usa tablas existentes de Nucleus donde es posible
import { supabase, DbCategory } from './supabase';

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
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  tags?: string[];
  created_at: string;
  updated_at?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  type: 'income' | 'expense' | 'transfer';
  description?: string;
  category?: string;
  category_id?: string;
  date: string;
}

export interface Reminder {
  id: string;
  title: string;
  message?: string;
  due_date?: string;
  scheduled_at?: string;
  priority: number;
  is_completed: boolean;
  list_name?: string;
  sent_at?: string;
}

export interface Idea {
  id: string;
  title: string;
  description?: string;
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

// Map dev_tasks status to our Task interface
function mapDevTaskStatus(status: string): Task['status'] {
  switch (status) {
    case 'completed':
    case 'done':
      return 'completed';
    case 'in_progress':
    case 'working':
      return 'in_progress';
    case 'cancelled':
    case 'rejected':
      return 'cancelled';
    default:
      return 'pending';
  }
}

// Map dev_tasks priority to our format
function mapDevTaskPriority(priority: string): Task['priority'] {
  switch (priority?.toLowerCase()) {
    case 'urgent':
    case 'critical':
      return 'urgent';
    case 'high':
      return 'high';
    case 'low':
      return 'low';
    default:
      return 'medium';
  }
}

class APIClient {
  // Tasks - Using Nucleus dev_tasks table
  async getTasks(limit = 10): Promise<Task[]> {
    const { data, error } = await supabase
      .from('dev_tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }

    return (data || []).map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: mapDevTaskStatus(t.status),
      priority: mapDevTaskPriority(t.priority),
      due_date: t.completed_at,
      tags: [],
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));
  }

  async getTaskStats(): Promise<DashboardStats['tasks']> {
    const { data, error } = await supabase.from('dev_tasks').select('status, completed_at');

    if (error || !data) {
      return { total: 0, pending: 0, completed: 0, overdue: 0 };
    }

    return {
      total: data.length,
      pending: data.filter((t) => t.status === 'pending' || t.status === 'in_progress').length,
      completed: data.filter((t) => t.status === 'completed' || t.status === 'done').length,
      overdue: 0, // dev_tasks doesn't have due_date
    };
  }

  async createTask(task: Omit<Task, 'id' | 'created_at'>): Promise<Task | null> {
    const { data, error } = await supabase
      .from('dev_tasks')
      .insert({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return null;
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      status: mapDevTaskStatus(data.status),
      priority: mapDevTaskPriority(data.priority),
      created_at: data.created_at,
    };
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const updateData: Record<string, unknown> = {};
    if (updates.title) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.status) updateData.status = updates.status;
    if (updates.priority) updateData.priority = updates.priority;
    if (updates.status === 'completed') updateData.completed_at = new Date().toISOString();

    const { data, error } = await supabase.from('dev_tasks').update(updateData).eq('id', id).select().single();

    if (error) {
      console.error('Error updating task:', error);
      return null;
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      status: mapDevTaskStatus(data.status),
      priority: mapDevTaskPriority(data.priority),
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  async deleteTask(id: string): Promise<boolean> {
    const { error } = await supabase.from('dev_tasks').delete().eq('id', id);
    return !error;
  }

  // Finance - Using optimai_transactions table (may not exist yet)
  async getTransactions(limit = 10): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('optimai_transactions')
      .select('*, optimai_categories(name)')
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching transactions:', error);
      // Return empty - table may not exist
      return [];
    }

    return (data || []).map((t: Record<string, unknown>) => ({
      id: t.id as string,
      amount: t.amount as number,
      currency: (t.currency as string) || 'EUR',
      type: t.type as 'income' | 'expense' | 'transfer',
      description: t.description as string | undefined,
      category: ((t.optimai_categories as { name?: string })?.name as string) || 'Sin categoría',
      category_id: t.category_id as string | undefined,
      date: t.date as string,
    }));
  }

  async getFinanceSummary(period = 'month'): Promise<DashboardStats['finance']> {
    const now = new Date();
    let startDate: string;

    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    } else {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    const { data, error } = await supabase
      .from('optimai_transactions')
      .select('amount, type')
      .gte('date', startDate);

    if (error || !data) {
      return { totalIncome: 0, totalExpenses: 0, net: 0, transactionCount: 0 };
    }

    const totalIncome = data.filter((t) => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = data
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    return {
      totalIncome,
      totalExpenses,
      net: totalIncome - totalExpenses,
      transactionCount: data.length,
    };
  }

  async getCategories(): Promise<DbCategory[]> {
    const { data, error } = await supabase.from('optimai_categories').select('*').order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      // Return default categories
      return [
        { id: '1', name: 'Alimentación', type: 'expense', color: '#f59e0b', icon: 'utensils', is_system: true, user_id: null, parent_id: null, created_at: '' },
        { id: '2', name: 'Transporte', type: 'expense', color: '#3b82f6', icon: 'car', is_system: true, user_id: null, parent_id: null, created_at: '' },
        { id: '3', name: 'Salario', type: 'income', color: '#22c55e', icon: 'banknotes', is_system: true, user_id: null, parent_id: null, created_at: '' },
        { id: '4', name: 'Otros', type: 'expense', color: '#64748b', icon: 'more-horizontal', is_system: true, user_id: null, parent_id: null, created_at: '' },
      ];
    }
    return data || [];
  }

  async createTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction | null> {
    const { data, error } = await supabase
      .from('optimai_transactions')
      .insert({
        amount: tx.amount,
        currency: tx.currency || 'EUR',
        type: tx.type,
        description: tx.description,
        category_id: tx.category_id,
        date: tx.date,
        user_id: '00000000-0000-0000-0000-000000000000',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating transaction:', error);
      return null;
    }
    return data;
  }

  // Reminders - Using Nucleus reminders table
  async getReminders(limit = 5): Promise<Reminder[]> {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('is_completed', false)
      .order('priority', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching reminders:', error);
      return [];
    }

    return (data || []).map((r) => ({
      id: r.id,
      title: r.title,
      due_date: r.due_date,
      priority: r.priority || 0,
      is_completed: r.is_completed || false,
      list_name: r.list_name,
    }));
  }

  async getAllReminders(limit = 50): Promise<Reminder[]> {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .order('priority', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching reminders:', error);
      return [];
    }

    return (data || []).map((r) => ({
      id: r.id,
      title: r.title,
      due_date: r.due_date,
      priority: r.priority || 0,
      is_completed: r.is_completed || false,
      list_name: r.list_name,
    }));
  }

  async getReminderStats(): Promise<DashboardStats['reminders']> {
    const { data, error } = await supabase.from('reminders').select('is_completed');

    if (error || !data) {
      return { pending: 0, sentToday: 0 };
    }

    return {
      pending: data.filter((r) => !r.is_completed).length,
      sentToday: data.filter((r) => r.is_completed).length,
    };
  }

  async createReminder(reminder: { title: string; due_date?: string; priority?: number }): Promise<Reminder | null> {
    const id = `rem-${Buffer.from(reminder.title.substring(0, 20)).toString('base64').replace(/[+/=]/g, '')}`;

    const { data, error } = await supabase
      .from('reminders')
      .insert({
        id,
        title: reminder.title,
        due_date: reminder.due_date,
        priority: reminder.priority || 0,
        is_completed: false,
        list_name: 'Optimai',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating reminder:', error);
      return null;
    }

    return {
      id: data.id,
      title: data.title,
      due_date: data.due_date,
      priority: data.priority,
      is_completed: data.is_completed,
      list_name: data.list_name,
    };
  }

  async updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder | null> {
    const updateData: Record<string, unknown> = {};
    if (updates.title) updateData.title = updates.title;
    if (updates.due_date !== undefined) updateData.due_date = updates.due_date;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.is_completed !== undefined) updateData.is_completed = updates.is_completed;

    const { data, error } = await supabase.from('reminders').update(updateData).eq('id', id).select().single();

    if (error) {
      console.error('Error updating reminder:', error);
      return null;
    }

    return {
      id: data.id,
      title: data.title,
      due_date: data.due_date,
      priority: data.priority,
      is_completed: data.is_completed,
      list_name: data.list_name,
    };
  }

  async deleteReminder(id: string): Promise<boolean> {
    const { error } = await supabase.from('reminders').delete().eq('id', id);
    return !error;
  }

  // Ideas - Using optimai_ideas table (may not exist yet)
  async getIdeas(limit = 50): Promise<Idea[]> {
    const { data, error } = await supabase
      .from('optimai_ideas')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching ideas:', error);
      // Table doesn't exist - return dev_tasks as ideas fallback
      return this.getDevTasksAsIdeas();
    }

    return (data || []).map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      category: i.category || 'feature',
      status: i.status || 'backlog',
      priority: i.priority || 0,
      effort: i.effort,
      impact: i.impact,
      tags: i.tags || [],
      votes: i.votes || 0,
      created_at: i.created_at,
      updated_at: i.updated_at,
    }));
  }

  // Fallback: use dev_tasks as ideas
  private async getDevTasksAsIdeas(): Promise<Idea[]> {
    const { data, error } = await supabase
      .from('dev_tasks')
      .select('*')
      .order('priority', { ascending: false })
      .limit(50);

    if (error || !data) return [];

    const statusMap: Record<string, Idea['status']> = {
      pending: 'backlog',
      in_progress: 'in_progress',
      completed: 'done',
    };

    return data.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      category: 'feature' as const,
      status: statusMap[t.status] || 'backlog',
      priority: t.priority === 'high' ? 3 : t.priority === 'medium' ? 2 : 1,
      tags: [],
      votes: 0,
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));
  }

  async getIdeasByStatus(status: Idea['status']): Promise<Idea[]> {
    const ideas = await this.getIdeas();
    return ideas.filter((i) => i.status === status);
  }

  async createIdea(idea: Omit<Idea, 'id' | 'created_at' | 'votes'>): Promise<Idea | null> {
    const { data, error } = await supabase
      .from('optimai_ideas')
      .insert({
        title: idea.title,
        description: idea.description,
        category: idea.category,
        status: idea.status,
        priority: idea.priority,
        effort: idea.effort,
        impact: idea.impact,
        tags: idea.tags || [],
        votes: 0,
        user_id: '00000000-0000-0000-0000-000000000000',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating idea:', error);
      // Fallback to dev_tasks
      return this.createIdeaAsDevTask(idea);
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      category: data.category,
      status: data.status,
      priority: data.priority,
      effort: data.effort,
      impact: data.impact,
      tags: data.tags || [],
      votes: data.votes || 0,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  private async createIdeaAsDevTask(
    idea: Omit<Idea, 'id' | 'created_at' | 'votes'>
  ): Promise<Idea | null> {
    const statusMap: Record<Idea['status'], string> = {
      backlog: 'pending',
      evaluating: 'pending',
      planned: 'pending',
      in_progress: 'in_progress',
      done: 'completed',
      rejected: 'completed',
    };

    const { data, error } = await supabase
      .from('dev_tasks')
      .insert({
        title: idea.title,
        description: idea.description,
        status: statusMap[idea.status] || 'pending',
        priority: idea.priority >= 3 ? 'high' : idea.priority >= 2 ? 'medium' : 'low',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating idea as dev_task:', error);
      return null;
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      category: 'feature',
      status: 'backlog',
      priority: idea.priority,
      tags: [],
      votes: 0,
      created_at: data.created_at,
    };
  }

  async updateIdea(id: string, updates: Partial<Idea>): Promise<Idea | null> {
    // Try optimai_ideas first
    const { data, error } = await supabase.from('optimai_ideas').update(updates).eq('id', id).select().single();

    if (error) {
      // Fallback to dev_tasks
      const devUpdates: Record<string, unknown> = {};
      if (updates.title) devUpdates.title = updates.title;
      if (updates.description !== undefined) devUpdates.description = updates.description;
      if (updates.status) {
        const statusMap: Record<Idea['status'], string> = {
          backlog: 'pending',
          evaluating: 'pending',
          planned: 'pending',
          in_progress: 'in_progress',
          done: 'completed',
          rejected: 'completed',
        };
        devUpdates.status = statusMap[updates.status];
      }

      const { data: devData, error: devError } = await supabase
        .from('dev_tasks')
        .update(devUpdates)
        .eq('id', id)
        .select()
        .single();

      if (devError) return null;
      return {
        id: devData.id,
        title: devData.title,
        description: devData.description,
        category: 'feature',
        status: 'backlog',
        priority: 0,
        tags: [],
        votes: 0,
        created_at: devData.created_at,
      };
    }

    return data;
  }

  async deleteIdea(id: string): Promise<boolean> {
    // Try optimai_ideas first
    const { error } = await supabase.from('optimai_ideas').delete().eq('id', id);
    if (error) {
      // Fallback to dev_tasks
      const { error: devError } = await supabase.from('dev_tasks').delete().eq('id', id);
      return !devError;
    }
    return true;
  }

  async voteIdea(id: string, delta: number): Promise<boolean> {
    const { data: current } = await supabase.from('optimai_ideas').select('votes').eq('id', id).single();

    if (!current) return false;

    const { error } = await supabase
      .from('optimai_ideas')
      .update({ votes: (current.votes || 0) + delta })
      .eq('id', id);

    return !error;
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
