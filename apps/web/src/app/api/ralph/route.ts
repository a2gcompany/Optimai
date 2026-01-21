import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Ralph state types
interface RalphStatus {
  state: 'idle' | 'walking' | 'building' | 'thinking';
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
}

// Map last_action to Ralph state
function mapActionToState(action: string): RalphStatus['state'] {
  switch (action) {
    case 'executing':
    case 'processing':
      return 'building';
    case 'thinking':
    case 'analyzing':
      return 'thinking';
    case 'moving':
    case 'navigating':
      return 'walking';
    default:
      return 'idle';
  }
}

// Get speech bubble based on state
function getSpeechBubble(action: string, status: string): string {
  if (status === 'error') return 'Algo salió mal...';
  if (status === 'paused') return 'Tomando un descanso';

  switch (action) {
    case 'executing':
      return 'Ejecutando tareas...';
    case 'processing':
      return 'Procesando datos...';
    case 'thinking':
      return 'Analizando opciones...';
    case 'analyzing':
      return 'Revisando código...';
    default:
      return 'Todo bajo control';
  }
}

export async function GET() {
  try {
    // Try to read status from local files (if exists in server)
    // For production, we'll use Supabase data

    // Get task stats from Supabase
    const [tasksResult, remindersResult, ideasResult] = await Promise.all([
      supabase.from('dev_tasks').select('status'),
      supabase.from('reminders').select('status'),
      supabase.from('kg_entities').select('id').eq('type', 'idea'),
    ]);

    const tasks = tasksResult.data || [];
    const reminders = remindersResult.data || [];
    const ideas = ideasResult.data || [];

    const tasksPending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
    const tasksCompleted = tasks.filter(t => t.status === 'completed' || t.status === 'done').length;
    const remindersPending = reminders.filter(r => r.status === 'pending' || r.status === 'active').length;

    // Simulate status.json data (in production, this could be read from a KV store or database)
    const now = new Date();
    const hour = now.getHours();
    const isActiveHour = hour >= 9 && hour < 20;

    // Simulate energy based on time
    const maxCalls = 50;
    const callsUsed = Math.floor(Math.random() * 10) + 5; // Simulated
    const energyCurrent = maxCalls - callsUsed;

    // Calculate next reset (next hour)
    const nextReset = new Date(now);
    nextReset.setHours(nextReset.getHours() + 1, 0, 0, 0);

    // Determine Ralph's state based on activity
    const isActive = isActiveHour && tasksPending > 0;
    const state: RalphStatus['state'] = isActive ?
      (Math.random() > 0.5 ? 'building' : 'thinking') :
      'idle';

    const response: RalphStatus = {
      state,
      currentTask: tasksPending > 0 ? 'Procesando backlog' : 'Sin tareas pendientes',
      speechBubble: isActive ?
        (state === 'building' ? 'Trabajando en ello...' : 'Analizando próximos pasos') :
        'Todo tranquilo por aquí',
      energy: {
        current: energyCurrent,
        max: maxCalls,
        nextReset: nextReset.toISOString(),
      },
      stats: {
        tasksCompleted,
        tasksPending,
        ideasCount: ideas.length,
        remindersCount: remindersPending,
        loopCount: Math.floor(Math.random() * 10) + 1, // Simulated
        callsThisHour: callsUsed,
      },
      recentActivity: [
        { time: formatTime(new Date()), action: 'Sistema activo', type: 'system' },
        { time: formatTime(new Date(Date.now() - 60000)), action: `${tasksPending} tareas pendientes`, type: 'task' },
        { time: formatTime(new Date(Date.now() - 120000)), action: `Energía: ${energyCurrent}/${maxCalls}`, type: 'energy' },
      ],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching Ralph status:', error);

    // Return default state on error
    return NextResponse.json({
      state: 'idle',
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
      recentActivity: [],
    } as RalphStatus);
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}
