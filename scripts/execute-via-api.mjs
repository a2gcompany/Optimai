import { readFileSync } from 'fs';

const PROJECT_REF = 'vhnfdknvwvyaepokaqlx';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobmZka252d3Z5YWVwb2thcWx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIyODI3NiwiZXhwIjoyMDgxODA0Mjc2fQ.TZSwDteF7Jw0gvI0Tk325ElNJvcixRDeMVCsgxK1JcA';

async function executeSQL(sql) {
  const response = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    },
    body: JSON.stringify({ sql })
  });
  
  return response;
}

async function main() {
  console.log('Testing Supabase API connection...\n');
  
  // First, check if the API is reachable
  const healthCheck = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  });
  
  console.log('API Status:', healthCheck.status);
  
  // Try to query reminders directly to see what exists
  const remindersRes = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/reminders?select=*&limit=1`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  });
  
  console.log('Reminders query status:', remindersRes.status);
  const reminders = await remindersRes.json();
  console.log('Reminders data:', JSON.stringify(reminders, null, 2));
  
  // Check users table
  const usersRes = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/users?select=*&limit=1`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  });
  
  console.log('\nUsers query status:', usersRes.status);
  const users = await usersRes.json();
  console.log('Users response:', JSON.stringify(users, null, 2));
}

main().catch(console.error);
