import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vhnfdknvwvyaepokaqlx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobmZka252d3Z5YWVwb2thcWx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIyODI3NiwiZXhwIjoyMDgxODA0Mjc2fQ.TZSwDteF7Jw0gvI0Tk325ElNJvcixRDeMVCsgxK1JcA';
const databaseUrl = 'postgresql://postgres:tuDdex-3nekbi-tihsud@db.vhnfdknvwvyaepokaqlx.supabase.co:5432/postgres';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

const schema = `
-- Optimai Categories
CREATE TABLE IF NOT EXISTS optimai_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    parent_id UUID REFERENCES optimai_categories(id) ON DELETE SET NULL,
    type TEXT DEFAULT 'expense' CHECK (type IN ('income', 'expense', 'transfer')),
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optimai Transactions
CREATE TABLE IF NOT EXISTS optimai_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    category_id UUID REFERENCES optimai_categories(id) ON DELETE SET NULL,
    description TEXT,
    date DATE NOT NULL,
    source JSONB DEFAULT '{}',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optimai Ideas
CREATE TABLE IF NOT EXISTS optimai_ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'feature' CHECK (category IN ('feature', 'improvement', 'bugfix', 'research', 'other')),
    status TEXT DEFAULT 'backlog' CHECK (status IN ('backlog', 'evaluating', 'planned', 'in_progress', 'done', 'rejected')),
    priority INTEGER DEFAULT 0,
    effort TEXT CHECK (effort IN ('xs', 's', 'm', 'l', 'xl')),
    impact TEXT CHECK (impact IN ('low', 'medium', 'high', 'critical')),
    tags TEXT[] DEFAULT '{}',
    links JSONB DEFAULT '[]',
    notes TEXT,
    votes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_optimai_transactions_date ON optimai_transactions(date);
CREATE INDEX IF NOT EXISTS idx_optimai_ideas_status ON optimai_ideas(status);
CREATE INDEX IF NOT EXISTS idx_optimai_ideas_priority ON optimai_ideas(priority DESC);
`;

async function executeSQL() {
  // Using pg directly is best but let's try via fetch to management API
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({ sql: schema })
  });

  if (!response.ok) {
    console.log('RPC not available, trying alternative method...');
    // The exec_sql function doesn't exist, need to use psql or SQL Editor
    // Let's write a simpler approach - check each table and seed data
    await seedData();
    return;
  }

  console.log('Schema executed successfully');
}

async function seedData() {
  console.log('Attempting to seed data into existing tables...\n');

  // Test if tables exist by trying to insert
  const testCategory = {
    id: '00000000-0000-0000-0001-000000000001',
    name: 'Test',
    type: 'income',
    is_system: true
  };

  const { error: catError } = await supabase.from('optimai_categories').select('id').limit(1);

  if (catError?.message.includes('does not exist')) {
    console.log('Tables do not exist. Please execute the following SQL in Supabase SQL Editor:\n');
    console.log('='.repeat(60));
    console.log(schema);
    console.log('='.repeat(60));
    console.log('\nThen run: npx tsx scripts/seed-data.ts');
    return;
  }

  console.log('Tables exist, seeding categories...');

  // Seed categories
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

  const { error } = await supabase.from('optimai_categories').upsert(categories, { onConflict: 'id' });
  if (error) {
    console.log('Error seeding categories:', error.message);
  } else {
    console.log('Categories seeded successfully!');
  }

  // Seed sample transactions
  console.log('Seeding sample transactions...');
  const sampleTx = [
    { user_id: '00000000-0000-0000-0000-000000000000', amount: 5000, type: 'income', description: 'Salario Enero', date: '2026-01-15', category_id: '00000000-0000-0000-0001-000000000001' },
    { user_id: '00000000-0000-0000-0000-000000000000', amount: -120, type: 'expense', description: 'Supermercado', date: '2026-01-18', category_id: '00000000-0000-0000-0001-000000000004' },
    { user_id: '00000000-0000-0000-0000-000000000000', amount: -45, type: 'expense', description: 'Gasolina', date: '2026-01-19', category_id: '00000000-0000-0000-0001-000000000005' },
    { user_id: '00000000-0000-0000-0000-000000000000', amount: 800, type: 'income', description: 'Proyecto freelance', date: '2026-01-20', category_id: '00000000-0000-0000-0001-000000000002' },
  ];

  const { error: txError } = await supabase.from('optimai_transactions').insert(sampleTx);
  if (txError) {
    console.log('Error seeding transactions:', txError.message);
  } else {
    console.log('Transactions seeded successfully!');
  }

  // Seed sample ideas
  console.log('Seeding sample ideas...');
  const sampleIdeas = [
    { user_id: '00000000-0000-0000-0000-000000000000', title: 'Integrar con Google Calendar', description: 'Sincronizar recordatorios y tareas', category: 'feature', status: 'backlog', priority: 3, impact: 'high', effort: 'm', votes: 5 },
    { user_id: '00000000-0000-0000-0000-000000000000', title: 'Dashboard móvil', description: 'Versión responsive del dashboard', category: 'improvement', status: 'planned', priority: 2, impact: 'medium', effort: 'l', votes: 3 },
    { user_id: '00000000-0000-0000-0000-000000000000', title: 'Exportar a PDF', description: 'Generar reportes financieros en PDF', category: 'feature', status: 'evaluating', priority: 1, impact: 'medium', effort: 's', votes: 2 },
  ];

  const { error: ideasError } = await supabase.from('optimai_ideas').insert(sampleIdeas);
  if (ideasError) {
    console.log('Error seeding ideas:', ideasError.message);
  } else {
    console.log('Ideas seeded successfully!');
  }

  console.log('\n--- Seeding Complete ---');
}

executeSQL().catch(console.error);
