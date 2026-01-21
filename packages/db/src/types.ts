// =============================================================================
// Database types for Supabase - Auto-generated compatible schema
// =============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          telegram_id: number;
          telegram_username: string | null;
          first_name: string;
          last_name: string | null;
          email: string | null;
          is_active: boolean;
          is_admin: boolean;
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          telegram_id: number;
          telegram_username?: string | null;
          first_name: string;
          last_name?: string | null;
          email?: string | null;
          is_active?: boolean;
          is_admin?: boolean;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          telegram_id?: number;
          telegram_username?: string | null;
          first_name?: string;
          last_name?: string | null;
          email?: string | null;
          is_active?: boolean;
          is_admin?: boolean;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          telegram_chat_id: number;
          messages: Json;
          context: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          telegram_chat_id: number;
          messages?: Json;
          context?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          telegram_chat_id?: number;
          messages?: Json;
          context?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          status: string;
          priority: string;
          due_date: string | null;
          completed_at: string | null;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          status?: string;
          priority?: string;
          due_date?: string | null;
          completed_at?: string | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          status?: string;
          priority?: string;
          due_date?: string | null;
          completed_at?: string | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      reminders: {
        Row: {
          id: string;
          user_id: string;
          message: string;
          scheduled_at: string;
          sent_at: string | null;
          telegram_chat_id: number;
          is_recurring: boolean;
          recurrence_pattern: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          message: string;
          scheduled_at: string;
          sent_at?: string | null;
          telegram_chat_id: number;
          is_recurring?: boolean;
          recurrence_pattern?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          message?: string;
          scheduled_at?: string;
          sent_at?: string | null;
          telegram_chat_id?: number;
          is_recurring?: boolean;
          recurrence_pattern?: Json | null;
          created_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          currency: string;
          type: string;
          category_id: string | null;
          description: string | null;
          date: string;
          source: Json;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          currency?: string;
          type: string;
          category_id?: string | null;
          description?: string | null;
          date: string;
          source?: Json;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          currency?: string;
          type?: string;
          category_id?: string | null;
          description?: string | null;
          date?: string;
          source?: Json;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string | null;
          color: string | null;
          parent_id: string | null;
          type: string;
          is_system: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon?: string | null;
          color?: string | null;
          parent_id?: string | null;
          type?: string;
          is_system?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          icon?: string | null;
          color?: string | null;
          parent_id?: string | null;
          type?: string;
          is_system?: boolean;
          created_at?: string;
        };
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          amount: number;
          period: string;
          start_date: string;
          end_date: string | null;
          alerts_enabled: boolean;
          alert_threshold: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          amount: number;
          period?: string;
          start_date: string;
          end_date?: string | null;
          alerts_enabled?: boolean;
          alert_threshold?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string;
          amount?: number;
          period?: string;
          start_date?: string;
          end_date?: string | null;
          alerts_enabled?: boolean;
          alert_threshold?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      agent_tasks: {
        Row: {
          id: string;
          type: string;
          status: string;
          payload: Json;
          result: Json | null;
          error: string | null;
          attempts: number;
          max_attempts: number;
          created_at: string;
          started_at: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          type: string;
          status?: string;
          payload?: Json;
          result?: Json | null;
          error?: string | null;
          attempts?: number;
          max_attempts?: number;
          created_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          type?: string;
          status?: string;
          payload?: Json;
          result?: Json | null;
          error?: string | null;
          attempts?: number;
          max_attempts?: number;
          created_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
        };
      };
      ideas: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          category: string;
          status: string;
          priority: number;
          effort: string | null;
          impact: string | null;
          tags: string[];
          links: Json;
          notes: string | null;
          votes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          category?: string;
          status?: string;
          priority?: number;
          effort?: string | null;
          impact?: string | null;
          tags?: string[];
          links?: Json;
          notes?: string | null;
          votes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          category?: string;
          status?: string;
          priority?: number;
          effort?: string | null;
          impact?: string | null;
          tags?: string[];
          links?: Json;
          notes?: string | null;
          votes?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_patterns: {
        Row: {
          id: string;
          user_id: string;
          pattern: string;
          category_id: string | null;
          confidence: number;
          usage_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          pattern: string;
          category_id?: string | null;
          confidence?: number;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          pattern?: string;
          category_id?: string | null;
          confidence?: number;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
