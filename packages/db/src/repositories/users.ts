import { getSupabaseClient } from '../client';
import type { Tables, InsertTables, UpdateTables } from '../types';

export type User = Tables<'users'>;
export type UserInsert = InsertTables<'users'>;
export type UserUpdate = UpdateTables<'users'>;

export async function getUserById(id: string): Promise<User | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function getUserByTelegramId(telegramId: number): Promise<User | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createUser(user: UserInsert): Promise<User> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .insert(user)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateUser(id: string, updates: UserUpdate): Promise<User> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function upsertUserByTelegramId(
  telegramId: number,
  userData: Omit<UserInsert, 'telegram_id'>
): Promise<User> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .upsert(
      { ...userData, telegram_id: telegramId },
      { onConflict: 'telegram_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getActiveUsers(): Promise<User[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_active', true);

  if (error) throw error;
  return data || [];
}

export async function getAdminUsers(): Promise<User[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_admin', true)
    .eq('is_active', true);

  if (error) throw error;
  return data || [];
}
