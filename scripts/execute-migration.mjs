#!/usr/bin/env node
/**
 * Execute Supabase migration via direct PostgreSQL connection
 */

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env
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
  console.log('No .env.ralph found');
}

// Supabase connection - extract project ref from URL
const supabaseUrl = process.env.SUPABASE_URL || '';
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('Could not extract project ref from SUPABASE_URL');
  process.exit(1);
}

// Try to get database URL or password
const databaseUrl = process.env.DATABASE_URL;
const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_PASSWORD;

if (!databaseUrl && !dbPassword) {
  console.log('');
  console.log('Need database connection. Provide one of:');
  console.log('');
  console.log('  DATABASE_URL="postgresql://..." node scripts/execute-migration.mjs');
  console.log('  SUPABASE_DB_PASSWORD="..." node scripts/execute-migration.mjs');
  console.log('');
  process.exit(1);
}

// Connection string from env or construct from password
const connectionString = databaseUrl ||
  `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║  Optimai Direct PostgreSQL Migration                   ║');
console.log('╚════════════════════════════════════════════════════════╝');
console.log('');
console.log(`Project: ${projectRef}`);
console.log('Connecting to Supabase PostgreSQL...');

const sql = postgres(connectionString, {
  ssl: 'require',
  max: 1,
  idle_timeout: 20,
  connect_timeout: 30,
});

async function runMigration() {
  try {
    // Read migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '004_terminals.sql');
    const migrationSql = readFileSync(migrationPath, 'utf-8');

    console.log('');
    console.log('Running migration: 004_terminals.sql');
    console.log('');

    // Split by statement (careful with $$ blocks)
    const statements = [];
    let current = '';
    let inDollarQuote = false;

    for (const line of migrationSql.split('\n')) {
      // Track $$ blocks
      const dollarMatches = (line.match(/\$\$/g) || []).length;
      if (dollarMatches % 2 === 1) {
        inDollarQuote = !inDollarQuote;
      }

      current += line + '\n';

      // Only split on ; if not in $$ block
      if (!inDollarQuote && line.trim().endsWith(';')) {
        const stmt = current.trim();
        if (stmt && !stmt.startsWith('--')) {
          statements.push(stmt);
        }
        current = '';
      }
    }

    // Execute each statement
    let success = 0;
    let skipped = 0;
    let errors = 0;

    for (const stmt of statements) {
      // Skip empty or comment-only
      if (!stmt || stmt.split('\n').every(l => l.trim().startsWith('--') || !l.trim())) {
        continue;
      }

      try {
        await sql.unsafe(stmt);
        const preview = stmt.split('\n')[0].substring(0, 60);
        console.log(`  ✓ ${preview}...`);
        success++;
      } catch (error) {
        if (error.message?.includes('already exists') ||
            error.message?.includes('duplicate key') ||
            error.message?.includes('does not exist')) {
          const preview = stmt.split('\n')[0].substring(0, 50);
          console.log(`  ○ Skipped: ${preview}... (already exists)`);
          skipped++;
        } else {
          console.error(`  ✗ Error: ${error.message}`);
          errors++;
        }
      }
    }

    console.log('');
    console.log(`Results: ${success} executed, ${skipped} skipped, ${errors} errors`);

    // Verify tables
    console.log('');
    console.log('Verifying tables...');

    const tables = ['pueblos', 'terminals', 'terminal_activity', 'pueblo_stats'];
    for (const table of tables) {
      try {
        const result = await sql`SELECT COUNT(*) as count FROM ${sql(table)}`;
        console.log(`  ✓ ${table}: ${result[0].count} rows`);
      } catch (e) {
        console.log(`  ✗ ${table}: ${e.message}`);
      }
    }

    // Check pueblos data
    console.log('');
    console.log('Checking pueblos...');
    const pueblos = await sql`SELECT owner_name, nombre FROM pueblos`;
    for (const p of pueblos) {
      console.log(`  - ${p.owner_name}: ${p.nombre}`);
    }

  } catch (error) {
    console.error('Migration failed:', error.message);

    if (error.message?.includes('password authentication failed')) {
      console.log('');
      console.log('Password incorrect. Get it from:');
      console.log('  Supabase Dashboard > Project Settings > Database > Connection string');
    }
  } finally {
    await sql.end();
  }
}

runMigration();
