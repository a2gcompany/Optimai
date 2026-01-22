import { getSupabaseClient } from '../client';

// Using nucleus_users table which already exists
export interface User {
  id: string;
  phone: string;
  name: string;
  role: 'admin' | 'artist' | 'manager' | 'user';
  project: string | null;
  manager_phone: string | null;
  onboarding_status: string;
  onboarding_step: number;
  settings: {
    language: string;
    notifications: boolean;
  };
  created_at: string;
  updated_at: string;
  last_active: string;
  // Extended fields for Optimai
  telegram_id?: number;
  telegram_username?: string;
  first_name?: string;
  last_name?: string;
}

export interface UserInsert {
  telegram_id?: number;
  telegram_username?: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  is_admin?: boolean;
  preferences?: {
    language: string;
    timezone: string;
    notifications_enabled: boolean;
  };
}

export type UserUpdate = Partial<UserInsert>;

export async function getUserById(id: string): Promise<User | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('nucleus_users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('getUserById error:', error);
    return null;
  }

  return data;
}

export async function getUserByTelegramId(telegramId: number): Promise<User | null> {
  const supabase = getSupabaseClient();
  // nucleus_users uses 'phone' field with format 'telegram:USERID'
  const { data, error } = await supabase
    .from('nucleus_users')
    .select('*')
    .eq('phone', `telegram:${telegramId}`)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('getUserByTelegramId error:', error);
    return null;
  }

  return data;
}

export async function createUser(user: UserInsert): Promise<User> {
  const supabase = getSupabaseClient();

  // Map to nucleus_users schema
  const nucleusUser = {
    phone: user.telegram_id ? `telegram:${user.telegram_id}` : `user:${Date.now()}`,
    name: user.first_name || 'Usuario',
    role: user.is_admin ? 'admin' : 'user',
    onboarding_status: 'started',
    onboarding_step: 0,
    settings: {
      language: user.preferences?.language || 'es',
      notifications: user.preferences?.notifications_enabled ?? true,
    },
  };

  const { data, error } = await supabase
    .from('nucleus_users')
    .insert(nucleusUser as never)
    .select()
    .single();

  if (error) throw error;

  // Return with extended fields
  return {
    ...(data as User),
    telegram_id: user.telegram_id,
    telegram_username: user.telegram_username,
    first_name: user.first_name,
    last_name: user.last_name,
  };
}

export async function updateUser(id: string, updates: UserUpdate): Promise<User> {
  const supabase = getSupabaseClient();

  const nucleusUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.first_name) nucleusUpdates.name = updates.first_name;
  if (updates.is_admin !== undefined) nucleusUpdates.role = updates.is_admin ? 'admin' : 'user';
  if (updates.preferences) {
    nucleusUpdates.settings = {
      language: updates.preferences.language || 'es',
      notifications: updates.preferences.notifications_enabled ?? true,
    };
  }

  const { data, error } = await supabase
    .from('nucleus_users')
    .update(nucleusUpdates as never)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as User;
}

export async function upsertUserByTelegramId(
  telegramId: number,
  userData: Omit<UserInsert, 'telegram_id'>
): Promise<User> {
  // Try to find existing user
  const existing = await getUserByTelegramId(telegramId);
  if (existing) {
    return updateUser(existing.id, userData);
  }

  // Create new user
  return createUser({ ...userData, telegram_id: telegramId });
}

export async function getActiveUsers(): Promise<User[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('nucleus_users')
    .select('*')
    .order('last_active', { ascending: false });

  if (error) {
    console.error('getActiveUsers error:', error);
    return [];
  }
  return data || [];
}

export async function getAdminUsers(): Promise<User[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('nucleus_users')
    .select('*')
    .eq('role', 'admin');

  if (error) {
    console.error('getAdminUsers error:', error);
    return [];
  }
  return data || [];
}

export async function getAllUsers(limit = 100): Promise<User[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('nucleus_users')
    .select('*')
    .limit(limit);

  if (error) {
    console.error('getAllUsers error:', error);
    return [];
  }
  return data || [];
}

// Class-based repository for compatibility with existing code
export const UsersRepository = {
  findById: getUserById,
  findByTelegramId: getUserByTelegramId,
  create: createUser,
  update: updateUser,
  upsert: upsertUserByTelegramId,
  getActive: getActiveUsers,
  getAdmins: getAdminUsers,
  findAll: getAllUsers,
};
