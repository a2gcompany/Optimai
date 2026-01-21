import pg from 'pg';
import { readFileSync } from 'fs';

const { Client } = pg;

// Try different connection strings
const connections = [
  {
    name: 'Direct IPv6',
    config: {
      host: '2406:da1a:4c1:1801:ad04:ff64:e8df:e5ac',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: 'tuDdex-3nekbi-tihsud',
      ssl: { rejectUnauthorized: false }
    }
  },
  {
    name: 'Supavisor Session',
    config: {
      connectionString: 'postgresql://postgres.vhnfdknvwvyaepokaqlx:tuDdex-3nekbi-tihsud@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require',
    }
  }
];

async function tryConnection(conn) {
  const client = new Client(conn.config);
  try {
    console.log(`Trying ${conn.name}...`);
    await client.connect();
    console.log(`✅ Connected via ${conn.name}`);
    return client;
  } catch (err) {
    console.log(`❌ ${conn.name}: ${err.message}`);
    return null;
  }
}

async function main() {
  // Just print the schema for manual execution
  console.log('\n========================================');
  console.log('MANUAL EXECUTION REQUIRED');
  console.log('========================================\n');
  console.log('Please execute the following SQL in Supabase Dashboard:');
  console.log('URL: https://supabase.com/dashboard/project/vhnfdknvwvyaepokaqlx/sql/new\n');
  console.log('--- BEGIN SQL ---\n');
  
  const schema = readFileSync('./packages/db/schema-optimai.sql', 'utf-8');
  console.log(schema);
  
  console.log('\n--- END SQL ---\n');
}

main().catch(console.error);
