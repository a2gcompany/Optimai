import { getSupabaseClient } from '../client';
import type { Tables, InsertTables, UpdateTables } from '../types';

export type Category = Tables<'categories'>;
export type CategoryInsert = InsertTables<'categories'>;
export type CategoryUpdate = UpdateTables<'categories'>;

export type CategoryType = 'income' | 'expense' | 'both';

export async function getCategoryById(id: string): Promise<Category | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function getCategoriesByUser(userId: string): Promise<Category[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .or(`user_id.eq.${userId},is_system.eq.true`)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createCategory(category: CategoryInsert): Promise<Category> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('categories')
    .insert({
      ...category,
      type: category.type || 'expense',
      is_system: category.is_system || false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCategory(
  id: string,
  updates: CategoryUpdate
): Promise<Category> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('is_system', false);

  if (error) throw error;
}

export async function getSystemCategories(): Promise<Category[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_system', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getCategoriesByType(
  userId: string,
  type: CategoryType
): Promise<Category[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .or(`user_id.eq.${userId},is_system.eq.true`)
    .or(`type.eq.${type},type.eq.both`)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export const DEFAULT_CATEGORIES: Omit<CategoryInsert, 'user_id'>[] = [
  { name: 'Comida', icon: '🍽️', color: '#FF6B6B', type: 'expense', is_system: true },
  { name: 'Transporte', icon: '🚗', color: '#4ECDC4', type: 'expense', is_system: true },
  { name: 'Entretenimiento', icon: '🎬', color: '#45B7D1', type: 'expense', is_system: true },
  { name: 'Compras', icon: '🛒', color: '#96CEB4', type: 'expense', is_system: true },
  { name: 'Salud', icon: '🏥', color: '#FFEAA7', type: 'expense', is_system: true },
  { name: 'Educación', icon: '📚', color: '#DDA0DD', type: 'expense', is_system: true },
  { name: 'Servicios', icon: '💡', color: '#98D8C8', type: 'expense', is_system: true },
  { name: 'Salario', icon: '💰', color: '#7ED321', type: 'income', is_system: true },
  { name: 'Freelance', icon: '💻', color: '#50E3C2', type: 'income', is_system: true },
  { name: 'Inversiones', icon: '📈', color: '#F5A623', type: 'both', is_system: true },
  { name: 'Otros', icon: '📦', color: '#9B9B9B', type: 'both', is_system: true },
];
