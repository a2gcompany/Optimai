-- =============================================================================
-- Optimai Database Schema
-- Execute this in Supabase SQL Editor
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- USERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT UNIQUE NOT NULL,
    telegram_username TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;

-- =============================================================================
-- CONVERSATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    telegram_chat_id BIGINT NOT NULL,
    messages JSONB DEFAULT '[]',
    context JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_chat_id ON conversations(telegram_chat_id);

-- =============================================================================
-- TASKS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- =============================================================================
-- REMINDERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    telegram_chat_id BIGINT NOT NULL,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_at ON reminders(scheduled_at) WHERE sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reminders_pending ON reminders(scheduled_at) WHERE sent_at IS NULL;

-- =============================================================================
-- CATEGORIES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    type TEXT DEFAULT 'expense' CHECK (type IN ('income', 'expense', 'transfer')),
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);

-- =============================================================================
-- TRANSACTIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    description TEXT,
    date DATE NOT NULL,
    source JSONB DEFAULT '{}',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- =============================================================================
-- BUDGETS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    period TEXT DEFAULT 'monthly' CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE,
    alerts_enabled BOOLEAN DEFAULT true,
    alert_threshold INTEGER DEFAULT 80 CHECK (alert_threshold BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id);

-- =============================================================================
-- AGENT TASKS TABLE (for background processing)
-- =============================================================================
CREATE TABLE IF NOT EXISTS agent_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    payload JSONB DEFAULT '{}',
    result JSONB,
    error TEXT,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_type ON agent_tasks(type);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_pending ON agent_tasks(created_at) WHERE status = 'pending';

-- =============================================================================
-- IDEAS TABLE (Ideas Canvas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ideas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_category ON ideas(category);
CREATE INDEX IF NOT EXISTS idx_ideas_priority ON ideas(priority DESC);

-- =============================================================================
-- USER PATTERNS TABLE (for AI learning)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pattern TEXT NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    confidence DECIMAL(3, 2) DEFAULT 1.0,
    usage_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, pattern)
);

CREATE INDEX IF NOT EXISTS idx_user_patterns_user ON user_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_user_patterns_pattern ON user_patterns(pattern);

-- =============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
DO $$
BEGIN
    -- Users
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Conversations
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_conversations_updated_at') THEN
        CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Tasks
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tasks_updated_at') THEN
        CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Transactions
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_transactions_updated_at') THEN
        CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Budgets
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_budgets_updated_at') THEN
        CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Ideas
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_ideas_updated_at') THEN
        CREATE TRIGGER update_ideas_updated_at BEFORE UPDATE ON ideas
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- User Patterns
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_patterns_updated_at') THEN
        CREATE TRIGGER update_user_patterns_updated_at BEFORE UPDATE ON user_patterns
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role has full access to users" ON users
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access to conversations" ON conversations
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access to tasks" ON tasks
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access to reminders" ON reminders
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access to categories" ON categories
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access to transactions" ON transactions
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access to budgets" ON budgets
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access to ideas" ON ideas
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access to user_patterns" ON user_patterns
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access to agent_tasks" ON agent_tasks
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- SEED DEFAULT CATEGORIES
-- =============================================================================
INSERT INTO categories (id, user_id, name, icon, color, type, is_system) VALUES
    ('00000000-0000-0000-0000-000000000001', NULL, 'Salario', 'banknotes', '#22c55e', 'income', true),
    ('00000000-0000-0000-0000-000000000002', NULL, 'Freelance', 'briefcase', '#10b981', 'income', true),
    ('00000000-0000-0000-0000-000000000003', NULL, 'Inversiones', 'trending-up', '#14b8a6', 'income', true),
    ('00000000-0000-0000-0000-000000000004', NULL, 'Alimentación', 'utensils', '#f59e0b', 'expense', true),
    ('00000000-0000-0000-0000-000000000005', NULL, 'Transporte', 'car', '#3b82f6', 'expense', true),
    ('00000000-0000-0000-0000-000000000006', NULL, 'Vivienda', 'home', '#8b5cf6', 'expense', true),
    ('00000000-0000-0000-0000-000000000007', NULL, 'Entretenimiento', 'gamepad-2', '#ec4899', 'expense', true),
    ('00000000-0000-0000-0000-000000000008', NULL, 'Salud', 'heart-pulse', '#ef4444', 'expense', true),
    ('00000000-0000-0000-0000-000000000009', NULL, 'Educación', 'graduation-cap', '#6366f1', 'expense', true),
    ('00000000-0000-0000-0000-000000000010', NULL, 'Suscripciones', 'repeat', '#a855f7', 'expense', true),
    ('00000000-0000-0000-0000-000000000011', NULL, 'Otros', 'more-horizontal', '#64748b', 'expense', true),
    ('00000000-0000-0000-0000-000000000012', NULL, 'Transferencia', 'arrow-left-right', '#0ea5e9', 'transfer', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- DONE
-- =============================================================================
