-- Ralph Status Table
-- Stores real-time status from local Ralph instances for World View access
-- This allows Vercel to display Ralph's status even though Ralph runs locally

CREATE TABLE IF NOT EXISTS ralph_status (
  project TEXT PRIMARY KEY,                    -- Unique project identifier (e.g., "Optimai")
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  loop_count INTEGER NOT NULL DEFAULT 0,
  calls_made_this_hour INTEGER NOT NULL DEFAULT 0,
  max_calls_per_hour INTEGER NOT NULL DEFAULT 50,
  last_action TEXT NOT NULL DEFAULT 'idle',
  status TEXT NOT NULL DEFAULT 'stopped',
  exit_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups by project
CREATE INDEX IF NOT EXISTS idx_ralph_status_project ON ralph_status(project);

-- Index for checking recent status
CREATE INDEX IF NOT EXISTS idx_ralph_status_timestamp ON ralph_status(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE ralph_status ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (for World View)
CREATE POLICY "Allow public read access" ON ralph_status
  FOR SELECT USING (true);

-- Allow upsert with anon key (Ralph uses anon key to sync)
CREATE POLICY "Allow upsert for sync" ON ralph_status
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION update_ralph_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ralph_status_updated_at
  BEFORE UPDATE ON ralph_status
  FOR EACH ROW
  EXECUTE FUNCTION update_ralph_status_updated_at();

-- Comment on table
COMMENT ON TABLE ralph_status IS 'Real-time status from local Ralph instances, synced for World View access on Vercel';
