const PROJECT_REF = 'vhnfdknvwvyaepokaqlx';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobmZka252d3Z5YWVwb2thcWx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIyODI3NiwiZXhwIjoyMDgxODA0Mjc2fQ.TZSwDteF7Jw0gvI0Tk325ElNJvcixRDeMVCsgxK1JcA';

async function fetchTable(name) {
  const res = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/${name}?select=*&limit=5`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  });
  if (!res.ok) return null;
  return res.json();
}

async function main() {
  console.log('=== nucleus_users ===');
  const users = await fetchTable('nucleus_users');
  console.log(JSON.stringify(users, null, 2));
  
  console.log('\n=== dev_tasks ===');
  const tasks = await fetchTable('dev_tasks');
  console.log(JSON.stringify(tasks, null, 2));
  
  console.log('\n=== reminders ===');
  const reminders = await fetchTable('reminders');
  console.log(JSON.stringify(reminders, null, 2));
}

main().catch(console.error);
