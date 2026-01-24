import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';

// API Version: 2.0.0 - Local-first Ralph status with Supabase fallback

// Lazy Supabase client (for shared data only)
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Ralph state types
interface RalphStatus {
  state: 'idle' | 'walking' | 'building' | 'thinking' | 'disconnected';
  currentTask: string;
  speechBubble: string;
  energy: {
    current: number;
    max: number;
    nextReset: string;
  };
  stats: {
    tasksCompleted: number;
    tasksPending: number;
    ideasCount: number;
    remindersCount: number;
    loopCount: number;
    callsThisHour: number;
  };
  recentActivity: Array<{
    time: string;
    action: string;
    type: 'task' | 'energy' | 'coin' | 'system';
  }>;
  source: 'local' | 'supabase' | 'fallback';
  pueblo: string;
}

interface LocalStatus {
  timestamp: string;
  loop_count: number;
  calls_made_this_hour: number;
  max_calls_per_hour: number;
  last_action: string;
  status: string;
  exit_reason: string;
  next_reset: string;
}

interface LocalProgress {
  status: string;
  indicator: string;
  elapsed_seconds: number;
  last_output: string;
  timestamp: string;
}

// Map local status to Ralph state
function mapStatusToState(status: string, lastAction: string): RalphStatus['state'] {
  if (status === 'stopped' || status === 'error') return 'disconnected';
  if (status === 'paused') return 'idle';

  switch (lastAction) {
    case 'executing':
    case 'processing':
    case 'building':
      return 'building';
    case 'thinking':
    case 'analyzing':
    case 'planning':
      return 'thinking';
    case 'moving':
    case 'navigating':
      return 'walking';
    default:
      return status === 'running' ? 'building' : 'idle';
  }
}

// Get speech bubble based on state
function getSpeechBubble(state: RalphStatus['state'], lastAction: string, status: string): string {
  if (state === 'disconnected') return 'Desconectado...';
  if (status === 'paused') return 'Tomando un descanso';
  if (status === 'error') return 'Algo salió mal...';

  switch (lastAction) {
    case 'executing':
      return 'Ejecutando tareas...';
    case 'processing':
      return 'Procesando datos...';
    case 'thinking':
      return 'Analizando opciones...';
    case 'analyzing':
      return 'Revisando código...';
    case 'building':
      return 'Construyendo algo...';
    default:
      return state === 'building' ? 'Trabajando...' : 'Todo bajo control';
  }
}

// Try to read local status files
async function readLocalStatus(): Promise<{ status: LocalStatus | null; progress: LocalProgress | null }> {
  try {
    // Try multiple possible paths for status.json
    const possiblePaths = [
      path.join(process.cwd(), '..', '..', 'status.json'),
      path.join(process.cwd(), 'status.json'),
      '/Users/a2g/Projects/Optimai/status.json',
    ];

    let statusData: LocalStatus | null = null;
    let progressData: LocalProgress | null = null;

    for (const p of possiblePaths) {
      try {
        const content = await fs.readFile(p, 'utf-8');
        statusData = JSON.parse(content);
        break;
      } catch {
        continue;
      }
    }

    // Try progress.json
    const progressPaths = [
      path.join(process.cwd(), '..', '..', 'progress.json'),
      path.join(process.cwd(), 'progress.json'),
      '/Users/a2g/Projects/Optimai/progress.json',
    ];

    for (const p of progressPaths) {
      try {
        const content = await fs.readFile(p, 'utf-8');
        progressData = JSON.parse(content);
        break;
      } catch {
        continue;
      }
    }

    return { status: statusData, progress: progressData };
  } catch {
    return { status: null, progress: null };
  }
}

// Get Ralph status from Supabase (synced from local Ralph)
interface SupabaseRalphStatus {
  project: string;
  timestamp: string;
  loop_count: number;
  calls_made_this_hour: number;
  max_calls_per_hour: number;
  last_action: string;
  status: string;
  exit_reason: string;
}

async function getSupabaseRalphStatus(project: string = 'Optimai'): Promise<SupabaseRalphStatus | null> {
  try {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('ralph_status')
      .select('*')
      .eq('project', project)
      .single();

    if (error || !data) return null;

    // Check if status is recent (within last 5 minutes)
    const statusTime = new Date(data.timestamp).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (now - statusTime > fiveMinutes) {
      // Status is stale, Ralph might be stopped
      return {
        ...data,
        status: 'stale',
        last_action: 'disconnected'
      };
    }

    return data;
  } catch {
    return null;
  }
}

