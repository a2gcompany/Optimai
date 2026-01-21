import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vhnfdknvwvyaepokaqlx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobmZka252d3Z5YWVwb2thcWx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIyODI3NiwiZXhwIjoyMDgxODA0Mjc2fQ.TZSwDteF7Jw0gvI0Tk325ElNJvcixRDeMVCsgxK1JcA';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function setup() {
  console.log('=== Optimai Database Setup via Supabase REST API ===\n');

  // Step 1: Check what tables exist
  console.log('1. Checking existing tables via REST...');

  const tables = ['optimai_categories', 'optimai_transactions', 'optimai_ideas', 'dev_tasks', 'reminders'];
  const existingTables: string[] = [];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (!error || !error.message.includes('does not exist')) {
      existingTables.push(table);
      console.log(`   [✓] ${table} exists`);
    } else {
      console.log(`   [✗] ${table} does not exist`);
    }
  }

  // If optimai tables don't exist, output SQL for manual execution
  const missingTables = tables.filter(t => t.startsWith('optimai') && !existingTables.includes(t));

  if (missingTables.length > 0) {
    console.log('\n=== MANUAL STEP REQUIRED ===');
    console.log('The following tables need to be created manually:');
    console.log(missingTables.join(', '));
    console.log('\nPlease go to Supabase Dashboard > SQL Editor and run:\n');
    console.log('---BEGIN SQL---');
    console.log(`
-- Create optimai_categories
CREATE TABLE IF NOT EXISTS optimai_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    parent_id UUID,
    type TEXT DEFAULT 'expense' CHECK (type IN ('income', 'expense', 'transfer')),
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create optimai_transactions
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

-- Create optimai_ideas
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_optimai_transactions_date ON optimai_transactions(date);
CREATE INDEX IF NOT EXISTS idx_optimai_transactions_user ON optimai_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_optimai_ideas_status ON optimai_ideas(status);
CREATE INDEX IF NOT EXISTS idx_optimai_ideas_priority ON optimai_ideas(priority DESC);
CREATE INDEX IF NOT EXISTS idx_optimai_categories_type ON optimai_categories(type);

-- Enable RLS
ALTER TABLE optimai_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimai_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimai_ideas ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now)
CREATE POLICY "allow_all_optimai_categories" ON optimai_categories FOR ALL USING (true);
CREATE POLICY "allow_all_optimai_transactions" ON optimai_transactions FOR ALL USING (true);
CREATE POLICY "allow_all_optimai_ideas" ON optimai_ideas FOR ALL USING (true);

-- Seed categories
INSERT INTO optimai_categories (id, user_id, name, icon, color, type, is_system) VALUES
  ('00000000-0000-0000-0001-000000000001', NULL, 'Salario', 'banknotes', '#22c55e', 'income', true),
  ('00000000-0000-0000-0001-000000000002', NULL, 'Freelance', 'briefcase', '#10b981', 'income', true),
  ('00000000-0000-0000-0001-000000000003', NULL, 'Inversiones', 'trending-up', '#14b8a6', 'income', true),
  ('00000000-0000-0000-0001-000000000004', NULL, 'Alimentación', 'utensils', '#f59e0b', 'expense', true),
  ('00000000-0000-0000-0001-000000000005', NULL, 'Transporte', 'car', '#3b82f6', 'expense', true),
  ('00000000-0000-0000-0001-000000000006', NULL, 'Vivienda', 'home', '#8b5cf6', 'expense', true),
  ('00000000-0000-0000-0001-000000000007', NULL, 'Entretenimiento', 'gamepad-2', '#ec4899', 'expense', true),
  ('00000000-0000-0000-0001-000000000008', NULL, 'Salud', 'heart-pulse', '#ef4444', 'expense', true),
  ('00000000-0000-0000-0001-000000000009', NULL, 'Educación', 'graduation-cap', '#6366f1', 'expense', true),
  ('00000000-0000-0000-0001-000000000010', NULL, 'Suscripciones', 'repeat', '#a855f7', 'expense', true),
  ('00000000-0000-0000-0001-000000000011', NULL, 'Otros', 'more-horizontal', '#64748b', 'expense', true),
  ('00000000-0000-0000-0001-000000000012', NULL, 'Transferencia', 'arrow-left-right', '#0ea5e9', 'transfer', true)
ON CONFLICT (id) DO NOTHING;
    `);
    console.log('---END SQL---');
    console.log('\nAfter running the SQL, run: npx tsx scripts/seed-data.ts');
    return;
  }

  // Tables exist, let's seed data
  console.log('\n2. Seeding categories...');
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

  const { error: catError } = await supabase.from('optimai_categories').upsert(categories, { onConflict: 'id' });
  console.log(catError ? `   Error: ${catError.message}` : '   [✓] 12 categories seeded');

  console.log('\n3. Seeding sample transactions...');
  const transactions = [
    { user_id: '00000000-0000-0000-0000-000000000000', amount: 5000, type: 'income', description: 'Salario Enero A2G', date: '2026-01-15', category_id: '00000000-0000-0000-0001-000000000001' },
    { user_id: '00000000-0000-0000-0000-000000000000', amount: -120.50, type: 'expense', description: 'Supermercado Carrefour', date: '2026-01-18', category_id: '00000000-0000-0000-0001-000000000004' },
    { user_id: '00000000-0000-0000-0000-000000000000', amount: -45, type: 'expense', description: 'Gasolina Shell', date: '2026-01-19', category_id: '00000000-0000-0000-0001-000000000005' },
    { user_id: '00000000-0000-0000-0000-000000000000', amount: 800, type: 'income', description: 'Proyecto Roger Sanchez', date: '2026-01-20', category_id: '00000000-0000-0000-0001-000000000002' },
    { user_id: '00000000-0000-0000-0000-000000000000', amount: -15.99, type: 'expense', description: 'Spotify Premium', date: '2026-01-01', category_id: '00000000-0000-0000-0001-000000000010' },
    { user_id: '00000000-0000-0000-0000-000000000000', amount: -89.90, type: 'expense', description: 'Cena networking BABEL', date: '2026-01-17', category_id: '00000000-0000-0000-0001-000000000007' },
    { user_id: '00000000-0000-0000-0000-000000000000', amount: 1500, type: 'income', description: 'Comisión A2G Talents', date: '2026-01-10', category_id: '00000000-0000-0000-0001-000000000002' },
    { user_id: '00000000-0000-0000-0000-000000000000', amount: -250, type: 'expense', description: 'Alquiler coworking', date: '2026-01-05', category_id: '00000000-0000-0000-0001-000000000006' },
  ];

  const { error: txError } = await supabase.from('optimai_transactions').insert(transactions);
  console.log(txError ? `   Error: ${txError.message}` : '   [✓] 8 transactions seeded');

  console.log('\n4. Seeding sample ideas...');
  const ideas = [
    { user_id: '00000000-0000-0000-0000-000000000000', title: 'Integrar con Google Calendar', description: 'Sincronizar recordatorios y tareas de Optimai con Google Calendar para ver todo en un solo lugar', category: 'feature', status: 'backlog', priority: 3, impact: 'high', effort: 'm', votes: 5, tags: ['integration', 'calendar'] },
    { user_id: '00000000-0000-0000-0000-000000000000', title: 'Dashboard móvil PWA', description: 'Crear versión responsive del dashboard con funcionalidad offline', category: 'improvement', status: 'planned', priority: 2, impact: 'medium', effort: 'l', votes: 3, tags: ['mobile', 'pwa'] },
    { user_id: '00000000-0000-0000-0000-000000000000', title: 'Exportar reportes a PDF', description: 'Generar reportes financieros mensuales en PDF automáticamente', category: 'feature', status: 'evaluating', priority: 1, impact: 'medium', effort: 's', votes: 2, tags: ['export', 'finance'] },
    { user_id: '00000000-0000-0000-0000-000000000000', title: 'Bot Telegram mejorado', description: 'Añadir comandos de voz y procesamiento de imágenes al bot', category: 'improvement', status: 'in_progress', priority: 4, impact: 'high', effort: 'l', votes: 8, tags: ['telegram', 'ai'] },
    { user_id: '00000000-0000-0000-0000-000000000000', title: 'Categorización automática AI', description: 'Usar GPT para categorizar transacciones automáticamente basándose en la descripción', category: 'feature', status: 'done', priority: 5, impact: 'critical', effort: 'm', votes: 12, tags: ['ai', 'finance', 'automation'] },
  ];

  const { error: ideasError } = await supabase.from('optimai_ideas').insert(ideas);
  console.log(ideasError ? `   Error: ${ideasError.message}` : '   [✓] 5 ideas seeded');

  console.log('\n=== SETUP COMPLETE ===');
}

setup().catch(console.error);
