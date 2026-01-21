#!/usr/bin/env node
/**
 * Setup Optimai database tables in Supabase
 * Uses the Supabase Management API to run SQL
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vhnfdknvwvyaepokaqlx.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobmZka252d3Z5YWVwb2thcWx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIyODI3NiwiZXhwIjoyMDgxODA0Mjc2fQ.TZSwDteF7Jw0gvI0Tk325ElNJvcixRDeMVCsgxK1JcA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Check existing tables that we can use
async function checkExistingTables() {
  console.log('📋 Checking existing Nucleus tables...\n');

  const tables = [
    { name: 'dev_tasks', use: 'Tasks' },
    { name: 'reminders', use: 'Reminders' },
    { name: 'messages', use: 'Conversations' },
    { name: 'kg_entities', use: 'Ideas (type=idea)' },
    { name: 'nucleus_users', use: 'Users' },
  ];

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table.name)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ ${table.name}: ${error.message}`);
    } else {
      console.log(`✅ ${table.name}: ${count} records → ${table.use}`);
    }
  }
}

// Seed ideas into kg_entities
async function seedIdeas() {
  console.log('\n📝 Checking ideas in kg_entities...');

  const { data: existingIdeas, error } = await supabase
    .from('kg_entities')
    .select('id')
    .eq('type', 'idea')
    .limit(1);

  if (error) {
    console.log('❌ Error checking ideas:', error.message);
    return;
  }

  if (existingIdeas && existingIdeas.length > 0) {
    const { count } = await supabase
      .from('kg_entities')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'idea');
    console.log(`✅ Ideas already exist: ${count} ideas`);
    return;
  }

  console.log('📝 Inserting sample ideas...');

  const ideas = [
    {
      type: 'idea',
      name: 'dark-mode-dashboard',
      display_name: 'Dark mode para dashboard',
      description: 'Implementar tema oscuro en toda la aplicación',
      properties: {
        status: 'planned',
        category: 'UI/UX',
        effort: 's',
        impact: 'medium',
        votes: 5,
        tags: ['ui', 'accesibilidad']
      },
      importance_score: 0.5,
      is_active: true
    },
    {
      type: 'idea',
      name: 'stripe-integration',
      display_name: 'Integración con Stripe',
      description: 'Conectar con Stripe para ver pagos de artistas',
      properties: {
        status: 'evaluating',
        category: 'Backend',
        effort: 'l',
        impact: 'high',
        votes: 8,
        tags: ['pagos', 'artistas', 'api']
      },
      importance_score: 0.8,
      is_active: true
    },
    {
      type: 'idea',
      name: 'mobile-app',
      display_name: 'App móvil React Native',
      description: 'Crear app nativa para iOS/Android',
      properties: {
        status: 'idea',
        category: 'Mobile',
        effort: 'xl',
        impact: 'high',
        votes: 12,
        tags: ['mobile', 'react-native']
      },
      importance_score: 0.9,
      is_active: true
    },
    {
      type: 'idea',
      name: 'excel-export',
      display_name: 'Exportar a Excel',
      description: 'Añadir botón para exportar transacciones a Excel',
      properties: {
        status: 'in_progress',
        category: 'Feature',
        effort: 's',
        impact: 'medium',
        votes: 3,
        tags: ['export', 'finance']
      },
      importance_score: 0.4,
      is_active: true
    },
    {
      type: 'idea',
      name: 'artist-dashboard',
      display_name: 'Dashboard de artistas',
      description: 'Vista específica para cada artista gestionado',
      properties: {
        status: 'planned',
        category: 'Feature',
        effort: 'm',
        impact: 'high',
        votes: 7,
        tags: ['artistas', 'dashboard']
      },
      importance_score: 0.7,
      is_active: true
    },
    {
      type: 'idea',
      name: 'push-notifications',
      display_name: 'Notificaciones push',
      description: 'Alertas cuando hay nuevos bookings o pagos',
      properties: {
        status: 'evaluating',
        category: 'Feature',
        effort: 'm',
        impact: 'medium',
        votes: 4,
        tags: ['notificaciones', 'telegram']
      },
      importance_score: 0.5,
      is_active: true
    },
    {
      type: 'idea',
      name: 'trend-charts',
      display_name: 'Gráficas de tendencias',
      description: 'Visualizar ingresos/gastos a lo largo del tiempo',
      properties: {
        status: 'done',
        category: 'Analytics',
        effort: 'm',
        impact: 'high',
        votes: 6,
        tags: ['charts', 'analytics']
      },
      importance_score: 0.6,
      is_active: true
    },
    {
      type: 'idea',
      name: 'multi-currency',
      display_name: 'Multi-currency support',
      description: 'Manejar EUR, USD, AED con conversión automática',
      properties: {
        status: 'idea',
        category: 'Backend',
        effort: 'l',
        impact: 'high',
        votes: 9,
        tags: ['currency', 'international']
      },
      importance_score: 0.85,
      is_active: true
    },
  ];

  const { error: insertError } = await supabase
    .from('kg_entities')
    .insert(ideas);

  if (insertError) {
    console.log('❌ Error inserting ideas:', insertError.message);
  } else {
    console.log('✅ Ideas inserted successfully');
  }
}

// Get sample data for verification
async function verifySampleData() {
  console.log('\n📊 Sample data verification:\n');

  // Dev tasks
  const { data: tasks } = await supabase
    .from('dev_tasks')
    .select('id, title, status, priority')
    .limit(3);
  console.log('dev_tasks:', tasks?.map(t => `${t.title} [${t.status}]`).join(', ') || 'none');

  // Reminders
  const { data: reminders } = await supabase
    .from('reminders')
    .select('id, title, is_completed')
    .limit(3);
  console.log('reminders:', reminders?.map(r => `${r.title} [${r.is_completed ? 'done' : 'pending'}]`).join(', ') || 'none');

  // Ideas
  const { data: ideas } = await supabase
    .from('kg_entities')
    .select('id, display_name, properties')
    .eq('type', 'idea')
    .limit(3);
  console.log('ideas:', ideas?.map(i => `${i.display_name} [${i.properties?.status}]`).join(', ') || 'none');
}

async function main() {
  console.log('🚀 Optimai Database Setup\n');
  console.log('=' .repeat(50) + '\n');

  await checkExistingTables();
  await seedIdeas();
  await verifySampleData();

  console.log('\n' + '='.repeat(50));
  console.log('✅ Database setup complete!');
}

main().catch(console.error);
