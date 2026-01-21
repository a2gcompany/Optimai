// Script to execute schema.sql on Supabase
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function runSchema() {
  console.log('Reading schema.sql...');
  const schemaPath = join(__dirname, '../packages/db/schema.sql');
  const sql = readFileSync(schemaPath, 'utf-8');

  // Split into statements (handle $$ blocks carefully)
  const statements: string[] = [];
  let current = '';
  let inDollarBlock = false;

  for (const line of sql.split('\n')) {
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith('--') && !inDollarBlock) {
      continue;
    }

    current += line + '\n';

    // Track $$ blocks
    const dollarMatches = line.match(/\$\$/g);
    if (dollarMatches) {
      for (const _ of dollarMatches) {
        inDollarBlock = !inDollarBlock;
      }
    }

    // Statement end
    if (trimmed.endsWith(';') && !inDollarBlock) {
      const stmt = current.trim();
      if (stmt.length > 1) {
        statements.push(stmt);
      }
      current = '';
    }
  }

  console.log(`Found ${statements.length} SQL statements`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ');

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt });

      if (error) {
        // Try direct query for simpler statements
        const { error: error2 } = await supabase.from('_').select().limit(0);

        // Log but continue for expected errors
        if (error.message.includes('already exists') ||
            error.message.includes('duplicate key')) {
          console.log(`⏭️  [${i + 1}/${statements.length}] Skipped (exists): ${preview}...`);
          success++;
        } else {
          console.error(`❌ [${i + 1}/${statements.length}] Error: ${error.message}`);
          console.error(`   Statement: ${preview}...`);
          failed++;
        }
      } else {
        console.log(`✅ [${i + 1}/${statements.length}] ${preview}...`);
        success++;
      }
    } catch (e: any) {
      console.error(`❌ [${i + 1}/${statements.length}] Exception: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);
}

runSchema().catch(console.error);
