const PROJECT_REF = 'vhnfdknvwvyaepokaqlx';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobmZka252d3Z5YWVwb2thcWx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIyODI3NiwiZXhwIjoyMDgxODA0Mjc2fQ.TZSwDteF7Jw0gvI0Tk325ElNJvcixRDeMVCsgxK1JcA';

async function checkTable(name) {
  const res = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/${name}?select=*&limit=1`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  });
  return { name, status: res.status, ok: res.ok };
}

async function main() {
  console.log('Checking existing tables...\n');
  
  const possibleTables = [
    'users', 'nucleus_users', 'tasks', 'nucleus_tasks', 
    'reminders', 'nucleus_reminders', 'categories', 
    'transactions', 'ideas', 'conversations', 'budgets',
    'agent_tasks', 'user_patterns', 'dev_tasks', 'kg_entities',
    'kg_relationships', 'messages', 'circle_nodes', 'artist_profiles'
  ];
  
  for (const table of possibleTables) {
    const result = await checkTable(table);
    const icon = result.ok ? '✅' : '❌';
    console.log(`${icon} ${table}: ${result.status}`);
  }
}

main().catch(console.error);
