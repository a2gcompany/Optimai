import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vhnfdknvwvyaepokaqlx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobmZka252d3Z5YWVwb2thcWx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIyODI3NiwiZXhwIjoyMDgxODA0Mjc2fQ.TZSwDteF7Jw0gvI0Tk325ElNJvcixRDeMVCsgxK1JcA';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function setupDatabase() {
  console.log('Setting up Optimai database tables...\n');

  // Create optimai_categories table
  console.log('1. Creating optimai_categories table...');
  const { error: catError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS optimai_categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID,
        name TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        parent_id UUID,
        type TEXT DEFAULT 'expense' CHECK (type IN ('income', 'expense', 'transfer')),
        is_system BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });
  if (catError) {
    console.log('  -> Using direct insert instead of exec_sql');
  }

  // Check if optimai_categories exists
  const { data: catCheck } = await supabase.from('optimai_categories').select('id').limit(1);
  if (catCheck === null) {
    console.log('  -> Table does not exist, will be created via SQL Editor');
  } else {
    console.log('  -> Table exists!');
  }

  // Seed default categories
  console.log('2. Seeding default categories...');
  const categories = [
    { id: '00000000-0000-0000-0001-000000000001', name: 'Salario', icon: 'banknotes', color: '#22c55e', type: 'income', is_system: true },
    { id: '00000000-0000-0000-0001-000000000002', name: 'Freelance', icon: 'briefcase', color: '#10b981', type: 'income', is_system: true },
    { id: '00000000-0000-0000-0001-000000000003', name: 'Inversiones', icon: 'trending-up', color: '#14b8a6', type: 'income', is_system: true },
    { id: '00000000-0000-0000-0001-000000000004', name: 'Alimentación', icon: 'utensils', color: '#f59e0b', type: 'expense', is_system: true },
    { id: '00000000-0000-0000-0001-000000000005', name: 'Transporte', icon: 'car', color: '#3b82f6', type: 'expense', is_system: true },
    { id: '00000000-0000-0000-0001-000000000006', name: 'Vivienda', icon: 'home', color: '#8b5cf6', type: 'expense', is_system: true },
    { id: '00000000-0000-0000-0001-000000000007', name: 'Entretenimiento', icon: 'gamepad-2', color: '#ec4899', type: 'expense', is_system: true },
    { id: '00000000-0000-0000-0001-000000000008', name: 'Salud', icon: 'heart-pulse', color: '#ef4444', type: 'expense', is_system: true },
    { id: '00000000-0000-0000-0001-000000000009', name: 'Educación', icon: 'graduation-cap', color: '#6366f1', type: 'expense', is_system: true },
    { id: '00000000-0000-0000-0001-000000000010', name: 'Suscripciones', icon: 'repeat', color: '#a855f7', type: 'expense', is_system: true },
    { id: '00000000-0000-0000-0001-000000000011', name: 'Otros', icon: 'more-horizontal', color: '#64748b', type: 'expense', is_system: true },
    { id: '00000000-0000-0000-0001-000000000012', name: 'Transferencia', icon: 'arrow-left-right', color: '#0ea5e9', type: 'transfer', is_system: true },
  ];

  for (const cat of categories) {
    const { error } = await supabase.from('optimai_categories').upsert(cat, { onConflict: 'id' });
    if (error && !error.message.includes('does not exist')) {
      console.log(`  -> Error seeding ${cat.name}:`, error.message);
    }
  }

  // Check optimai_transactions
  console.log('3. Checking optimai_transactions table...');
  const { data: txCheck, error: txErr } = await supabase.from('optimai_transactions').select('id').limit(1);
  if (txErr) {
    console.log('  -> Table does not exist:', txErr.message);
  } else {
    console.log('  -> Table exists!', txCheck?.length || 0, 'records');
  }

  // Check optimai_ideas
  console.log('4. Checking optimai_ideas table...');
  const { data: ideasCheck, error: ideasErr } = await supabase.from('optimai_ideas').select('id').limit(1);
  if (ideasErr) {
    console.log('  -> Table does not exist:', ideasErr.message);
  } else {
    console.log('  -> Table exists!', ideasCheck?.length || 0, 'records');
  }

  // Check reminders table (Nucleus)
  console.log('5. Checking reminders table (Nucleus)...');
  const { data: remCheck, error: remErr } = await supabase.from('reminders').select('id').limit(1);
  if (remErr) {
    console.log('  -> Table does not exist:', remErr.message);
  } else {
    console.log('  -> Table exists!', remCheck?.length || 0, 'records');
  }

  // Check dev_tasks table (Nucleus)
  console.log('6. Checking dev_tasks table (Nucleus)...');
  const { data: devCheck, error: devErr } = await supabase.from('dev_tasks').select('id').limit(5);
  if (devErr) {
    console.log('  -> Table does not exist:', devErr.message);
  } else {
    console.log('  -> Table exists!', devCheck?.length || 0, 'records found');
  }

  console.log('\n--- Database Setup Complete ---');
  console.log('\nIf tables are missing, run the SQL in packages/db/schema-optimai.sql via Supabase SQL Editor');
}

setupDatabase().catch(console.error);
