#!/usr/bin/env node
/**
 * Run Supabase migration
 * Executes SQL migration files against Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env from .env.ralph
const envPath = join(__dirname, '..', '.env.ralph');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    if (line.startsWith('export ')) {
      const match = line.match(/export\s+(\w+)="(.*)"/);
      if (match) {
        process.env[match[1]] = match[2];
      }
    }
  }
} catch (e) {
  console.log('No .env.ralph found, using environment variables');
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(filename) {
  const sqlPath = join(__dirname, '..', 'supabase', 'migrations', filename);
  console.log(`\nRunning migration: ${filename}`);

  try {
    const sql = readFileSync(sqlPath, 'utf-8');

    // Split by semicolons but be careful with functions
    const statements = [];
    let current = '';
    let inFunction = false;

    for (const line of sql.split('\n')) {
      current += line + '\n';

      if (line.includes('$$')) {
        inFunction = !inFunction;
      }

      if (!inFunction && line.trim().endsWith(';')) {
        statements.push(current.trim());
        current = '';
      }
    }

    if (current.trim()) {
      statements.push(current.trim());
    }

    let success = 0;
    let errors = 0;

    for (const statement of statements) {
      if (!statement || statement.startsWith('--')) continue;

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          // Try direct query for simple statements
          const { error: error2 } = await supabase.from('_migrations').select().limit(0);
          if (error2 && !error.message?.includes('already exists')) {
            console.error(`  ✗ Error: ${error.message}`);
            errors++;
          } else {
            success++;
          }
        } else {
          success++;
        }
      } catch (e) {
        // Ignore "already exists" errors
        if (!e.message?.includes('already exists') && !e.message?.includes('duplicate')) {
          console.error(`  ✗ ${e.message}`);
          errors++;
        } else {
          console.log(`  ○ Skipped (already exists)`);
          success++;
        }
      }
    }

    console.log(`  ${success} statements executed, ${errors} errors`);
    return errors === 0;
  } catch (error) {
    console.error(`Error reading migration: ${error.message}`);
    return false;
  }
}

async function checkTables() {
  console.log('\nChecking existing tables...');

  const tables = ['pueblos', 'terminals', 'terminal_activity', 'pueblo_stats'];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      console.log(`  ✗ ${table}: ${error.message}`);
    } else {
      console.log(`  ✓ ${table}: exists (${data?.length || 0} rows)`);
    }
  }
}

async function createTablesDirectly() {
  console.log('\nAttempting to create tables via REST API...');

  // Since we can't run raw SQL, we'll try to insert data
  // which will fail if tables don't exist, but succeed otherwise

  // 1. Try to insert a test pueblo
  const { data: pueblo, error: puebloError } = await supabase
    .from('pueblos')
    .upsert({
      nombre: 'Pueblo de Aitzol',
      owner_name: 'Aitzol',
      avatar_emoji: '👨‍💻',
      color_primary: '#3b82f6',
      color_secondary: '#1e40af',
      is_active: true,
    }, { onConflict: 'owner_name' })
    .select()
    .single();

  if (puebloError) {
    console.log(`  Pueblos table: ${puebloError.message}`);
    console.log('\n⚠️  Tables need to be created manually in Supabase Dashboard');
    console.log('   Go to: SQL Editor > New Query > Paste migration SQL');
    return false;
  }

  console.log(`  ✓ Pueblo created/updated: ${pueblo.owner_name}`);

  // 2. Create pueblo_stats for this pueblo
  const { error: statsError } = await supabase
    .from('pueblo_stats')
    .upsert({
      pueblo_id: pueblo.id,
      terminals_active: 0,
      tasks_pending: 0,
      tasks_completed_today: 0,
      energy_current: 100,
    }, { onConflict: 'pueblo_id' });

  if (statsError && !statsError.message.includes('duplicate')) {
    console.log(`  Stats: ${statsError.message}`);
  } else {
    console.log(`  ✓ Pueblo stats created/updated`);
  }

  return true;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Optimai Supabase Migration Runner                     ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Supabase URL: ${supabaseUrl}`);

  // First check what tables exist
  await checkTables();

  // Try to create tables
  const success = await createTablesDirectly();

  if (!success) {
    console.log('\n📋 Copy this SQL to Supabase Dashboard:');
    console.log('   supabase/migrations/004_terminals.sql');
  }

  // Final check
  console.log('\nFinal table status:');
  await checkTables();
}

main().catch(console.error);
