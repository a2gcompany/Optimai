import { getSupabaseClient } from '../client';

// Using existing reminders table from Nucleus
export interface Reminder {
  id: string;
  title: string;
  due_date: string | null;
  priority: number;
  is_completed: boolean;
  list_name: string | null;
  created_at?: string;
  updated_at?: string;
  // Extended fields for Optimai
  user_id?: string;
  telegram_chat_id?: number;
  message?: string;
  scheduled_at?: string;
  sent_at?: string;
  is_recurring?: boolean;
  recurrence_pattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
  };
}

export interface ReminderInsert {
  user_id?: string;
  telegram_chat_id?: number;
  message: string;
  scheduled_at?: string;
  is_recurring?: boolean;
  recurrence_pattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
  };
}

export type ReminderUpdate = Partial<Reminder>;

export async function getReminderById(id: string): Promise<Reminder | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('getReminderById error:', error);
    return null;
  }

  return data;
}

export async function getRemindersByUser(userId: string): Promise<Reminder[]> {
  const supabase = getSupabaseClient();
  // Reminders table doesn't have user_id, return all
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .order('priority', { ascending: false });

  if (error) {
    console.error('getRemindersByUser error:', error);
    return [];
  }
  return data || [];
}

export async function createReminder(reminder: ReminderInsert): Promise<Reminder> {
  const supabase = getSupabaseClient();

  // Map to existing reminders schema
  const reminderData = {
    id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: reminder.message,
    due_date: reminder.scheduled_at || null,
    priority: 1,
    is_completed: false,
    list_name: 'Optimai',
  };

  const { data, error } = await supabase
    .from('reminders')
    .insert(reminderData)
    .select()
    .single();

  if (error) throw error;

  return {
    ...data,
    user_id: reminder.user_id,
    telegram_chat_id: reminder.telegram_chat_id,
    message: reminder.message,
    scheduled_at: reminder.scheduled_at,
    is_recurring: reminder.is_recurring,
    recurrence_pattern: reminder.recurrence_pattern,
  };
}

export async function updateReminder(
  id: string,
  updates: ReminderUpdate
): Promise<Reminder> {
  const supabase = getSupabaseClient();

  const reminderUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title) reminderUpdates.title = updates.title;
  if (updates.message) reminderUpdates.title = updates.message;
  if (updates.due_date !== undefined) reminderUpdates.due_date = updates.due_date;
  if (updates.scheduled_at !== undefined) reminderUpdates.due_date = updates.scheduled_at;
  if (updates.priority !== undefined) reminderUpdates.priority = updates.priority;
  if (updates.is_completed !== undefined) reminderUpdates.is_completed = updates.is_completed;
  if (updates.sent_at !== undefined) reminderUpdates.is_completed = true;

  const { data, error } = await supabase
    .from('reminders')
    .update(reminderUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markReminderAsSent(id: string): Promise<Reminder> {
  return updateReminder(id, { is_completed: true });
}

export async function deleteReminder(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('reminders').delete().eq('id', id);

  if (error) throw error;
}

export async function getPendingReminders(): Promise<Reminder[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('is_completed', false)
    .order('priority', { ascending: false });

  if (error) {
    console.error('getPendingReminders error:', error);
    return [];
  }
  return data || [];
}

export async function getUpcomingReminders(
  userId: string,
  hoursAhead: number = 24
): Promise<Reminder[]> {
  const supabase = getSupabaseClient();
  const now = new Date();
  const future = new Date();
  future.setHours(future.getHours() + hoursAhead);

  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('is_completed', false)
    .order('priority', { ascending: false })
    .limit(20);

  if (error) {
    console.error('getUpcomingReminders error:', error);
    return [];
  }
  return data || [];
}

export async function getAllReminders(limit = 50): Promise<Reminder[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .order('priority', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getAllReminders error:', error);
    return [];
  }
  return data || [];
}

// Class-based repository for compatibility
export const RemindersRepository = {
  findById: getReminderById,
  findByUserId: getRemindersByUser,
  create: createReminder,
  update: updateReminder,
  markSent: markReminderAsSent,
  delete: deleteReminder,
  getPending: getPendingReminders,
  getUpcoming: getUpcomingReminders,
  getAll: getAllReminders,
};
