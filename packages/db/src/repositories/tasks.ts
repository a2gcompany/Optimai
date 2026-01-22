import { getSupabaseClient } from '../client';

// Using dev_tasks table from Nucleus which already exists
export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  notes: string | null;
  blockers: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  // Extended fields
  user_id?: string;
  due_date?: string;
  tags?: string[];
}

export interface TaskInsert {
  user_id?: string;
  title: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  due_date?: string;
  tags?: string[];
}

export type TaskUpdate = Partial<TaskInsert> & { completed_at?: string };

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high';

export async function getTaskById(id: string): Promise<Task | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('dev_tasks')
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
    limit?: number;
  }
): Promise<Task[]> {
  const supabase = getSupabaseClient();
  // dev_tasks doesn't have user_id, so we return all tasks
  let query = supabase.from('dev_tasks').select('*');

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.priority) {
    query = query.eq('priority', options.priority);
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

  // Map to dev_tasks schema
  const devTask = {
    title: task.title,
    description: task.description || null,
    status: task.status || 'pending',
    priority: task.priority || 'medium',
    notes: null,
    blockers: null,
  };

  const { data, error } = await supabase
    .from('dev_tasks')
    .insert(devTask as never)
    .select()
    .single();

  if (error) throw error;

  return {
    ...(data as Task),
    user_id: task.user_id,
    due_date: task.due_date,
    tags: task.tags || [],
  };
}

export async function updateTask(id: string, updates: TaskUpdate): Promise<Task> {
  const supabase = getSupabaseClient();

  const devUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title) devUpdates.title = updates.title;
  if (updates.description !== undefined) devUpdates.description = updates.description;
  if (updates.status) devUpdates.status = updates.status;
  if (updates.priority) devUpdates.priority = updates.priority;
  if (updates.completed_at) devUpdates.completed_at = updates.completed_at;

  const { data, error } = await supabase
    .from('dev_tasks')
    .update(devUpdates as never)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

export async function completeTask(id: string): Promise<Task> {
  return updateTask(id, {
    status: 'completed',
    completed_at: new Date().toISOString(),
  });
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('dev_tasks').delete().eq('id', id);

  if (error) throw error;
}

export async function getPendingTasksDueSoon(
  userId: string,
  hoursAhead: number = 24
): Promise<Task[]> {
  // dev_tasks doesn't have due_date, return pending tasks
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('dev_tasks')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .limit(10);

  if (error) {
    console.error('getPendingTasksDueSoon error:', error);
    return [];
  }
  return data || [];
}

export async function getOverdueTasks(userId: string): Promise<Task[]> {
  // dev_tasks doesn't have due_date, return empty
  return [];
}

export async function getAllTasks(limit = 50): Promise<Task[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('dev_tasks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getAllTasks error:', error);
    return [];
  }
  return data || [];
}

// Class-based repository for compatibility
export const TasksRepository = {
  findById: getTaskById,
  findByUserId: (userId: string) => getTasksByUser(userId),
  create: createTask,
  update: updateTask,
  complete: completeTask,
  delete: deleteTask,
  getPendingDueSoon: getPendingTasksDueSoon,
  getOverdue: getOverdueTasks,
  getAll: getAllTasks,
};
