-- =============================================================================
-- Optimai Database Schema - Compatible with existing Nucleus tables
-- Execute this in Supabase SQL Editor
-- =============================================================================

-- Enable UUID extension (likely already exists)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- OPTIMAI TASKS TABLE (separate from dev_tasks)
-- =============================================================================
CREATE TABLE IF NOT EXISTS optimai_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_optimai_tasks_user_id ON optimai_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_optimai_tasks_status ON optimai_tasks(status);

-- =============================================================================
-- OPTIMAI CATEGORIES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS optimai_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    parent_id UUID REFERENCES optimai_categories(id) ON DELETE SET NULL,
    type TEXT DEFAULT 'expense' CHECK (type IN ('income', 'expense', 'transfer')),
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_optimai_categories_user_id ON optimai_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_optimai_categories_type ON optimai_categories(type);

-- =============================================================================
-- OPTIMAI TRANSACTIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS optimai_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    category_id UUID REFERENCES optimai_categories(id) ON DELETE SET NULL,
    description TEXT,
    date DATE NOT NULL,
    source JSONB DEFAULT '{}',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_optimai_transactions_user_id ON optimai_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_optimai_transactions_date ON optimai_transactions(date);

-- =============================================================================
-- OPTIMAI IDEAS TABLE (Ideas Canvas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS optimai_ideas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'feature' CHECK (category IN ('feature', 'improvement', 'bugfix', 'research', 'other')),
    status TEXT DEFAULT 'backlog' CHECK (status IN ('backlog', 'evaluating', 'planned', 'in_progress', 'done', 'rejected')),
    priority INTEGER DEFAULT 0,
    effort TEXT CHECK (effort IN ('xs', 's', 'm', 'l', 'xl')),
    impact TEXT CHECK (impact IN ('low', 'medium', 'high', 'critical')),
    tags TEXT[] DEFAULT '{}',
    links JSONB DEFAULT '[]',
    notes TEXT,
    votes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_optimai_ideas_user_id ON optimai_ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_optimai_ideas_status ON optimai_ideas(status);
CREATE INDEX IF NOT EXISTS idx_optimai_ideas_priority ON optimai_ideas(priority DESC);

-- =============================================================================
-- SEED DEFAULT CATEGORIES
-- =============================================================================
INSERT INTO optimai_categories (id, user_id, name, icon, color, type, is_system) VALUES
    ('00000000-0000-0000-0001-000000000001', NULL, 'Salario', 'banknotes', '#22c55e', 'income', true),
    ('00000000-0000-0000-0001-000000000002', NULL, 'Freelance', 'briefcase', '#10b981', 'income', true),
    ('00000000-0000-0000-0001-000000000003', NULL, 'Inversiones', 'trending-up', '#14b8a6', 'income', true),
    ('00000000-0000-0000-0001-000000000004', NULL, 'Alimentación', 'utensils', '#f59e0b', 'expense', true),
    ('00000000-0000-0000-0001-000000000005', NULL, 'Transporte', 'car', '#3b82f6', 'expense', true),
    ('00000000-0000-0000-0001-000000000006', NULL, 'Vivienda', 'home', '#8b5cf6', 'expense', true),
    ('00000000-0000-0000-0001-000000000007', NULL, 'Entretenimiento', 'gamepad-2', '#ec4899', 'expense', true),
    ('00000000-0000-0000-0001-000000000008', NULL, 'Salud', 'heart-pulse', '#ef4444', 'expense', true),
    ('00000000-0000-0000-0001-000000000009', NULL, 'Educación', 'graduation-cap', '#6366f1', 'expense', true),
    ('00000000-0000-0000-0001-000000000010', NULL, 'Suscripciones', 'repeat', '#a855f7', 'expense', true),
    ('00000000-0000-0000-0001-000000000011', NULL, 'Otros', 'more-horizontal', '#64748b', 'expense', true),
    ('00000000-0000-0000-0001-000000000012', NULL, 'Transferencia', 'arrow-left-right', '#0ea5e9', 'transfer', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- ENABLE RLS (Row Level Security)
-- =============================================================================
ALTER TABLE optimai_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimai_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimai_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimai_ideas ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access optimai_tasks" ON optimai_tasks FOR ALL USING (true);
CREATE POLICY "Service role full access optimai_categories" ON optimai_categories FOR ALL USING (true);
CREATE POLICY "Service role full access optimai_transactions" ON optimai_transactions FOR ALL USING (true);
CREATE POLICY "Service role full access optimai_ideas" ON optimai_ideas FOR ALL USING (true);
