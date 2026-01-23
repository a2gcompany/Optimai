-- ============================================================================
-- Migration: 003_tasks_reminders.sql
-- Description: Unified Tasks & Reminders table
-- ============================================================================

-- Tabla unificada tasks_reminders
CREATE TABLE IF NOT EXISTS tasks_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- Contenido
  title TEXT NOT NULL,
  description TEXT,

  -- Tipo y estado
  type TEXT NOT NULL CHECK (type IN ('task', 'reminder')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Fechas
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Recurrencia (para reminders)
  recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT, -- 'daily', 'weekly', 'monthly', etc.

  -- Origen
  source TEXT DEFAULT 'manual', -- 'manual', 'import', 'telegram'
  source_file TEXT, -- nombre del archivo si fue importado

  -- Tags
  tags TEXT[] DEFAULT '{}'
);

-- Indices para optimizar queries
CREATE INDEX IF NOT EXISTS idx_tasks_reminders_user ON tasks_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_reminders_status ON tasks_reminders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_reminders_due ON tasks_reminders(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_reminders_type ON tasks_reminders(user_id, type);
CREATE INDEX IF NOT EXISTS idx_tasks_reminders_priority ON tasks_reminders(user_id, priority);

-- RLS Policy
ALTER TABLE tasks_reminders ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública (para desarrollo)
CREATE POLICY "Allow public read tasks_reminders" ON tasks_reminders
  FOR SELECT USING (true);

-- Política de escritura pública (para desarrollo)
CREATE POLICY "Allow public write tasks_reminders" ON tasks_reminders
  FOR ALL USING (true) WITH CHECK (true);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_tasks_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trigger_tasks_reminders_updated_at ON tasks_reminders;
CREATE TRIGGER trigger_tasks_reminders_updated_at
  BEFORE UPDATE ON tasks_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_reminders_updated_at();
