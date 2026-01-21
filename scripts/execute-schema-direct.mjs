import pg from 'pg';
import { readFileSync } from 'fs';

const { Client } = pg;

// Using the direct DATABASE_URL from .env.local
const DATABASE_URL = 'postgresql://postgres:tuDdex-3nekbi-tihsud@db.vhnfdknvwvyaepokaqlx.supabase.co:5432/postgres';

async function main() {
  console.log('Connecting to Supabase directly...\n');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected!\n');

    // Read and execute schema
    const schema = readFileSync('./packages/db/schema-optimai.sql', 'utf-8');

    // Split into individual statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Executing ${statements.length} statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.substring(0, 60).replace(/\n/g, ' ') + '...';

      try {
        await client.query(stmt);
        console.log(`✅ [${i + 1}/${statements.length}] ${preview}`);
      } catch (err) {
        // Skip errors for "already exists" type issues
        if (err.message.includes('already exists') || err.message.includes('duplicate key')) {
          console.log(`⏭️  [${i + 1}/${statements.length}] Skipped (exists): ${preview}`);
        } else {
          console.log(`❌ [${i + 1}/${statements.length}] Error: ${err.message}`);
        }
      }
    }

    console.log('\nDone!');

    // Verify tables exist
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'optimai_%'
    `);

    console.log('\n=== Optimai Tables ===');
    result.rows.forEach(r => console.log(`✅ ${r.table_name}`));

    // Check categories count
    const cats = await client.query('SELECT COUNT(*) FROM optimai_categories');
    console.log(`\nCategories: ${cats.rows[0].count}`);

  } catch (err) {
    console.error('Connection error:', err.message);
    console.error('Full error:', err);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
