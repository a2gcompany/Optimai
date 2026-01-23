#!/usr/bin/env node
/**
 * Sync Tasks/Reminders Script
 *
 * Usage: node scripts/sync-tasks.mjs [options]
 *
 * Options:
 *   --pull    Download from Supabase to local JSON
 *   --push    Upload local JSON to Supabase
 *   --status  Show sync status
 *
 * The script uses a local JSON file as cache/backup.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Local storage file
const LOCAL_FILE = join(__dirname, '../.tasks-local.json');
const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || '00000000-0000-0000-0000-000000000001';

// ============================================================================
// LOCAL STORAGE
// ============================================================================

function loadLocal() {
  if (!existsSync(LOCAL_FILE)) {
    return { items: [], lastSync: null };
  }
  try {
    return JSON.parse(readFileSync(LOCAL_FILE, 'utf-8'));
  } catch {
    return { items: [], lastSync: null };
  }
}

function saveLocal(data) {
  writeFileSync(LOCAL_FILE, JSON.stringify(data, null, 2));
}

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

async function pull() {
  console.log('⬇️  Pulling from Supabase...\n');

  const { data, error } = await supabase
    .from('tasks_reminders')
    .select('*')
    .eq('user_id', DEFAULT_USER_ID)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`❌ Pull error: ${error.message}`);
    process.exit(1);
  }

  const localData = {
    items: data,
    lastSync: new Date().toISOString(),
    syncType: 'pull',
  };

  saveLocal(localData);

  console.log(`✅ Downloaded ${data.length} items to local cache`);
  printSummary(data);
}

async function push() {
  console.log('⬆️  Pushing to Supabase...\n');

  const local = loadLocal();

  if (!local.items || local.items.length === 0) {
    console.log('⚠️  No local items to push. Run --pull first or import some tasks.');
    process.exit(0);
  }

  // Get remote items
  const { data: remote, error: fetchError } = await supabase
    .from('tasks_reminders')
    .select('id, updated_at')
    .eq('user_id', DEFAULT_USER_ID);

  if (fetchError) {
    console.error(`❌ Fetch error: ${fetchError.message}`);
    process.exit(1);
  }

  const remoteMap = new Map(remote.map((r) => [r.id, r.updated_at]));

  // Separate new vs updates
  const toInsert = [];
  const toUpdate = [];

  for (const item of local.items) {
    if (!remoteMap.has(item.id)) {
      toInsert.push(item);
    } else {
      // Compare timestamps - local wins if newer
      const localTime = new Date(item.updated_at).getTime();
      const remoteTime = new Date(remoteMap.get(item.id)).getTime();
      if (localTime > remoteTime) {
        toUpdate.push(item);
      }
    }
  }

  let insertCount = 0;
  let updateCount = 0;

  // Insert new items
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('tasks_reminders')
      .insert(toInsert.map(({ id, ...rest }) => rest));

    if (insertError) {
      console.error(`❌ Insert error: ${insertError.message}`);
    } else {
      insertCount = toInsert.length;
    }
  }

  // Update existing items
  for (const item of toUpdate) {
    const { error: updateError } = await supabase
      .from('tasks_reminders')
      .update(item)
      .eq('id', item.id);

    if (!updateError) {
      updateCount++;
    }
  }

  // Update local sync timestamp
  local.lastSync = new Date().toISOString();
  local.syncType = 'push';
  saveLocal(local);

  console.log(`✅ Push complete:`);
  console.log(`   📥 Inserted: ${insertCount}`);
  console.log(`   📝 Updated: ${updateCount}`);
  console.log(`   ⏭️  Skipped: ${local.items.length - insertCount - updateCount}`);
}

async function status() {
  console.log('📊 Sync Status\n');

  // Local status
  const local = loadLocal();
  console.log('Local cache:');
  if (local.lastSync) {
    console.log(`  Last sync: ${new Date(local.lastSync).toLocaleString()}`);
    console.log(`  Sync type: ${local.syncType}`);
    console.log(`  Items: ${local.items?.length || 0}`);
  } else {
    console.log('  No local cache');
  }

  // Remote status
  console.log('\nSupabase:');
  const { data, error } = await supabase
    .from('tasks_reminders')
    .select('id, type, status')
    .eq('user_id', DEFAULT_USER_ID);

  if (error) {
    console.log(`  ❌ Error: ${error.message}`);
  } else {
    console.log(`  Total items: ${data.length}`);
    printSummary(data);
  }
}

function printSummary(items) {
  const tasks = items.filter((i) => i.type === 'task');
  const reminders = items.filter((i) => i.type === 'reminder');
  const pending = items.filter((i) => i.status === 'pending');
  const completed = items.filter((i) => i.status === 'completed');

  console.log('\n  Summary:');
  console.log(`    📋 Tasks: ${tasks.length}`);
  console.log(`    ⏰ Reminders: ${reminders.length}`);
  console.log(`    ⏳ Pending: ${pending.length}`);
  console.log(`    ✅ Completed: ${completed.length}`);
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('🔄 Tasks Sync Tool\n');

  switch (command) {
    case '--pull':
    case 'pull':
      await pull();
      break;
    case '--push':
    case 'push':
      await push();
      break;
    case '--status':
    case 'status':
      await status();
      break;
    default:
      console.log(`
Usage: node scripts/sync-tasks.mjs [command]

Commands:
  --pull    Download from Supabase to local
  --push    Upload local changes to Supabase
  --status  Show sync status

Examples:
  node scripts/sync-tasks.mjs --pull
  node scripts/sync-tasks.mjs --push
  node scripts/sync-tasks.mjs --status
`);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
