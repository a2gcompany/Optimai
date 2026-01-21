const PROJECT_REF = 'vhnfdknvwvyaepokaqlx';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobmZka252d3Z5YWVwb2thcWx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIyODI3NiwiZXhwIjoyMDgxODA0Mjc2fQ.TZSwDteF7Jw0gvI0Tk325ElNJvcixRDeMVCsgxK1JcA';

async function checkTable(name) {
  const res = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/${name}?limit=1`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  });
  return res.ok;
}

async function executeRpc(sql) {
  const res = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql })
  });
  return res.ok;
}

async function insertData(table, data) {
  const res = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(data)
  });
  return { ok: res.ok, status: res.status, text: await res.text() };
}

async function main() {
  console.log('Checking optimai tables...\n');

  // Check if optimai tables exist
  const tables = ['optimai_tasks', 'optimai_categories', 'optimai_transactions', 'optimai_ideas'];
  const tableStatus = {};

  for (const table of tables) {
    const exists = await checkTable(table);
    tableStatus[table] = exists;
    console.log(`${exists ? '✅' : '❌'} ${table}`);
  }

  // If categories exist, check for data
  if (tableStatus['optimai_categories']) {
    const res = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/optimai_categories?limit=5`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      }
    });
    const cats = await res.json();
    console.log('\nCategories found:', cats.length);
    if (cats.length > 0) {
      console.log('Sample:', cats[0].name);
    }
  }

  // If ideas exist, check for data
  if (tableStatus['optimai_ideas']) {
    const res = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/optimai_ideas?limit=5`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      }
    });
    const ideas = await res.json();
    console.log('\nIdeas found:', ideas.length);
  }

  // Check transactions
  if (tableStatus['optimai_transactions']) {
    const res = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/optimai_transactions?limit=5`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      }
    });
    const txs = await res.json();
    console.log('Transactions found:', txs.length);
  }

  console.log('\n=== Summary ===');
  const allExist = Object.values(tableStatus).every(v => v);
  if (allExist) {
    console.log('All tables exist! Schema has been executed.');
  } else {
    console.log('Some tables are missing. Execute schema-optimai.sql in Supabase Dashboard.');
    console.log('URL: https://supabase.com/dashboard/project/vhnfdknvwvyaepokaqlx/sql/new');
  }
}

main().catch(console.error);
