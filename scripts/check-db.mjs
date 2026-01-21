import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vhnfdknvwvyaepokaqlx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobmZka252d3Z5YWVwb2thcWx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIyODI3NiwiZXhwIjoyMDgxODA0Mjc2fQ.TZSwDteF7Jw0gvI0Tk325ElNJvcixRDeMVCsgxK1JcA'
);

async function checkTables() {
  console.log('Checking Supabase tables...\n');
  
  const tables = ['users', 'tasks', 'reminders', 'categories', 'transactions', 'ideas', 'conversations', 'budgets', 'agent_tasks', 'user_patterns'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`✅ ${table}: EXISTS (${data.length} rows found)`);
    }
  }
}

checkTables();
