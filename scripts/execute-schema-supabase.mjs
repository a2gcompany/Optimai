import { readFileSync } from 'fs';

const PROJECT_REF = 'vhnfdknvwvyaepokaqlx';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobmZka252d3Z5YWVwb2thcWx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIyODI3NiwiZXhwIjoyMDgxODA0Mjc2fQ.TZSwDteF7Jw0gvI0Tk325ElNJvcixRDeMVCsgxK1JcA';

// Split SQL into individual statements and execute via PostgREST RPC
async function main() {
  console.log('Executing schema via direct table creation...\n');

  // Create tables via SQL - we'll use the Supabase client which has admin access
  const { createClient } = await import('@supabase/supabase-js');

  const supabase = createClient(
    `https://${PROJECT_REF}.supabase.co`,
    SERVICE_KEY,
    { auth: { persistSession: false } }
  );

  // Try to create each table individually using raw SQL
  // Since we can't execute DDL directly, let's verify by reading

  // First, let's just try inserting into tables to see if they exist
  const testInsert = await supabase.from('optimai_categories').select('id').limit(1);

  if (testInsert.error && testInsert.error.code === '42P01') {
    console.log('Tables do not exist. Printing SQL for manual execution...\n');
    console.log('='.repeat(60));
    console.log('EXECUTE THIS SQL IN SUPABASE DASHBOARD:');
    console.log('https://supabase.com/dashboard/project/vhnfdknvwvyaepokaqlx/sql/new');
    console.log('='.repeat(60));
    console.log();

    const schema = readFileSync('./packages/db/schema-optimai.sql', 'utf-8');
    console.log(schema);
  } else if (testInsert.error) {
    console.log('Error:', testInsert.error.message);
  } else {
    console.log('Tables already exist!');
  }
}

main().catch(console.error);
