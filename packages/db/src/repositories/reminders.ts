import { getSupabaseClient } from '../client';
import type { Tables, InsertTables, UpdateTables } from '../types';

export type Reminder = Tables<'reminders'>;
export type ReminderInsert = InsertTables<'reminders'>;
export type ReminderUpdate = UpdateTables<'reminders'>;

export async function getReminderById(id: string): Promise<Reminder | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function getRemindersByUser(userId: string): Promise<Reminder[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', userId)
    .order('scheduled_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createReminder(reminder: ReminderInsert): Promise<Reminder> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('reminders')
    .insert(reminder)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateReminder(
  id: string,
  updates: ReminderUpdate
): Promise<Reminder> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('reminders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markReminderAsSent(id: string): Promise<Reminder> {
  return updateReminder(id, { sent_at: new Date().toISOString() });
}

export async function deleteReminder(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('reminders').delete().eq('id', id);

  if (error) throw error;
}

export async function getPendingReminders(): Promise<Reminder[]> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .is('sent_at', null)
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true });

  if (error) throw error;
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
    .eq('user_id', userId)
    .is('sent_at', null)
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', future.toISOString())
    .order('scheduled_at', { ascending: true });

  if (error) throw error;
  return data || [];
}
