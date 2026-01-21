// API client para comunicarse con Supabase directamente
// Usa tablas existentes de Nucleus donde es posible
// Para Ideas y Transactions que no existen aún, usa localStorage como fallback
import { supabase, type DbCategory } from './supabase';

// Storage helpers for browser fallback
const STORAGE_KEYS = {
  ideas: 'optimai_ideas',
  transactions: 'optimai_transactions',
  categories: 'optimai_categories',
};

function getFromStorage<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Initialize default categories if not present
function initializeDefaultCategories(): DbCategory[] {
  const existing = getFromStorage<DbCategory>(STORAGE_KEYS.categories);
  if (existing.length > 0) return existing;

  const defaults: DbCategory[] = [
    { id: 'cat-1', name: 'Salario', type: 'income', color: '#22c55e', icon: 'banknotes', is_system: true, user_id: null, parent_id: null, created_at: new Date().toISOString() },
    { id: 'cat-2', name: 'Freelance', type: 'income', color: '#10b981', icon: 'briefcase', is_system: true, user_id: null, parent_id: null, created_at: new Date().toISOString() },
    { id: 'cat-3', name: 'Inversiones', type: 'income', color: '#14b8a6', icon: 'trending-up', is_system: true, user_id: null, parent_id: null, created_at: new Date().toISOString() },
    { id: 'cat-4', name: 'Alimentación', type: 'expense', color: '#f59e0b', icon: 'utensils', is_system: true, user_id: null, parent_id: null, created_at: new Date().toISOString() },
    { id: 'cat-5', name: 'Transporte', type: 'expense', color: '#3b82f6', icon: 'car', is_system: true, user_id: null, parent_id: null, created_at: new Date().toISOString() },
    { id: 'cat-6', name: 'Vivienda', type: 'expense', color: '#8b5cf6', icon: 'home', is_system: true, user_id: null, parent_id: null, created_at: new Date().toISOString() },
    { id: 'cat-7', name: 'Entretenimiento', type: 'expense', color: '#ec4899', icon: 'gamepad-2', is_system: true, user_id: null, parent_id: null, created_at: new Date().toISOString() },
    { id: 'cat-8', name: 'Salud', type: 'expense', color: '#ef4444', icon: 'heart-pulse', is_system: true, user_id: null, parent_id: null, created_at: new Date().toISOString() },
    { id: 'cat-9', name: 'Suscripciones', type: 'expense', color: '#a855f7', icon: 'repeat', is_system: true, user_id: null, parent_id: null, created_at: new Date().toISOString() },
    { id: 'cat-10', name: 'Software', type: 'expense', color: '#6366f1', icon: 'code', is_system: true, user_id: null, parent_id: null, created_at: new Date().toISOString() },
    { id: 'cat-11', name: 'Marketing', type: 'expense', color: '#f43f5e', icon: 'megaphone', is_system: true, user_id: null, parent_id: null, created_at: new Date().toISOString() },
    { id: 'cat-12', name: 'Viajes', type: 'expense', color: '#0ea5e9', icon: 'plane', is_system: true, user_id: null, parent_id: null, created_at: new Date().toISOString() },
    { id: 'cat-13', name: 'Artistas', type: 'income', color: '#8b5cf6', icon: 'music', is_system: true, user_id: null, parent_id: null, created_at: new Date().toISOString() },
    { id: 'cat-14', name: 'Otros', type: 'expense', color: '#64748b', icon: 'more-horizontal', is_system: true, user_id: null, parent_id: null, created_at: new Date().toISOString() },
  ];
  saveToStorage(STORAGE_KEYS.categories, defaults);
  return defaults;
}

