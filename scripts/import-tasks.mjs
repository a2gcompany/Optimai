#!/usr/bin/env node
/**
 * Import Tasks/Reminders Script
 *
 * Usage: node scripts/import-tasks.mjs <archivo.csv|json|txt>
 *
 * Supported formats:
 * - CSV: title,description,due_date,priority,type
 * - JSON: [{title, description, due_date, priority, type}]
 * - TXT: One task per line (imported as pending task)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { createInterface } from 'readline';

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Default user ID (can be overridden)
const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || '00000000-0000-0000-0000-000000000001';

// ============================================================================
// PARSERS
// ============================================================================

function parseCSV(content, filename) {
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records.map((record) => ({
    title: record.title || record.Title || record.TITLE,
    description: record.description || record.Description || record.DESCRIPTION || null,
    due_date: parseDate(record.due_date || record.dueDate || record.DUE_DATE),
    priority: normalizePriority(record.priority || record.Priority || 'medium'),
    type: normalizeType(record.type || record.Type || 'task'),
    status: normalizeStatus(record.status || record.Status || 'pending'),
    source: 'import',
    source_file: filename,
    user_id: DEFAULT_USER_ID,
  }));
}

function parseJSON(content, filename) {
  const data = JSON.parse(content);
  const items = Array.isArray(data) ? data : [data];

  return items.map((item) => ({
    title: item.title || item.Title,
    description: item.description || null,
    due_date: parseDate(item.due_date || item.dueDate),
    priority: normalizePriority(item.priority || 'medium'),
    type: normalizeType(item.type || 'task'),
    status: normalizeStatus(item.status || 'pending'),
    recurring: item.recurring || false,
    recurrence_rule: item.recurrence_rule || item.recurrenceRule || null,
    tags: item.tags || [],
    source: 'import',
    source_file: filename,
    user_id: DEFAULT_USER_ID,
  }));
}

function parseTXT(content, filename) {
  const lines = content.split('\n').filter((line) => line.trim());

  return lines.map((line) => ({
    title: line.trim(),
    description: null,
    due_date: null,
    priority: 'medium',
    type: 'task',
    status: 'pending',
    source: 'import',
    source_file: filename,
    user_id: DEFAULT_USER_ID,
  }));
}

// ============================================================================
// HELPERS
// ============================================================================

function parseDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizePriority(priority) {
  const p = (priority || '').toLowerCase();
  if (['low', 'medium', 'high', 'urgent'].includes(p)) return p;
  if (p === 'alta' || p === 'high') return 'high';
  if (p === 'baja' || p === 'low') return 'low';
  if (p === 'urgente' || p === 'urgent') return 'urgent';
  return 'medium';
}

function normalizeType(type) {
  const t = (type || '').toLowerCase();
  if (t === 'reminder' || t === 'recordatorio') return 'reminder';
  return 'task';
}

function normalizeStatus(status) {
  const s = (status || '').toLowerCase();
  if (['pending', 'in_progress', 'completed', 'cancelled'].includes(s)) return s;
  if (s === 'done' || s === 'completado') return 'completed';
  if (s === 'progress' || s === 'en_progreso') return 'in_progress';
  if (s === 'cancelado') return 'cancelled';
  return 'pending';
}

function detectFormat(filename, content) {
  const ext = filename.split('.').pop().toLowerCase();

  if (ext === 'json') return 'json';
  if (ext === 'csv') return 'csv';
  if (ext === 'txt') return 'txt';

  // Try to auto-detect
  try {
    JSON.parse(content);
    return 'json';
  } catch {
    if (content.includes(',') && content.split('\n')[0].includes('title')) {
      return 'csv';
    }
    return 'txt';
  }
}

async function confirm(message) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
📋 Import Tasks/Reminders

Usage: node scripts/import-tasks.mjs <archivo>

Supported formats:
  - CSV: title,description,due_date,priority,type
  - JSON: [{title, description, due_date, priority, type}]
  - TXT: One task per line

Example:
  node scripts/import-tasks.mjs mis-tareas.csv
`);
    process.exit(0);
  }

  const filepath = args[0];

  if (!existsSync(filepath)) {
    console.error(`❌ File not found: ${filepath}`);
    process.exit(1);
  }

  console.log(`\n📂 Reading file: ${filepath}`);

  const content = readFileSync(filepath, 'utf-8');
  const filename = filepath.split('/').pop();
  const format = detectFormat(filename, content);

  console.log(`📄 Detected format: ${format.toUpperCase()}`);

  let items;
  try {
    switch (format) {
      case 'csv':
        items = parseCSV(content, filename);
        break;
      case 'json':
        items = parseJSON(content, filename);
        break;
      case 'txt':
        items = parseTXT(content, filename);
        break;
      default:
        throw new Error(`Unknown format: ${format}`);
    }
  } catch (error) {
    console.error(`❌ Parse error: ${error.message}`);
    process.exit(1);
  }

  // Filter valid items
  items = items.filter((item) => item.title);

  if (items.length === 0) {
    console.log('⚠️  No valid items found');
    process.exit(0);
  }

  console.log(`\n📊 Found ${items.length} items to import:\n`);

  // Show preview
  const preview = items.slice(0, 5);
  preview.forEach((item, i) => {
    const emoji = item.type === 'reminder' ? '⏰' : '✅';
    const priority = item.priority === 'urgent' ? '🔴' : item.priority === 'high' ? '🟠' : item.priority === 'low' ? '⚪' : '🟡';
    console.log(`  ${i + 1}. ${emoji} ${priority} ${item.title}`);
    if (item.due_date) {
      console.log(`     📅 Due: ${new Date(item.due_date).toLocaleDateString()}`);
    }
  });

  if (items.length > 5) {
    console.log(`  ... and ${items.length - 5} more`);
  }

  console.log('');

  const proceed = await confirm('Import these items?');

  if (!proceed) {
    console.log('❌ Import cancelled');
    process.exit(0);
  }

  console.log('\n⏳ Importing to Supabase...');

  const { data, error } = await supabase
    .from('tasks_reminders')
    .insert(items)
    .select();

  if (error) {
    console.error(`❌ Import error: ${error.message}`);
    process.exit(1);
  }

  console.log(`\n✅ Successfully imported ${data.length} items!`);

  // Summary
  const tasks = data.filter((d) => d.type === 'task').length;
  const reminders = data.filter((d) => d.type === 'reminder').length;
  console.log(`   📋 Tasks: ${tasks}`);
  console.log(`   ⏰ Reminders: ${reminders}`);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
