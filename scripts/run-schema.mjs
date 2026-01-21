#!/usr/bin/env node
// Script to execute schema.sql on Supabase using REST API

const supabaseUrl = 'https://vhnfdknvwvyaepokaqlx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobmZka252d3Z5YWVwb2thcWx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIyODI3NiwiZXhwIjoyMDgxODA0Mjc2fQ.TZSwDteF7Jw0gvI0Tk325ElNJvcixRDeMVCsgxK1JcA';

async function testConnection() {
  console.log('Testing Supabase connection...');

  // Try to query users table
  const response = await fetch(`${supabaseUrl}/rest/v1/users?select=id&limit=1`, {
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    }
  });

  if (response.status === 404) {
    console.log('\n⚠️  Tables do not exist yet.');
    console.log('\n📋 Please run the schema manually in Supabase SQL Editor:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/vhnfdknvwvyaepokaqlx/sql/new');
    console.log('   2. Copy contents of: packages/db/schema.sql');
    console.log('   3. Paste and click "Run"');
    console.log('\nAfter creating tables, run this script again to seed data.');
    return false;
  }

  if (!response.ok) {
    const text = await response.text();
    console.error('Error:', response.status, text);
    return false;
  }

  console.log('✅ Tables exist! Connection successful.');
  return true;
}

async function apiCall(endpoint, method = 'GET', body = null, upsert = false) {
  const headers = {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    'Prefer': upsert ? 'resolution=merge-duplicates,return=representation' : 'return=representation'
  };

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, options);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status}: ${text}`);
  }

  return response.json();
}

async function seedTestData() {
  console.log('\nSeeding test data...');

  // Create test user (Aitzol)
  try {
    const users = await apiCall('users?on_conflict=telegram_id', 'POST', {
      telegram_id: 123456789,
      telegram_username: 'aitzolarev',
      first_name: 'Aitzol',
      last_name: 'Arévalo',
      email: 'aitzolarev@gmail.com',
      is_admin: true,
      preferences: { theme: 'dark', language: 'es' }
    }, true);

    const user = users[0];
    console.log('✅ User created:', user.first_name);

    // Create tasks
    const tasks = [
      { title: 'Revisar contrato de Roger Sanchez', priority: 'high', status: 'pending', tags: ['a2g-talents', 'contratos'] },
      { title: 'Llamar a Neil por gira verano', priority: 'medium', status: 'in_progress', tags: ['a2g-talents'] },
      { title: 'Preparar pitch para inversores Tipit', priority: 'urgent', status: 'pending', tags: ['tipit', 'inversión'] },
      { title: 'Revisar métricas Paiddads', priority: 'low', status: 'completed', tags: ['paiddads'] },
      { title: 'Configurar webhook Nucleus', priority: 'high', status: 'pending', tags: ['nucleus', 'tech'] }
    ];

    await apiCall('tasks', 'POST', tasks.map(t => ({ ...t, user_id: user.id })));
    console.log(`✅ Created ${tasks.length} tasks`);

    // Create reminders
    const now = Date.now();
    const reminders = [
      { message: 'Llamar a Roger', scheduled_at: new Date(now + 2 * 60 * 60 * 1000).toISOString() },
      { message: 'Review Nucleus PRs', scheduled_at: new Date(now + 24 * 60 * 60 * 1000).toISOString() },
      { message: 'Reunión con equipo EMVI', scheduled_at: new Date(now + 48 * 60 * 60 * 1000).toISOString() }
    ];

    await apiCall('reminders', 'POST', reminders.map(r => ({ ...r, user_id: user.id, telegram_chat_id: 123456789 })));
    console.log(`✅ Created ${reminders.length} reminders`);

    // Create transactions
    const transactions = [
      { amount: 15000, type: 'income', description: 'Booking Roger Sanchez - Pacha', date: '2026-01-15', category_id: '00000000-0000-0000-0000-000000000002' },
      { amount: 8500, type: 'income', description: 'Management fee Prophecy', date: '2026-01-10', category_id: '00000000-0000-0000-0000-000000000002' },
      { amount: -2500, type: 'expense', description: 'Vuelos equipo - ADE', date: '2026-01-08', category_id: '00000000-0000-0000-0000-000000000005' },
      { amount: -450, type: 'expense', description: 'Suscripción Vercel Pro', date: '2026-01-01', category_id: '00000000-0000-0000-0000-000000000010' },
      { amount: -180, type: 'expense', description: 'OpenAI API', date: '2026-01-01', category_id: '00000000-0000-0000-0000-000000000010' },
      { amount: 3200, type: 'income', description: 'Campaña Paiddads - Cliente X', date: '2026-01-18', category_id: '00000000-0000-0000-0000-000000000002' }
    ];

    await apiCall('transactions', 'POST', transactions.map(t => ({ ...t, user_id: user.id, currency: 'EUR' })));
    console.log(`✅ Created ${transactions.length} transactions`);

    // Create ideas
    const ideas = [
      { title: 'Dashboard móvil PWA', description: 'Convertir dashboard en PWA para acceso móvil', category: 'feature', status: 'planned', effort: 'm', impact: 'high', tags: ['mobile', 'pwa'] },
      { title: 'Integración con Stripe', description: 'Sincronizar automáticamente pagos de Stripe', category: 'feature', status: 'backlog', effort: 'l', impact: 'critical', tags: ['stripe', 'finanzas'] },
      { title: 'Notificaciones push', description: 'Añadir push notifications para recordatorios', category: 'feature', status: 'evaluating', effort: 's', impact: 'medium', tags: ['notifications'] },
      { title: 'Mejorar categorización AI', description: 'Entrenar modelo con transacciones históricas', category: 'improvement', status: 'backlog', effort: 'l', impact: 'high', tags: ['ai', 'ml'] },
      { title: 'Fix timezone reminders', description: 'Los recordatorios no respetan zona horaria del usuario', category: 'bugfix', status: 'in_progress', effort: 's', impact: 'medium', tags: ['bug'] }
    ];

    await apiCall('ideas', 'POST', ideas.map(i => ({ ...i, user_id: user.id })));
    console.log(`✅ Created ${ideas.length} ideas`);

    console.log('\n✅ Seed data completed!');

  } catch (err) {
    console.error('❌ Error seeding data:', err.message);
  }
}

async function main() {
  const connected = await testConnection();
  if (connected) {
    await seedTestData();
  }
}

main().catch(console.error);