// Get stats from Supabase
async function getSupabaseStats() {
  try {
    const supabase = getSupabase();
    if (!supabase) return null;

    const [tasksResult, remindersResult, ideasResult] = await Promise.all([
      supabase.from('dev_tasks').select('status'),
      supabase.from('reminders').select('status'),
      supabase.from('kg_entities').select('id').eq('type', 'idea'),
    ]);

    const tasks = tasksResult.data || [];
    const reminders = remindersResult.data || [];
    const ideas = ideasResult.data || [];

    return {
      tasksPending: tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
      tasksCompleted: tasks.filter(t => t.status === 'completed' || t.status === 'done').length,
      remindersPending: reminders.filter(r => r.status === 'pending' || r.status === 'active').length,
      ideasCount: ideas.length,
    };
  } catch {
    return null;
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export async function GET() {
  try {
    // 1. Try to read local status files first (localhost only)
    const { status: localStatus, progress: localProgress } = await readLocalStatus();

    // 2. Try to get Ralph status from Supabase (for Vercel/remote access)
    const supabaseRalphStatus = await getSupabaseRalphStatus('Optimai');

    // 3. Get general stats from Supabase (shared data)
    const supabaseStats = await getSupabaseStats();

    // 4. Determine source and build response
    // Priority: local → supabase ralph_status → supabase stats → fallback
    let source: RalphStatus['source'] = 'fallback';
    let state: RalphStatus['state'] = 'idle';
    let currentTask = 'Sin conexión';
    let speechBubble = 'Esperando conexión...';
    let loopCount = 0;
    let callsThisHour = 0;
    let maxCalls = 50;
    let nextReset = '';

    if (localStatus) {
      // Local status available - this is the primary source (localhost)
      source = 'local';
      state = mapStatusToState(localStatus.status, localStatus.last_action);
      currentTask = localProgress?.status || localStatus.last_action || 'Procesando';
      speechBubble = getSpeechBubble(state, localStatus.last_action, localStatus.status);
      loopCount = localStatus.loop_count;
      callsThisHour = localStatus.calls_made_this_hour;
      maxCalls = localStatus.max_calls_per_hour;
      nextReset = localStatus.next_reset;
    } else if (supabaseRalphStatus) {
      // Ralph status from Supabase - synced from local Ralph (for Vercel)
      source = 'supabase';
      state = mapStatusToState(supabaseRalphStatus.status, supabaseRalphStatus.last_action);
      currentTask = supabaseRalphStatus.last_action || 'Procesando';
      speechBubble = getSpeechBubble(state, supabaseRalphStatus.last_action, supabaseRalphStatus.status);
      loopCount = supabaseRalphStatus.loop_count;
      callsThisHour = supabaseRalphStatus.calls_made_this_hour;
      maxCalls = supabaseRalphStatus.max_calls_per_hour;

      // Calculate next reset from timestamp
      const statusTime = new Date(supabaseRalphStatus.timestamp);
      const nextResetDate = new Date(statusTime);
      nextResetDate.setHours(nextResetDate.getHours() + 1, 0, 0, 0);
      nextReset = nextResetDate.toISOString();
    } else if (supabaseStats) {
      // No Ralph status but Supabase stats available
      source = 'supabase';
      state = supabaseStats.tasksPending > 0 ? 'thinking' : 'idle';
      currentTask = supabaseStats.tasksPending > 0 ? 'Tareas pendientes en cola' : 'Sin tareas activas';
      speechBubble = 'Conectado a la nube (Ralph offline)';

      // Simulate energy based on time
      const now = new Date();
      callsThisHour = Math.floor(Math.random() * 10) + 5;
      maxCalls = 50;
      const nextResetDate = new Date(now);
      nextResetDate.setHours(nextResetDate.getHours() + 1, 0, 0, 0);
      nextReset = nextResetDate.toISOString();
    }

    const energyCurrent = maxCalls - callsThisHour;

    // Build activity log
    const now = new Date();
    const recentActivity: RalphStatus['recentActivity'] = [];

    if (source === 'local') {
      recentActivity.push(
        { time: formatTime(now), action: `Estado: ${state}`, type: 'system' },
        { time: formatTime(new Date(now.getTime() - 30000)), action: `Loop #${loopCount}`, type: 'task' },
        { time: formatTime(new Date(now.getTime() - 60000)), action: `Energía: ${energyCurrent}/${maxCalls}`, type: 'energy' }
      );
    } else if (source === 'supabase' && supabaseStats) {
      recentActivity.push(
        { time: formatTime(now), action: 'Conectado a Supabase', type: 'system' },
        { time: formatTime(new Date(now.getTime() - 30000)), action: `${supabaseStats.tasksPending} tareas pendientes`, type: 'task' }
      );
    } else {
      recentActivity.push(
        { time: formatTime(now), action: 'Sin conexión local', type: 'system' },
        { time: formatTime(new Date(now.getTime() - 30000)), action: 'Usando datos de fallback', type: 'system' }
      );
    }

    const response: RalphStatus = {
      state,
      currentTask,
      speechBubble,
      energy: {
        current: energyCurrent,
        max: maxCalls,
        nextReset: nextReset || new Date(Date.now() + 3600000).toISOString(),
      },
      stats: {
        tasksCompleted: supabaseStats?.tasksCompleted || 0,
        tasksPending: supabaseStats?.tasksPending || 0,
        ideasCount: supabaseStats?.ideasCount || 0,
        remindersCount: supabaseStats?.remindersPending || 0,
        loopCount,
        callsThisHour,
      },
      recentActivity,
      source,
      pueblo: 'Aitzol', // Default pueblo - will be dynamic later
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching Ralph status:', error);

    // Return disconnected state on error
    return NextResponse.json({
      state: 'disconnected',
      currentTask: 'Error de conexión',
      speechBubble: 'Reconectando...',
      energy: { current: 0, max: 50, nextReset: '' },
      stats: {
        tasksCompleted: 0,
        tasksPending: 0,
        ideasCount: 0,
        remindersCount: 0,
        loopCount: 0,
        callsThisHour: 0,
      },
      recentActivity: [
        { time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), action: 'Error de conexión', type: 'system' }
      ],
      source: 'fallback',
      pueblo: 'Aitzol',
    } as RalphStatus);
  }
}
