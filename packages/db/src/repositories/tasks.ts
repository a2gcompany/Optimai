import { getSupabaseClient } from '../client';
import type { Tables, InsertTables, UpdateTables } from '../types';

export type Task = Tables<'tasks'>;
export type TaskInsert = InsertTables<'tasks'>;
export type TaskUpdate = UpdateTables<'tasks'>;

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high';

export async function getTaskById(id: string): Promise<Task | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
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
  let query = supabase.from('tasks').select('*').eq('user_id', userId);

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

  if (error) throw error;
  return data || [];
}

export async function createTask(task: TaskInsert): Promise<Task> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...task,
      status: task.status || 'pending',
      priority: task.priority || 'medium',
      tags: task.tags || [],
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTask(id: string, updates: TaskUpdate): Promise<Task> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
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
  const { error } = await supabase.from('tasks').delete().eq('id', id);

  if (error) throw error;
}

export async function getPendingTasksDueSoon(
  userId: string,
  hoursAhead: number = 24
): Promise<Task[]> {
  const supabase = getSupabaseClient();
  const futureDate = new Date();
  futureDate.setHours(futureDate.getHours() + hoursAhead);

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .not('due_date', 'is', null)
    .lte('due_date', futureDate.toISOString())
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getOverdueTasks(userId: string): Promise<Task[]> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .not('due_date', 'is', null)
    .lt('due_date', now)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data || [];
}
