#!/usr/bin/env node
/**
 * Create Optimai tables in Supabase using direct PostgreSQL connection
 */

import pg from 'pg';

const DATABASE_URL = 'postgresql://postgres:tuDdex-3nekbi-tihsud@db.vhnfdknvwvyaepokaqlx.supabase.co:5432/postgres';

const { Client } = pg;

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const SQL = `
-- =====================================================
-- OPTIMAI TABLES
-- =====================================================

-- Categories table
CREATE TABLE IF NOT EXISTS optimai_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'both')),
  icon VARCHAR(50),
  color VARCHAR(20),
  keywords TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories if table is empty
INSERT INTO optimai_categories (name, type, icon, color, keywords)
SELECT * FROM (VALUES
  ('Salario', 'income', 'briefcase', 'green', ARRAY['salary', 'payroll', 'nomina', 'sueldo']),
  ('Freelance', 'income', 'laptop', 'blue', ARRAY['freelance', 'consulting', 'consultoria']),
  ('Artistas', 'income', 'music', 'purple', ARRAY['booking', 'gig', 'concierto', 'show', 'dj']),
  ('Ventas', 'income', 'shopping-cart', 'emerald', ARRAY['venta', 'sale', 'product', 'merch']),
  ('Inversiones', 'income', 'trending-up', 'cyan', ARRAY['dividend', 'interest', 'crypto', 'stock']),
  ('Comida', 'expense', 'utensils', 'orange', ARRAY['restaurant', 'uber eats', 'deliveroo', 'grocery']),
  ('Transporte', 'expense', 'car', 'yellow', ARRAY['uber', 'taxi', 'gasolina', 'metro', 'careem']),
  ('Suscripciones', 'expense', 'credit-card', 'pink', ARRAY['netflix', 'spotify', 'subscription', 'saas']),
  ('Software', 'expense', 'code', 'indigo', ARRAY['vercel', 'aws', 'github', 'openai', 'supabase']),
  ('Marketing', 'expense', 'megaphone', 'red', ARRAY['ads', 'meta', 'google ads', 'promotion']),
  ('Oficina', 'expense', 'building', 'slate', ARRAY['rent', 'office', 'coworking', 'alquiler']),
  ('Legal', 'expense', 'file-text', 'gray', ARRAY['lawyer', 'abogado', 'notary', 'license']),
  ('Viajes', 'expense', 'plane', 'sky', ARRAY['flight', 'hotel', 'airbnb', 'booking']),
  ('Otros', 'both', 'more-horizontal', 'stone', ARRAY[])
) AS v(name, type, icon, color, keywords)
WHERE NOT EXISTS (SELECT 1 FROM optimai_categories);

-- Transactions table
CREATE TABLE IF NOT EXISTS optimai_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100),
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  description TEXT,
  category_id UUID REFERENCES optimai_categories(id),
  date DATE NOT NULL,
  source VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ideas table
CREATE TABLE IF NOT EXISTS optimai_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(30) DEFAULT 'idea' CHECK (status IN ('idea', 'evaluating', 'planned', 'in_progress', 'done', 'rejected')),
  category VARCHAR(50),
  effort VARCHAR(10) CHECK (effort IN ('xs', 's', 'm', 'l', 'xl')),
  impact VARCHAR(10) CHECK (impact IN ('low', 'medium', 'high', 'critical')),
  votes INTEGER DEFAULT 0,
  tags TEXT[],
  assignee VARCHAR(100),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert sample ideas if table is empty
INSERT INTO optimai_ideas (title, description, status, category, effort, impact, votes, tags)
SELECT * FROM (VALUES
  ('Dark mode para dashboard', 'Implementar tema oscuro en toda la aplicación', 'planned', 'UI/UX', 's', 'medium', 5, ARRAY['ui', 'accesibilidad']),
  ('Integración con Stripe', 'Conectar con Stripe para ver pagos de artistas', 'evaluating', 'Backend', 'l', 'high', 8, ARRAY['pagos', 'artistas', 'api']),
  ('App móvil React Native', 'Crear app nativa para iOS/Android', 'idea', 'Mobile', 'xl', 'high', 12, ARRAY['mobile', 'react-native']),
  ('Exportar a Excel', 'Añadir botón para exportar transacciones a Excel', 'in_progress', 'Feature', 's', 'medium', 3, ARRAY['export', 'finance']),
  ('Dashboard de artistas', 'Vista específica para cada artista gestionado', 'planned', 'Feature', 'm', 'high', 7, ARRAY['artistas', 'dashboard']),
  ('Notificaciones push', 'Alertas cuando hay nuevos bookings o pagos', 'evaluating', 'Feature', 'm', 'medium', 4, ARRAY['notificaciones', 'telegram']),
  ('Gráficas de tendencias', 'Visualizar ingresos/gastos a lo largo del tiempo', 'done', 'Analytics', 'm', 'high', 6, ARRAY['charts', 'analytics']),
  ('Multi-currency support', 'Manejar EUR, USD, AED con conversión automática', 'idea', 'Backend', 'l', 'high', 9, ARRAY['currency', 'international'])
) AS v(title, description, status, category, effort, impact, votes, tags)
WHERE NOT EXISTS (SELECT 1 FROM optimai_ideas);

-- Conversations table (for chat history)
CREATE TABLE IF NOT EXISTS optimai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user ON optimai_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON optimai_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON optimai_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_ideas_status ON optimai_ideas(status);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON optimai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON optimai_conversations(created_at DESC);

-- Enable RLS
ALTER TABLE optimai_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimai_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimai_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimai_conversations ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now - can be restricted later)
DO $$
BEGIN
  -- Categories: read for all, write for service role
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'categories_read_all') THEN
    CREATE POLICY categories_read_all ON optimai_categories FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'categories_write_service') THEN
    CREATE POLICY categories_write_service ON optimai_categories FOR ALL USING (true);
  END IF;

  -- Transactions: all operations allowed
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'transactions_all') THEN
    CREATE POLICY transactions_all ON optimai_transactions FOR ALL USING (true);
  END IF;

  -- Ideas: all operations allowed
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ideas_all') THEN
    CREATE POLICY ideas_all ON optimai_ideas FOR ALL USING (true);
  END IF;

  -- Conversations: all operations allowed
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'conversations_all') THEN
    CREATE POLICY conversations_all ON optimai_conversations FOR ALL USING (true);
  END IF;
END $$;

-- Grant permissions
GRANT ALL ON optimai_categories TO authenticated, anon, service_role;
GRANT ALL ON optimai_transactions TO authenticated, anon, service_role;
GRANT ALL ON optimai_ideas TO authenticated, anon, service_role;
GRANT ALL ON optimai_conversations TO authenticated, anon, service_role;
`;

async function main() {
  try {
    console.log('🔌 Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Connected!\n');

    console.log('📝 Creating tables...');
    await client.query(SQL);
    console.log('✅ Tables created successfully!\n');

    // Verify tables exist
    const { rows } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'optimai_%'
      ORDER BY table_name
    `);

    console.log('📋 Optimai tables:');
    rows.forEach(r => console.log(`   - ${r.table_name}`));

    // Count records
    const counts = await Promise.all([
      client.query('SELECT COUNT(*) FROM optimai_categories'),
      client.query('SELECT COUNT(*) FROM optimai_transactions'),
      client.query('SELECT COUNT(*) FROM optimai_ideas'),
      client.query('SELECT COUNT(*) FROM optimai_conversations'),
    ]);

    console.log('\n📊 Record counts:');
    console.log(`   - optimai_categories: ${counts[0].rows[0].count}`);
    console.log(`   - optimai_transactions: ${counts[1].rows[0].count}`);
    console.log(`   - optimai_ideas: ${counts[2].rows[0].count}`);
    console.log(`   - optimai_conversations: ${counts[3].rows[0].count}`);

    console.log('\n🎉 Done!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
