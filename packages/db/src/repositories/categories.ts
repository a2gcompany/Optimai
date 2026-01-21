// Categories are stored in-memory since optimai_categories table doesn't exist

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
  color: string;
  icon: string;
  is_system: boolean;
  user_id: string | null;
  parent_id: string | null;
  created_at: string;
}

export interface CategoryInsert {
  name: string;
  type?: 'income' | 'expense' | 'both';
  color?: string;
  icon?: string;
  is_system?: boolean;
  user_id?: string | null;
  parent_id?: string | null;
}

export type CategoryUpdate = Partial<CategoryInsert>;

export type CategoryType = 'income' | 'expense' | 'both';

// Default categories
const defaultCategories: Category[] = [
  { id: 'cat-1', name: 'Salario', type: 'income', color: '#22c55e', icon: 'banknotes', is_system: true, user_id: null, parent_id: null, created_at: new Date().toISOString() },
  { id: 'cat-2', name: 'Freelance', type: 'income', color: '#10b981', icon: 'briefcase', is_system: true, user_id: null, parent_id: null, created_at: new Date().toISOString() },
  { id: 'cat-3', name: 'Inversiones', type: 'both', color: '#14b8a6', icon: 'trending-up', is_system: true, user_id: null, parent_id: null, created_at: new Date().toISOString() },
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
  { id: 'cat-14', name: 'Otros', type: 'both', color: '#64748b', icon: 'more-horizontal', is_system: true, user_id: null, parent_id: null, created_at: new Date().toISOString() },
];

// In-memory storage
const categoriesCache = new Map<string, Category>();

function initCategories(): void {
  if (categoriesCache.size > 0) return;
  for (const cat of defaultCategories) {
    categoriesCache.set(cat.id, cat);
  }
}

export async function getCategoryById(id: string): Promise<Category | null> {
  initCategories();
  return categoriesCache.get(id) || null;
}

export async function getCategoriesByUser(userId: string): Promise<Category[]> {
  initCategories();
  return Array.from(categoriesCache.values()).filter(
    c => c.is_system || c.user_id === userId
  );
}

export async function createCategory(category: CategoryInsert): Promise<Category> {
  initCategories();

  const newCat: Category = {
    id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: category.name,
    type: category.type || 'expense',
    color: category.color || '#64748b',
    icon: category.icon || 'tag',
    is_system: category.is_system || false,
    user_id: category.user_id || null,
    parent_id: category.parent_id || null,
    created_at: new Date().toISOString(),
  };

  categoriesCache.set(newCat.id, newCat);
  return newCat;
}

export async function updateCategory(
  id: string,
  updates: CategoryUpdate
): Promise<Category> {
  initCategories();

  const existing = categoriesCache.get(id);
  if (!existing) {
    throw new Error('Category not found');
  }

  const updated: Category = {
    ...existing,
    ...updates,
  };

  categoriesCache.set(id, updated);
  return updated;
}

export async function deleteCategory(id: string): Promise<void> {
  const cat = categoriesCache.get(id);
  if (cat && !cat.is_system) {
    categoriesCache.delete(id);
  }
}

export async function getSystemCategories(): Promise<Category[]> {
  initCategories();
  return Array.from(categoriesCache.values()).filter(c => c.is_system);
}

export async function getCategoriesByType(
  userId: string,
  type: CategoryType
): Promise<Category[]> {
  initCategories();
  return Array.from(categoriesCache.values()).filter(
    c => (c.is_system || c.user_id === userId) && (c.type === type || c.type === 'both')
  );
}

export async function getAllCategories(): Promise<Category[]> {
  initCategories();
  return Array.from(categoriesCache.values());
}

export const DEFAULT_CATEGORIES = defaultCategories.map(c => ({
  name: c.name,
  icon: c.icon,
  color: c.color,
  type: c.type,
  is_system: c.is_system,
}));

// Class-based repository for compatibility
export const CategoriesRepository = {
  findById: getCategoryById,
  findByUserId: getCategoriesByUser,
  create: createCategory,
  update: updateCategory,
  delete: deleteCategory,
  getSystem: getSystemCategories,
  getByType: getCategoriesByType,
  getAll: getAllCategories,
};
