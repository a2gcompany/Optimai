// Create ralph_status table in Supabase
// Run with: node scripts/create_ralph_status_table.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://vhnfdknvwvyaepokaqlx.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobmZka252d3Z5YWVwb2thcWx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIyODI3NiwiZXhwIjoyMDgxODA0Mjc2fQ.TZSwDteF7Jw0gvI0Tk325ElNJvcixRDeMVCsgxK1JcA';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

async function createTable() {
  console.log('Creating ralph_status table...');

  // Use rpc to execute raw SQL
  const { data, error } = await supabase.rpc('exec', {
    sql: `
      CREATE TABLE IF NOT EXISTS ralph_status (
        project TEXT PRIMARY KEY,
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
    `
  });

  if (error) {
    console.log('RPC exec not available, trying direct insert approach...');

    // Alternative: Try to insert a test record to see if table exists
    const { data: testData, error: testError } = await supabase
      .from('ralph_status')
      .select('project')
      .limit(1);

    if (testError && testError.code === 'PGRST205') {
      console.log('Table does not exist. Please create it manually via Supabase Dashboard:');
      console.log('');
      console.log('Go to: https://supabase.com/dashboard/project/vhnfdknvwvyaepokaqlx/sql');
      console.log('');
      console.log('Run this SQL:');
      console.log(`
CREATE TABLE IF NOT EXISTS ralph_status (
  project TEXT PRIMARY KEY,
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

-- Enable RLS
ALTER TABLE ralph_status ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "Allow public read" ON ralph_status FOR SELECT USING (true);

-- Allow upsert (for Ralph sync)
CREATE POLICY "Allow upsert" ON ralph_status FOR ALL USING (true) WITH CHECK (true);
      `);
      return;
    }

    console.log('Table already exists or accessible!');
  }

  // Test by inserting a record
  console.log('Testing table with insert...');
  const { error: insertError } = await supabase
    .from('ralph_status')
    .upsert({
      project: 'test',
      timestamp: new Date().toISOString(),
      loop_count: 0,
      calls_made_this_hour: 0,
      max_calls_per_hour: 50,
      last_action: 'test',
      status: 'test',
      exit_reason: ''
    }, { onConflict: 'project' });

  if (insertError) {
    console.error('Insert test failed:', insertError.message);
  } else {
    console.log('Table works! Cleaning up test record...');
    await supabase.from('ralph_status').delete().eq('project', 'test');
    console.log('Done!');
  }
}

createTable().catch(console.error);
