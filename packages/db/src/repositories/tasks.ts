import { getSupabaseClient } from '../client';

// Using tasks_reminders table (unified tasks + reminders)
export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  type: 'task' | 'reminder';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  recurring: boolean;
  recurrence_rule: string | null;
  source: 'manual' | 'import' | 'telegram';
  source_file: string | null;
  tags: string[];
}

export interface TaskInsert {
  user_id: string;
  title: string;
  description?: string;
  type?: 'task' | 'reminder';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  tags?: string[];
  recurring?: boolean;
  recurrence_rule?: string;
  source?: 'manual' | 'import' | 'telegram';
  source_file?: string;
}

export type TaskUpdate = Partial<Omit<TaskInsert, 'user_id'>> & { completed_at?: string };

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

const TABLE = 'tasks_reminders';

export async function getTaskById(id: string): Promise<Task | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('getTaskById error:', error);
    return null;
  }

  return data;
}

export async function getTasksByUser(
  userId: string,
  options?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    type?: 'task' | 'reminder';
    limit?: number;
  }
): Promise<Task[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId); // Now properly filters by user

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.priority) {
    query = query.eq('priority', options.priority);
  }

  if (options?.type) {
    query = query.eq('type', options.type);
  }

  query = query.order('created_at', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('getTasksByUser error:', error);
    return [];
  }
  return data || [];
}

export async function createTask(task: TaskInsert): Promise<Task> {
  const supabase = getSupabaseClient();

  const newTask = {
    user_id: task.user_id,
    title: task.title,
    description: task.description || null,
    type: task.type || 'task',
    status: task.status || 'pending',
    priority: task.priority || 'medium',
    due_date: task.due_date || null,
    tags: task.tags || [],
    recurring: task.recurring || false,
    recurrence_rule: task.recurrence_rule || null,
    source: task.source || 'manual',
    source_file: task.source_file || null,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(newTask)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updateTask(id: string, updates: TaskUpdate): Promise<Task> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function completeTask(id: string): Promise<Task> {
  return updateTask(id, {
    status: 'completed',
    completed_at: new Date().toISOString(),
  });
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from(TABLE).delete().eq('id', id);

  if (error) throw error;
}

export async function getPendingTasksDueSoon(
  userId: string,
  hoursAhead: number = 24
): Promise<Task[]> {
  const supabase = getSupabaseClient();
  const futureDate = new Date(Date.now() + hoursAhead * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .not('due_date', 'is', null)
    .lte('due_date', futureDate)
    .order('due_date', { ascending: true })
    .limit(20);

  if (error) {
    console.error('getPendingTasksDueSoon error:', error);
    return [];
  }
  return data || [];
}

export async function getOverdueTasks(userId: string): Promise<Task[]> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .not('due_date', 'is', null)
    .lt('due_date', now)
    .order('due_date', { ascending: true });

  if (error) {
    console.error('getOverdueTasks error:', error);
    return [];
  }
  return data || [];
}

export async function getAllTasks(limit = 50): Promise<Task[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getAllTasks error:', error);
    return [];
  }
  return data || [];
}

// Get only tasks (not reminders)
export async function getOnlyTasks(userId: string, limit = 50): Promise<Task[]> {
  return getTasksByUser(userId, { type: 'task', limit });
}

// Get only reminders (not tasks)
export async function getOnlyReminders(userId: string, limit = 50): Promise<Task[]> {
  return getTasksByUser(userId, { type: 'reminder', limit });
}

// Class-based repository for compatibility
export const TasksRepository = {
  findById: getTaskById,
  findByUserId: getTasksByUser,
  create: createTask,
  update: updateTask,
  complete: completeTask,
  delete: deleteTask,
  getPendingDueSoon: getPendingTasksDueSoon,
  getOverdue: getOverdueTasks,
  getAll: getAllTasks,
  getTasks: getOnlyTasks,
  getReminders: getOnlyReminders,
};
