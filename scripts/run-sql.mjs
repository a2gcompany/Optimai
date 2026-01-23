#!/usr/bin/env node
/**
 * Execute SQL directly - simpler version
 */

import postgres from 'postgres';
import { readFileSync } from 'fs';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

console.log('Connecting...');

const sql = postgres(connectionString, {
  ssl: 'require',
  max: 1,
  idle_timeout: 20,
  connect_timeout: 30,
});

async function run() {
  try {
    // Create pueblos table
    console.log('Creating pueblos table...');
    await sql`
      CREATE TABLE IF NOT EXISTS pueblos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre TEXT NOT NULL,
        owner_id UUID,
        owner_name TEXT NOT NULL,
        avatar_emoji TEXT DEFAULT '👤',
        color_primary TEXT DEFAULT '#3b82f6',
        color_secondary TEXT DEFAULT '#1e40af',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT pueblos_owner_name_key UNIQUE (owner_name)
      )
    `;
    console.log('  ✓ pueblos');

    // Create terminals table
    console.log('Creating terminals table...');
    await sql`
      CREATE TABLE IF NOT EXISTS terminals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pueblo_id UUID REFERENCES pueblos(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        client_type TEXT NOT NULL,
        session_id TEXT NOT NULL,
        machine_id TEXT,
        status TEXT NOT NULL DEFAULT 'offline',
        current_task TEXT,
        current_file TEXT,
        speech_bubble TEXT,
        tasks_completed INTEGER DEFAULT 0,
        lines_written INTEGER DEFAULT 0,
        energy INTEGER DEFAULT 100,
        last_heartbeat TIMESTAMPTZ DEFAULT now(),
        ip_address INET,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT unique_session UNIQUE (pueblo_id, session_id)
      )
    `;
    console.log('  ✓ terminals');

    // Create terminal_activity table
    console.log('Creating terminal_activity table...');
    await sql`
      CREATE TABLE IF NOT EXISTS terminal_activity (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        terminal_id UUID REFERENCES terminals(id) ON DELETE CASCADE,
        pueblo_id UUID REFERENCES pueblos(id) ON DELETE CASCADE,
        action_type TEXT NOT NULL,
        description TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `;
    console.log('  ✓ terminal_activity');

    // Create pueblo_stats table
    console.log('Creating pueblo_stats table...');
    await sql`
      CREATE TABLE IF NOT EXISTS pueblo_stats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pueblo_id UUID UNIQUE REFERENCES pueblos(id) ON DELETE CASCADE,
        terminals_active INTEGER DEFAULT 0,
        terminals_total INTEGER DEFAULT 0,
        tasks_pending INTEGER DEFAULT 0,
        tasks_completed_today INTEGER DEFAULT 0,
        tasks_completed_total INTEGER DEFAULT 0,
        energy_current INTEGER DEFAULT 100,
        energy_max INTEGER DEFAULT 100,
        coins_total INTEGER DEFAULT 0,
        coins_today INTEGER DEFAULT 0,
        streak_days INTEGER DEFAULT 0,
        ralph_state TEXT DEFAULT 'idle',
        ralph_last_seen TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `;
    console.log('  ✓ pueblo_stats');

    // Insert default pueblos
    console.log('Inserting default pueblos...');
    await sql`
      INSERT INTO pueblos (nombre, owner_name, avatar_emoji, color_primary, color_secondary)
      VALUES
        ('Pueblo de Aitzol', 'Aitzol', '👨‍💻', '#3b82f6', '#1e40af'),
        ('Pueblo de Sergi', 'Sergi', '🧑‍💻', '#10b981', '#047857'),
        ('Pueblo de Alvaro', 'Alvaro', '👩‍💻', '#f59e0b', '#d97706')
      ON CONFLICT (owner_name) DO NOTHING
    `;
    console.log('  ✓ default pueblos inserted');

    // Initialize pueblo_stats
    console.log('Initializing pueblo_stats...');
    await sql`
      INSERT INTO pueblo_stats (pueblo_id)
      SELECT id FROM pueblos
      ON CONFLICT (pueblo_id) DO NOTHING
    `;
    console.log('  ✓ pueblo_stats initialized');

    // Enable RLS
    console.log('Enabling RLS...');
    await sql`ALTER TABLE pueblos ENABLE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE terminals ENABLE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE terminal_activity ENABLE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE pueblo_stats ENABLE ROW LEVEL SECURITY`;
    console.log('  ✓ RLS enabled');

    // Create policies
    console.log('Creating policies...');
    try {
      await sql`CREATE POLICY "public_read_pueblos" ON pueblos FOR SELECT USING (true)`;
      await sql`CREATE POLICY "public_all_pueblos" ON pueblos FOR ALL USING (true)`;
    } catch (e) { if (!e.message.includes('already exists')) throw e; }

    try {
      await sql`CREATE POLICY "public_read_terminals" ON terminals FOR SELECT USING (true)`;
      await sql`CREATE POLICY "public_all_terminals" ON terminals FOR ALL USING (true)`;
    } catch (e) { if (!e.message.includes('already exists')) throw e; }

    try {
      await sql`CREATE POLICY "public_read_activity" ON terminal_activity FOR SELECT USING (true)`;
      await sql`CREATE POLICY "public_insert_activity" ON terminal_activity FOR INSERT WITH CHECK (true)`;
    } catch (e) { if (!e.message.includes('already exists')) throw e; }

    try {
      await sql`CREATE POLICY "public_read_stats" ON pueblo_stats FOR SELECT USING (true)`;
      await sql`CREATE POLICY "public_all_stats" ON pueblo_stats FOR ALL USING (true)`;
    } catch (e) { if (!e.message.includes('already exists')) throw e; }

    console.log('  ✓ policies created');

    // Verify
    console.log('\nVerifying...');
    const pueblos = await sql`SELECT owner_name FROM pueblos`;
    console.log(`  Pueblos: ${pueblos.map(p => p.owner_name).join(', ')}`);

    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('pueblos', 'terminals', 'terminal_activity', 'pueblo_stats')
    `;
    console.log(`  Tables: ${tables.map(t => t.table_name).join(', ')}`);

    console.log('\n✅ Migration complete!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sql.end();
  }
}

run();
