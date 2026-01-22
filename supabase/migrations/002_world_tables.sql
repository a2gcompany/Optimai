-- World View Tables
-- Additional tables for the 2D World dashboard

-- 1. Add current_building to ralph_status
ALTER TABLE ralph_status
ADD COLUMN IF NOT EXISTS current_building TEXT DEFAULT 'hq'
CHECK (current_building IN ('hq', 'taller', 'banco', 'biblioteca', 'torre'));

ALTER TABLE ralph_status
ADD COLUMN IF NOT EXISTS energy INTEGER DEFAULT 50;

-- 2. Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project TEXT NOT NULL DEFAULT 'Optimai',
  title TEXT NOT NULL,
  building TEXT NOT NULL DEFAULT 'taller',
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project, status);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(project, completed_at);

-- RLS for tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Allow insert tasks" ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update tasks" ON tasks FOR UPDATE USING (true);

-- 3. Finances table
CREATE TABLE IF NOT EXISTS finances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project TEXT NOT NULL DEFAULT 'Optimai',
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finances_project_date ON finances(project, created_at DESC);

-- RLS for finances
ALTER TABLE finances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read finances" ON finances FOR SELECT USING (true);
CREATE POLICY "Allow insert finances" ON finances FOR INSERT WITH CHECK (true);

-- 4. Ideas table
CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project TEXT NOT NULL DEFAULT 'Optimai',
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ideas_project ON ideas(project, created_at);

-- RLS for ideas
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read ideas" ON ideas FOR SELECT USING (true);
CREATE POLICY "Allow insert ideas" ON ideas FOR INSERT WITH CHECK (true);

-- 5. Reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project TEXT NOT NULL DEFAULT 'Optimai',
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'done')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminders_project_status ON reminders(project, status);

-- RLS for reminders
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read reminders" ON reminders FOR SELECT USING (true);
CREATE POLICY "Allow insert reminders" ON reminders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update reminders" ON reminders FOR UPDATE USING (true);

-- Comments
COMMENT ON TABLE tasks IS 'Tasks for World View taller building';
COMMENT ON TABLE finances IS 'Financial records for World View banco building';
COMMENT ON TABLE ideas IS 'Ideas for World View biblioteca building';
COMMENT ON TABLE reminders IS 'Reminders for World View torre building';

-- Insert initial data for Optimai project
INSERT INTO ralph_status (project, status, current_building, last_action, energy)
VALUES ('Optimai', 'idle', 'hq', 'Esperando instrucciones', 50)
ON CONFLICT (project) DO UPDATE SET
  current_building = COALESCE(ralph_status.current_building, 'hq'),
  energy = COALESCE(ralph_status.energy, 50);
