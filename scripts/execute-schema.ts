import postgres from 'postgres';

// Use IPv6 direct or pooler connection
const connectionString = 'postgresql://postgres.vhnfdknvwvyaepokaqlx:tuDdex-3nekbi-tihsud@aws-0-us-west-1.pooler.supabase.com:6543/postgres';

const sql = postgres(connectionString, {
  ssl: 'require',
  connection: {
    application_name: 'optimai-setup'
  }
});

async function executeSchema() {
  console.log('Connecting to database...\n');

  try {
    // Test connection
    const result = await sql`SELECT NOW() as now`;
    console.log('Connected at:', result[0].now);

    // Check existing tables
    console.log('\nChecking existing tables...');
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'optimai%'
    `;
    console.log('Existing optimai tables:', tables.map(t => t.table_name).join(', ') || 'none');

    // Create optimai_categories
    console.log('\n1. Creating optimai_categories...');
    await sql`
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
      )
    `;
    console.log('   -> Created!');

    // Create optimai_transactions
    console.log('2. Creating optimai_transactions...');
    await sql`
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
      )
    `;
    console.log('   -> Created!');

    // Create optimai_ideas
    console.log('3. Creating optimai_ideas...');
    await sql`
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
      )
    `;
    console.log('   -> Created!');

    // Create indexes
    console.log('4. Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_optimai_transactions_date ON optimai_transactions(date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_optimai_transactions_user ON optimai_transactions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_optimai_ideas_status ON optimai_ideas(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_optimai_ideas_priority ON optimai_ideas(priority DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_optimai_categories_type ON optimai_categories(type)`;
    console.log('   -> Created!');

    // Seed default categories
    console.log('5. Seeding categories...');
    await sql`
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
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    `;
    console.log('   -> Seeded 12 categories!');

    // Seed sample transactions
    console.log('6. Seeding sample transactions...');
    await sql`
      INSERT INTO optimai_transactions (user_id, amount, type, description, date, category_id) VALUES
        ('00000000-0000-0000-0000-000000000000', 5000, 'income', 'Salario Enero A2G', '2026-01-15', '00000000-0000-0000-0001-000000000001'),
        ('00000000-0000-0000-0000-000000000000', -120.50, 'expense', 'Supermercado Carrefour', '2026-01-18', '00000000-0000-0000-0001-000000000004'),
        ('00000000-0000-0000-0000-000000000000', -45, 'expense', 'Gasolina Shell', '2026-01-19', '00000000-0000-0000-0001-000000000005'),
        ('00000000-0000-0000-0000-000000000000', 800, 'income', 'Proyecto Roger Sanchez', '2026-01-20', '00000000-0000-0000-0001-000000000002'),
        ('00000000-0000-0000-0000-000000000000', -15.99, 'expense', 'Spotify Premium', '2026-01-01', '00000000-0000-0000-0001-000000000010'),
        ('00000000-0000-0000-0000-000000000000', -89.90, 'expense', 'Cena networking BABEL', '2026-01-17', '00000000-0000-0000-0001-000000000007'),
        ('00000000-0000-0000-0000-000000000000', 1500, 'income', 'Comisión A2G Talents', '2026-01-10', '00000000-0000-0000-0001-000000000002'),
        ('00000000-0000-0000-0000-000000000000', -250, 'expense', 'Alquiler coworking', '2026-01-05', '00000000-0000-0000-0001-000000000006')
    `;
    console.log('   -> Seeded 8 transactions!');

    // Seed sample ideas
    console.log('7. Seeding sample ideas...');
    await sql`
      INSERT INTO optimai_ideas (user_id, title, description, category, status, priority, impact, effort, votes, tags) VALUES
        ('00000000-0000-0000-0000-000000000000', 'Integrar con Google Calendar', 'Sincronizar recordatorios y tareas de Optimai con Google Calendar para ver todo en un solo lugar', 'feature', 'backlog', 3, 'high', 'm', 5, ARRAY['integration', 'calendar']),
        ('00000000-0000-0000-0000-000000000000', 'Dashboard móvil PWA', 'Crear versión responsive del dashboard con funcionalidad offline', 'improvement', 'planned', 2, 'medium', 'l', 3, ARRAY['mobile', 'pwa']),
        ('00000000-0000-0000-0000-000000000000', 'Exportar reportes a PDF', 'Generar reportes financieros mensuales en PDF automáticamente', 'feature', 'evaluating', 1, 'medium', 's', 2, ARRAY['export', 'finance']),
        ('00000000-0000-0000-0000-000000000000', 'Bot Telegram mejorado', 'Añadir comandos de voz y procesamiento de imágenes al bot', 'improvement', 'in_progress', 4, 'high', 'l', 8, ARRAY['telegram', 'ai']),
        ('00000000-0000-0000-0000-000000000000', 'Categorización automática AI', 'Usar GPT para categorizar transacciones automáticamente basándose en la descripción', 'feature', 'done', 5, 'critical', 'm', 12, ARRAY['ai', 'finance', 'automation'])
    `;
    console.log('   -> Seeded 5 ideas!');

    // Enable RLS
    console.log('8. Enabling Row Level Security...');
    await sql`ALTER TABLE optimai_categories ENABLE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE optimai_transactions ENABLE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE optimai_ideas ENABLE ROW LEVEL SECURITY`;

    // Create policies for service role
    console.log('9. Creating RLS policies...');
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_optimai_categories') THEN
          CREATE POLICY allow_all_optimai_categories ON optimai_categories FOR ALL USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_optimai_transactions') THEN
          CREATE POLICY allow_all_optimai_transactions ON optimai_transactions FOR ALL USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_optimai_ideas') THEN
          CREATE POLICY allow_all_optimai_ideas ON optimai_ideas FOR ALL USING (true);
        END IF;
      END $$
    `;
    console.log('   -> Policies created!');

    // Verify
    console.log('\n--- Verification ---');
    const finalTables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'optimai%'
    `;
    console.log('Tables created:', finalTables.map(t => t.table_name).join(', '));

    const catCount = await sql`SELECT COUNT(*) as count FROM optimai_categories`;
    console.log('Categories:', catCount[0].count);

    const txCount = await sql`SELECT COUNT(*) as count FROM optimai_transactions`;
    console.log('Transactions:', txCount[0].count);

    const ideasCount = await sql`SELECT COUNT(*) as count FROM optimai_ideas`;
    console.log('Ideas:', ideasCount[0].count);

    console.log('\n=== DATABASE SETUP COMPLETE ===');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

executeSchema();
