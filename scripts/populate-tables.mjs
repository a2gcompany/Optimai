#!/usr/bin/env node
/**
 * Populate Optimai tables with sample data
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vhnfdknvwvyaepokaqlx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobmZka252d3Z5YWVwb2thcWx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIyODI3NiwiZXhwIjoyMDgxODA0Mjc2fQ.TZSwDteF7Jw0gvI0Tk325ElNJvcixRDeMVCsgxK1JcA'
);

async function populateTables() {
  // Check if categories exist
  const { data: existingCats } = await supabase.from('optimai_categories').select('id').limit(1);

  if (!existingCats || existingCats.length === 0) {
    console.log('📝 Inserting categories...');
    const categories = [
      { name: 'Salario', type: 'income', icon: 'briefcase', color: 'green', keywords: ['salary', 'payroll', 'nomina', 'sueldo'] },
      { name: 'Freelance', type: 'income', icon: 'laptop', color: 'blue', keywords: ['freelance', 'consulting', 'consultoria'] },
      { name: 'Artistas', type: 'income', icon: 'music', color: 'purple', keywords: ['booking', 'gig', 'concierto', 'show', 'dj'] },
      { name: 'Ventas', type: 'income', icon: 'shopping-cart', color: 'emerald', keywords: ['venta', 'sale', 'product', 'merch'] },
      { name: 'Inversiones', type: 'income', icon: 'trending-up', color: 'cyan', keywords: ['dividend', 'interest', 'crypto', 'stock'] },
      { name: 'Comida', type: 'expense', icon: 'utensils', color: 'orange', keywords: ['restaurant', 'uber eats', 'deliveroo', 'grocery'] },
      { name: 'Transporte', type: 'expense', icon: 'car', color: 'yellow', keywords: ['uber', 'taxi', 'gasolina', 'metro', 'careem'] },
      { name: 'Suscripciones', type: 'expense', icon: 'credit-card', color: 'pink', keywords: ['netflix', 'spotify', 'subscription', 'saas'] },
      { name: 'Software', type: 'expense', icon: 'code', color: 'indigo', keywords: ['vercel', 'aws', 'github', 'openai', 'supabase'] },
      { name: 'Marketing', type: 'expense', icon: 'megaphone', color: 'red', keywords: ['ads', 'meta', 'google ads', 'promotion'] },
      { name: 'Oficina', type: 'expense', icon: 'building', color: 'slate', keywords: ['rent', 'office', 'coworking', 'alquiler'] },
      { name: 'Legal', type: 'expense', icon: 'file-text', color: 'gray', keywords: ['lawyer', 'abogado', 'notary', 'license'] },
      { name: 'Viajes', type: 'expense', icon: 'plane', color: 'sky', keywords: ['flight', 'hotel', 'airbnb', 'booking'] },
      { name: 'Otros', type: 'both', icon: 'more-horizontal', color: 'stone', keywords: [] },
    ];

    const { error: catError } = await supabase.from('optimai_categories').insert(categories);
    if (catError) console.log('❌ Categories error:', catError.message);
    else console.log('✅ Categories inserted');
  } else {
    console.log('✅ Categories already exist');
  }

  // Get categories for transaction references
  const { data: cats } = await supabase.from('optimai_categories').select('id, name');
  const catMap = {};
  if (cats) {
    cats.forEach(c => catMap[c.name] = c.id);
  }

  // Check if transactions exist
  const { data: existingTx } = await supabase.from('optimai_transactions').select('id').limit(1);

  if (!existingTx || existingTx.length === 0) {
    console.log('📝 Inserting sample transactions...');
    const transactions = [
      { amount: 5000, currency: 'EUR', type: 'income', description: 'Booking Roger Sanchez - Ushuaia Ibiza', category_id: catMap['Artistas'], date: '2026-01-20', user_id: 'aitzol' },
      { amount: 2500, currency: 'EUR', type: 'income', description: 'Booking Prophecy - Fabrik Madrid', category_id: catMap['Artistas'], date: '2026-01-18', user_id: 'aitzol' },
      { amount: 850, currency: 'EUR', type: 'expense', description: 'Meta Ads - PAIDDADS campaña enero', category_id: catMap['Marketing'], date: '2026-01-15', user_id: 'aitzol' },
      { amount: 200, currency: 'USD', type: 'expense', description: 'OpenAI API - Nucleus', category_id: catMap['Software'], date: '2026-01-10', user_id: 'aitzol' },
      { amount: 15000, currency: 'EUR', type: 'income', description: 'Pago mensual A2G FZCO', category_id: catMap['Salario'], date: '2026-01-01', user_id: 'aitzol' },
      { amount: 45, currency: 'EUR', type: 'expense', description: 'Vercel Pro - Nucleus deploy', category_id: catMap['Software'], date: '2026-01-05', user_id: 'aitzol' },
      { amount: 320, currency: 'AED', type: 'expense', description: 'Careem rides Dubai', category_id: catMap['Transporte'], date: '2026-01-12', user_id: 'aitzol' },
      { amount: 1200, currency: 'EUR', type: 'income', description: 'Consultoría técnica - cliente externo', category_id: catMap['Freelance'], date: '2026-01-08', user_id: 'aitzol' },
    ];

    const { error: txError } = await supabase.from('optimai_transactions').insert(transactions);
    if (txError) console.log('❌ Transactions error:', txError.message);
    else console.log('✅ Transactions inserted');
  } else {
    console.log('✅ Transactions already exist');
  }

  // Check if ideas exist
  const { data: existingIdeas } = await supabase.from('optimai_ideas').select('id').limit(1);

  if (!existingIdeas || existingIdeas.length === 0) {
    console.log('📝 Inserting sample ideas...');
    const ideas = [
      { title: 'Dark mode para dashboard', description: 'Implementar tema oscuro en toda la aplicación', status: 'planned', category: 'UI/UX', effort: 's', impact: 'medium', votes: 5, tags: ['ui', 'accesibilidad'] },
      { title: 'Integración con Stripe', description: 'Conectar con Stripe para ver pagos de artistas', status: 'evaluating', category: 'Backend', effort: 'l', impact: 'high', votes: 8, tags: ['pagos', 'artistas', 'api'] },
      { title: 'App móvil React Native', description: 'Crear app nativa para iOS/Android', status: 'idea', category: 'Mobile', effort: 'xl', impact: 'high', votes: 12, tags: ['mobile', 'react-native'] },
      { title: 'Exportar a Excel', description: 'Añadir botón para exportar transacciones a Excel', status: 'in_progress', category: 'Feature', effort: 's', impact: 'medium', votes: 3, tags: ['export', 'finance'] },
      { title: 'Dashboard de artistas', description: 'Vista específica para cada artista gestionado', status: 'planned', category: 'Feature', effort: 'm', impact: 'high', votes: 7, tags: ['artistas', 'dashboard'] },
      { title: 'Notificaciones push', description: 'Alertas cuando hay nuevos bookings o pagos', status: 'evaluating', category: 'Feature', effort: 'm', impact: 'medium', votes: 4, tags: ['notificaciones', 'telegram'] },
      { title: 'Gráficas de tendencias', description: 'Visualizar ingresos/gastos a lo largo del tiempo', status: 'done', category: 'Analytics', effort: 'm', impact: 'high', votes: 6, tags: ['charts', 'analytics'] },
      { title: 'Multi-currency support', description: 'Manejar EUR, USD, AED con conversión automática', status: 'idea', category: 'Backend', effort: 'l', impact: 'high', votes: 9, tags: ['currency', 'international'] },
    ];

    const { error: ideasError } = await supabase.from('optimai_ideas').insert(ideas);
    if (ideasError) console.log('❌ Ideas error:', ideasError.message);
    else console.log('✅ Ideas inserted');
  } else {
    console.log('✅ Ideas already exist');
  }

  // Final count
  console.log('\n📊 Final counts:');
  for (const table of ['optimai_categories', 'optimai_transactions', 'optimai_ideas']) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`   ${table}: error - ${error.message}`);
    } else {
      console.log(`   ${table}: ${count}`);
    }
  }
}

populateTables().catch(console.error);
