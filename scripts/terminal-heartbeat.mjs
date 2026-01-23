#!/usr/bin/env node
/**
 * Terminal Heartbeat Script
 *
 * Reporta el estado de esta terminal a Optimai World.
 * Puede ser ejecutado manualmente o como cron job.
 *
 * Usage:
 *   node scripts/terminal-heartbeat.mjs [options]
 *
 * Options:
 *   --owner     Owner name (default: from git config or "Unknown")
 *   --client    Client type (default: "claude-code")
 *   --task      Current task description
 *   --status    Status: active, thinking, coding, idle (default: active)
 *   --loop      Run continuously (heartbeat every 30s)
 *
 * Examples:
 *   node scripts/terminal-heartbeat.mjs --owner Aitzol --task "Working on World"
 *   node scripts/terminal-heartbeat.mjs --loop
 */

import { execSync } from 'child_process';
import { hostname, userInfo } from 'os';
import crypto from 'crypto';

// Configuration
const API_BASE = process.env.OPTIMAI_API_URL || 'http://localhost:3000';
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

// Parse arguments
const args = process.argv.slice(2);
function getArg(name, defaultValue) {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return defaultValue;
  return args[index + 1] || defaultValue;
}
const runLoop = args.includes('--loop');

// Get owner name from git config or system
function getOwnerName() {
  const argOwner = getArg('owner', null);
  if (argOwner) return argOwner;

  try {
    const gitUser = execSync('git config user.name', { encoding: 'utf-8' }).trim();
    if (gitUser) return gitUser;
  } catch {}

  return userInfo().username || 'Unknown';
}

// Generate a stable session ID for this terminal
function getSessionId() {
  const machine = hostname();
  const user = userInfo().username;
  const pid = process.ppid || process.pid;
  const hash = crypto.createHash('md5').update(`${machine}-${user}-${pid}`).digest('hex');
  return `${machine}-${hash.substring(0, 8)}`;
}

// Build heartbeat payload
function buildPayload(overrides = {}) {
  return {
    session_id: getSessionId(),
    owner_name: getOwnerName(),
    client_type: getArg('client', 'claude-code'),
    name: `${hostname()} - Claude Code`,
    status: getArg('status', 'active'),
    current_task: getArg('task', null),
    speech_bubble: getSpeechBubble(),
    energy: getEnergyLevel(),
    ...overrides,
  };
}

// Get a fun speech bubble message
function getSpeechBubble() {
  const hour = new Date().getHours();
  if (hour < 6) return 'Trabajando de madrugada...';
  if (hour < 9) return 'Comenzando el día';
  if (hour < 12) return 'En modo productivo';
  if (hour < 14) return 'Hora del almuerzo pronto';
  if (hour < 18) return 'Avanzando tareas';
  if (hour < 21) return 'Terminando el día';
  return 'Trabajando tarde...';
}

// Estimate energy based on time since midnight
function getEnergyLevel() {
  const hour = new Date().getHours();
  // Energy peaks at 10am and 3pm, lowest at 2am and 2pm
  if (hour >= 9 && hour <= 11) return 100;
  if (hour >= 14 && hour <= 16) return 90;
  if (hour >= 7 && hour <= 18) return 80;
  if (hour >= 19 && hour <= 22) return 60;
  return 40;
}

// Send heartbeat
async function sendHeartbeat(payload = null) {
  const data = payload || buildPayload();

  try {
    const response = await fetch(`${API_BASE}/api/terminals/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`✓ Heartbeat sent: ${data.owner_name} | ${data.client_type} | ${data.status}`);
      if (result.pueblo_name) {
        console.log(`  Pueblo: ${result.pueblo_name}`);
      }
    } else {
      console.error(`✗ Heartbeat failed: ${result.error || response.statusText}`);
    }

    return result;
  } catch (error) {
    console.error(`✗ Network error: ${error.message}`);
    return null;
  }
}

// Main
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Optimai Terminal Heartbeat                            ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Session ID: ${getSessionId()}`);
  console.log(`Owner: ${getOwnerName()}`);
  console.log(`Client: ${getArg('client', 'claude-code')}`);
  console.log(`API: ${API_BASE}`);
  console.log('');

  // Send initial heartbeat
  await sendHeartbeat();

  if (runLoop) {
    console.log(`Running in loop mode (heartbeat every ${HEARTBEAT_INTERVAL / 1000}s)`);
    console.log('Press Ctrl+C to stop');
    console.log('');

    setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
  }
}

main().catch(console.error);
