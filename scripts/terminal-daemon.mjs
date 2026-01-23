#!/usr/bin/env node
/**
 * Terminal Daemon - Auto-connects and sends heartbeats every 5 seconds
 *
 * Usage:
 *   node scripts/terminal-daemon.mjs &
 *
 * Or add to your shell profile (.zshrc / .bashrc):
 *   alias optimai-connect="node ~/Projects/Optimai/scripts/terminal-daemon.mjs &"
 */

import { execSync } from 'child_process';
import { hostname, userInfo } from 'os';
import crypto from 'crypto';

// Configuration
const API_URL = process.env.OPTIMAI_API_URL || 'http://localhost:3000';
const HEARTBEAT_INTERVAL = 5000; // 5 seconds
const OWNER = process.env.OPTIMAI_OWNER || getOwnerFromGit() || userInfo().username;
const CLIENT_TYPE = process.env.OPTIMAI_CLIENT || detectClient();

// State
let currentTask = process.env.OPTIMAI_TASK || null;
let status = 'active';
let tasksCompleted = 0;

// Generate stable session ID
function getSessionId() {
  const machine = hostname();
  const user = userInfo().username;
  const startTime = Date.now();
  return `${machine}-${user}-${startTime}`.substring(0, 32);
}

function getOwnerFromGit() {
  try {
    const gitName = execSync('git config user.name', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    // Map common git usernames to pueblo owner names
    const ownerMap = {
      'a2gcompany': 'Aitzol',
      'aitzol': 'Aitzol',
      'sergi': 'Sergi',
      'alvaro': 'Alvaro',
    };
    return ownerMap[gitName.toLowerCase()] || gitName;
  } catch {
    return null;
  }
}

function detectClient() {
  // Check environment variables that different clients set
  if (process.env.CLAUDE_CODE) return 'claude-code';
  if (process.env.CURSOR_SESSION) return 'cursor';
  if (process.env.CODEX_SESSION) return 'codex';
  if (process.env.COPILOT_AGENT) return 'copilot';

  // Check parent process name
  try {
    const ppid = process.ppid;
    const parentName = execSync(`ps -p ${ppid} -o comm=`, { encoding: 'utf-8' }).trim().toLowerCase();
    if (parentName.includes('claude')) return 'claude-code';
    if (parentName.includes('cursor')) return 'cursor';
    if (parentName.includes('code')) return 'vscode';
  } catch {}

  return 'terminal';
}

function getSpeechBubble() {
  const hour = new Date().getHours();
  const messages = {
    working: ['Trabajando...', 'En ello...', 'Procesando...', 'Ejecutando...'],
    morning: ['Buenos días!', 'Arrancando el día', 'Café y código'],
    afternoon: ['Avanzando bien', 'Productivo', 'En racha'],
    evening: ['Terminando tareas', 'Última hora', 'Casi listo'],
    night: ['Modo nocturno', 'Horas extra', 'Noctámbulo'],
  };

  let pool;
  if (status === 'coding' || currentTask) {
    pool = messages.working;
  } else if (hour >= 6 && hour < 12) {
    pool = messages.morning;
  } else if (hour >= 12 && hour < 18) {
    pool = messages.afternoon;
  } else if (hour >= 18 && hour < 22) {
    pool = messages.evening;
  } else {
    pool = messages.night;
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

const SESSION_ID = getSessionId();

async function sendHeartbeat() {
  const payload = {
    session_id: SESSION_ID,
    owner_name: OWNER,
    client_type: CLIENT_TYPE,
    name: `${hostname()} - ${CLIENT_TYPE}`,
    status: status,
    current_task: currentTask,
    speech_bubble: getSpeechBubble(),
    tasks_completed: tasksCompleted,
    energy: calculateEnergy(),
  };

  try {
    const response = await fetch(`${API_URL}/api/terminals/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      process.stdout.write('.');
    } else {
      process.stdout.write('x');
    }
  } catch (error) {
    process.stdout.write('!');
  }
}

function calculateEnergy() {
  // Energy decreases slightly over time, resets each hour
  const minutes = new Date().getMinutes();
  return Math.max(50, 100 - minutes);
}

// Handle stdin for task updates (can pipe commands)
process.stdin.setEncoding('utf8');
process.stdin.on('data', (data) => {
  const cmd = data.trim();
  if (cmd.startsWith('task:')) {
    currentTask = cmd.substring(5).trim() || null;
    status = currentTask ? 'coding' : 'active';
    console.log(`\n[Task: ${currentTask || 'none'}]`);
  } else if (cmd === 'done') {
    tasksCompleted++;
    currentTask = null;
    status = 'active';
    console.log(`\n[Task completed! Total: ${tasksCompleted}]`);
  } else if (cmd === 'status') {
    console.log(`\n[Session: ${SESSION_ID}]`);
    console.log(`[Owner: ${OWNER}]`);
    console.log(`[Client: ${CLIENT_TYPE}]`);
    console.log(`[Task: ${currentTask || 'none'}]`);
    console.log(`[Status: ${status}]`);
  } else if (cmd === 'quit' || cmd === 'exit') {
    console.log('\n[Disconnecting...]');
    process.exit(0);
  }
});

// Startup
console.log('╔════════════════════════════════════════════════════════╗');
console.log('║  Optimai Terminal Daemon                               ║');
console.log('╚════════════════════════════════════════════════════════╝');
console.log('');
console.log(`Session:  ${SESSION_ID}`);
console.log(`Owner:    ${OWNER}`);
console.log(`Client:   ${CLIENT_TYPE}`);
console.log(`API:      ${API_URL}`);
console.log(`Interval: ${HEARTBEAT_INTERVAL / 1000}s`);
console.log('');
console.log('Commands: task:<description> | done | status | quit');
console.log('Heartbeats: . = ok, x = error, ! = network');
console.log('');
process.stdout.write('Connecting');

// Initial heartbeat
sendHeartbeat().then(() => {
  console.log(' connected!');
  console.log('');

  // Start heartbeat loop
  setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Shutting down...]');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Terminated]');
  process.exit(0);
});