// Initialize sample data for demo
function initializeSampleTransactions(): Transaction[] {
  const existing = getFromStorage<Transaction>(STORAGE_KEYS.transactions);
  if (existing.length > 0) return existing;

  const samples: Transaction[] = [
    { id: 'tx-1', amount: 5000, currency: 'EUR', type: 'income', description: 'Booking Roger Sanchez - Ushuaia', category: 'Artistas', category_id: 'cat-13', date: '2026-01-20' },
    { id: 'tx-2', amount: 1250.50, currency: 'EUR', type: 'expense', description: 'Publicidad Meta - PAIDDADS', category: 'Marketing', category_id: 'cat-11', date: '2026-01-19' },
    { id: 'tx-3', amount: 2500, currency: 'EUR', type: 'income', description: 'Comisión Prophecy - Ultra', category: 'Artistas', category_id: 'cat-13', date: '2026-01-18' },
    { id: 'tx-4', amount: 89.99, currency: 'EUR', type: 'expense', description: 'Suscripción OpenAI API', category: 'Software', category_id: 'cat-10', date: '2026-01-17' },
    { id: 'tx-5', amount: 350, currency: 'EUR', type: 'expense', description: 'Vuelo Madrid-Ibiza', category: 'Viajes', category_id: 'cat-12', date: '2026-01-16' },
    { id: 'tx-6', amount: 15000, currency: 'EUR', type: 'income', description: 'Pago mensual A2G FZCO', category: 'Salario', category_id: 'cat-1', date: '2026-01-01' },
    { id: 'tx-7', amount: 2500, currency: 'EUR', type: 'expense', description: 'Alquiler oficina Dubai', category: 'Vivienda', category_id: 'cat-6', date: '2026-01-05' },
    { id: 'tx-8', amount: 199, currency: 'EUR', type: 'expense', description: 'Vercel Pro + Supabase', category: 'Software', category_id: 'cat-10', date: '2026-01-10' },
    { id: 'tx-9', amount: 800, currency: 'EUR', type: 'income', description: 'Consultoría EMVI', category: 'Freelance', category_id: 'cat-2', date: '2026-01-12' },
    { id: 'tx-10', amount: 45, currency: 'EUR', type: 'expense', description: 'Cena networking', category: 'Alimentación', category_id: 'cat-4', date: '2026-01-15' },
  ];
  saveToStorage(STORAGE_KEYS.transactions, samples);
  return samples;
}

