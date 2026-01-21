import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for database tables
export interface DbUser {
  id: string;
  telegram_id: number;
  telegram_username: string | null;
  first_name: string;
  last_name: string | null;
  email: string | null;
  is_active: boolean;
  is_admin: boolean;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbTask {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  completed_at: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface DbReminder {
  id: string;
  user_id: string;
  message: string;
  scheduled_at: string;
  sent_at: string | null;
  telegram_chat_id: number;
  is_recurring: boolean;
  recurrence_pattern: Record<string, unknown> | null;
  created_at: string;
}

export interface DbTransaction {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  type: 'income' | 'expense' | 'transfer';
  category_id: string | null;
  description: string | null;
  date: string;
  source: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface DbCategory {
  id: string;
  user_id: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  parent_id: string | null;
  type: 'income' | 'expense' | 'transfer';
  is_system: boolean;
  created_at: string;
}

export interface DbIdea {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: 'feature' | 'improvement' | 'bugfix' | 'research' | 'other';
  status: 'backlog' | 'evaluating' | 'planned' | 'in_progress' | 'done' | 'rejected';
  priority: number;
  effort: 'xs' | 's' | 'm' | 'l' | 'xl' | null;
  impact: 'low' | 'medium' | 'high' | 'critical' | null;
  tags: string[];
  links: unknown[];
  notes: string | null;
  votes: number;
  created_at: string;
  updated_at: string;
}
