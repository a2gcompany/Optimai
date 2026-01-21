import pg from 'pg';
import { readFileSync } from 'fs';

const { Client } = pg;

// Use the DATABASE_URL from .env.local
const client = new Client({
  connectionString: 'postgresql://postgres:tuDdex-3nekbi-tihsud@db.vhnfdknvwvyaepokaqlx.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function executeSchema() {
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL\n');

    const schema = readFileSync('./packages/db/schema.sql', 'utf-8');

    // Split by statement and execute one by one to handle errors better
    const statements = schema.split(';').filter(s => s.trim().length > 0);

    console.log(`Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim() + ';';
      try {
        await client.query(stmt);
        // Show progress for important statements
        if (stmt.includes('CREATE TABLE') || stmt.includes('INSERT INTO categories')) {
          const match = stmt.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/i) ||
                       stmt.match(/INSERT INTO\s+(\w+)/i);
          if (match) {
            console.log(`  ✅ ${match[1]}`);
          }
        }
      } catch (err) {
        // Ignore "already exists" errors
        if (!err.message.includes('already exists') &&
            !err.message.includes('duplicate key')) {
          console.log(`  ⚠️  Statement ${i + 1}: ${err.message.slice(0, 100)}`);
        }
      }
    }

    console.log('\n✅ Schema executed!\n');

    // Verify tables
    const tables = ['users', 'tasks', 'reminders', 'categories', 'transactions', 'ideas', 'conversations', 'budgets', 'agent_tasks', 'user_patterns'];

    console.log('Verifying tables:');
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`  ✅ ${table}: ${result.rows[0].count} rows`);
      } catch (err) {
        console.log(`  ❌ ${table}: ${err.message}`);
      }
    }

  } catch (err) {
    console.error('Connection Error:', err.message);
  } finally {
    await client.end();
  }
}

executeSchema();