function initializeSampleIdeas(): Idea[] {
  const existing = getFromStorage<Idea>(STORAGE_KEYS.ideas);
  if (existing.length > 0) return existing;

  const samples: Idea[] = [
    { id: 'idea-1', title: 'Integrar con Stripe para pagos', description: 'Conectar el sistema de pagos de S-CORE con Stripe para procesar suscripciones', category: 'feature', status: 'planned', priority: 3, effort: 'l', impact: 'critical', tags: ['stripe', 's-core', 'payments'], votes: 5, created_at: '2026-01-15T10:00:00Z' },
    { id: 'idea-2', title: 'Dashboard de métricas de artistas', description: 'Panel para ver estadísticas de Roger Sanchez, Prophecy y BABEL', category: 'feature', status: 'backlog', priority: 2, effort: 'm', impact: 'high', tags: ['a2g-talents', 'analytics'], votes: 3, created_at: '2026-01-14T10:00:00Z' },
    { id: 'idea-3', title: 'Optimizar carga del dashboard', description: 'El dashboard tarda en cargar, revisar queries de Supabase', category: 'improvement', status: 'evaluating', priority: 1, effort: 's', impact: 'medium', tags: ['performance'], votes: 2, created_at: '2026-01-13T10:00:00Z' },
    { id: 'idea-4', title: 'Bot de Telegram no responde a fotos', description: 'Cuando se envía una foto, el bot no procesa el mensaje', category: 'bugfix', status: 'in_progress', priority: 2, effort: 's', impact: 'medium', tags: ['telegram', 'bug'], votes: 4, created_at: '2026-01-12T10:00:00Z' },
    { id: 'idea-5', title: 'Investigar Web3 para tips de fans', description: 'Estudiar cómo implementar pagos crypto en Tipit', category: 'research', status: 'backlog', priority: 0, effort: 'xl', impact: 'high', tags: ['web3', 'tipit'], votes: 1, created_at: '2026-01-11T10:00:00Z' },
    { id: 'idea-6', title: 'Sistema de notificaciones push', description: 'Implementar notificaciones para recordatorios importantes', category: 'feature', status: 'backlog', priority: 1, effort: 'm', impact: 'medium', tags: ['notifications'], votes: 2, created_at: '2026-01-10T10:00:00Z' },
    { id: 'idea-7', title: 'Integración con Shopify', description: 'Conectar métricas de tiendas de merchandising de artistas', category: 'feature', status: 'evaluating', priority: 2, effort: 'l', impact: 'high', tags: ['shopify', 'e-commerce'], votes: 3, created_at: '2026-01-09T10:00:00Z' },
    { id: 'idea-8', title: 'Mejorar UX del formulario de tareas', description: 'Añadir autocompletado y validación inline', category: 'improvement', status: 'done', priority: 1, effort: 's', impact: 'medium', tags: ['ux', 'forms'], votes: 2, created_at: '2026-01-08T10:00:00Z' },
  ];
  saveToStorage(STORAGE_KEYS.ideas, samples);
  return samples;
}

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
  private initialized = false;

  private ensureInitialized() {
    if (this.initialized || typeof window === 'undefined') return;
    initializeDefaultCategories();
    initializeSampleTransactions();
    initializeSampleIdeas();
    this.initialized = true;
  }

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

  // Finance - Using localStorage (optimai_transactions table doesn't exist)
  async getTransactions(limit = 10): Promise<Transaction[]> {
    this.ensureInitialized();
    const txs = getFromStorage<Transaction>(STORAGE_KEYS.transactions);
    // Sort by date descending
    txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return txs.slice(0, limit);
  }

  async getFinanceSummary(period = 'month'): Promise<DashboardStats['finance']> {
    this.ensureInitialized();
    const txs = getFromStorage<Transaction>(STORAGE_KEYS.transactions);

    const now = new Date();
    let startDate: Date;

    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const filtered = txs.filter(t => new Date(t.date) >= startDate);

    const totalIncome = filtered.filter((t) => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = filtered.filter((t) => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      totalIncome,
      totalExpenses,
      net: totalIncome - totalExpenses,
      transactionCount: filtered.length,
    };
  }

  async getCategories(): Promise<DbCategory[]> {
    this.ensureInitialized();
    return getFromStorage<DbCategory>(STORAGE_KEYS.categories);
  }

  async createTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction | null> {
    this.ensureInitialized();
    const txs = getFromStorage<Transaction>(STORAGE_KEYS.transactions);

    // Find category name
    const categories = getFromStorage<DbCategory>(STORAGE_KEYS.categories);
    const cat = categories.find(c => c.id === tx.category_id);

    const newTx: Transaction = {
      id: generateId(),
      amount: tx.amount,
      currency: tx.currency || 'EUR',
      type: tx.type,
      description: tx.description,
      category: cat?.name || tx.category,
      category_id: tx.category_id,
      date: tx.date,
    };

    txs.unshift(newTx);
    saveToStorage(STORAGE_KEYS.transactions, txs);
    return newTx;
  }

  async deleteTransaction(id: string): Promise<boolean> {
    const txs = getFromStorage<Transaction>(STORAGE_KEYS.transactions);
    const filtered = txs.filter(t => t.id !== id);
    saveToStorage(STORAGE_KEYS.transactions, filtered);
    return true;
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
    const id = `rem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

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

  // Ideas - Using localStorage (optimai_ideas table doesn't exist)
  async getIdeas(limit = 50): Promise<Idea[]> {
    this.ensureInitialized();
    const ideas = getFromStorage<Idea>(STORAGE_KEYS.ideas);
    // Sort by priority then by date
    ideas.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return ideas.slice(0, limit);
  }

  async getIdeasByStatus(status: Idea['status']): Promise<Idea[]> {
    const ideas = await this.getIdeas();
    return ideas.filter((i) => i.status === status);
  }

  async createIdea(idea: Omit<Idea, 'id' | 'created_at' | 'votes'>): Promise<Idea | null> {
    this.ensureInitialized();
    const ideas = getFromStorage<Idea>(STORAGE_KEYS.ideas);

    const newIdea: Idea = {
      id: generateId(),
      title: idea.title,
      description: idea.description,
      category: idea.category,
      status: idea.status,
      priority: idea.priority,
      effort: idea.effort,
      impact: idea.impact,
      tags: idea.tags || [],
      votes: 0,
      created_at: new Date().toISOString(),
    };

    ideas.unshift(newIdea);
    saveToStorage(STORAGE_KEYS.ideas, ideas);
    return newIdea;
  }

  async updateIdea(id: string, updates: Partial<Idea>): Promise<Idea | null> {
    const ideas = getFromStorage<Idea>(STORAGE_KEYS.ideas);
    const index = ideas.findIndex(i => i.id === id);
    if (index === -1) return null;

    ideas[index] = {
      ...ideas[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    saveToStorage(STORAGE_KEYS.ideas, ideas);
    return ideas[index];
  }

  async deleteIdea(id: string): Promise<boolean> {
    const ideas = getFromStorage<Idea>(STORAGE_KEYS.ideas);
    const filtered = ideas.filter(i => i.id !== id);
    saveToStorage(STORAGE_KEYS.ideas, filtered);
    return true;
  }

  async voteIdea(id: string, delta: number): Promise<boolean> {
    const ideas = getFromStorage<Idea>(STORAGE_KEYS.ideas);
    const index = ideas.findIndex(i => i.id === id);
    if (index === -1) return false;

    ideas[index].votes = Math.max(0, (ideas[index].votes || 0) + delta);
    saveToStorage(STORAGE_KEYS.ideas, ideas);
    return true;
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
export type { DbCategory } from './supabase';
