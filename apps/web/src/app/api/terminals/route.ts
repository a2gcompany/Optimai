import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface Terminal {
  id: string;
  name: string;
  client_type: string;
  session_id: string;
  status: 'active' | 'thinking' | 'coding' | 'idle' | 'offline';
  current_task: string | null;
  current_file: string | null;
  speech_bubble: string | null;
  tasks_completed: number;
  energy: number;
  last_heartbeat: string;
}

interface Pueblo {
  id: string;
  nombre: string;
  owner_name: string;
  avatar_emoji: string;
  color_primary: string;
  color_secondary: string;
  terminals: Terminal[];
  stats: {
    terminals_active: number;
    tasks_pending: number;
    tasks_completed_today: number;
    energy: number;
  };
}

interface Activity {
  id: string;
  pueblo_name: string;
  terminal_name: string;
  action_type: string;
  description: string;
  created_at: string;
}

interface WorldState {
  pueblos: Pueblo[];
  activity: Activity[];
  timestamp: string;
}

// -----------------------------------------------------------------------------
// GET /api/terminals
// Returns all pueblos with their active terminals
// -----------------------------------------------------------------------------

export async function GET() {
  try {
    const supabase = getSupabase();

    // If no supabase, return fallback
    if (!supabase) {
      return NextResponse.json({
        pueblos: getDefaultPueblos(),
        activity: [],
        timestamp: new Date().toISOString(),
        source: 'fallback',
        message: 'Supabase not configured.',
      });
    }

    // Cleanup: mark stale terminals offline, delete old ones, prune activity
    await Promise.all([
      markStaleTerminalsOffline(),
      cleanupOldTerminals(),
      cleanupOldActivity(),
    ]);

    // Fetch all data in parallel
    const [pueblosResult, terminalsResult, statsResult, activityResult] = await Promise.all([
      supabase
        .from('pueblos')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true }),

      supabase
        .from('terminals')
        .select('id, pueblo_id, name, client_type, session_id, status, current_task, current_file, speech_bubble, tasks_completed, energy, last_heartbeat'),

      supabase
        .from('pueblo_stats')
        .select('*'),

      supabase
        .from('terminal_activity')
        .select('*, terminals(name), pueblos(nombre)')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    // If tables don't exist, return fallback
    if (pueblosResult.error?.message?.includes('Could not find')) {
      return NextResponse.json({
        pueblos: getDefaultPueblos(),
        activity: [],
        timestamp: new Date().toISOString(),
        source: 'fallback',
        message: 'Tables not created yet. Run migration SQL in Supabase Dashboard.',
      } as WorldState & { source: string; message: string });
    }

    const pueblos = pueblosResult.data || [];
    const terminals = terminalsResult.data || [];
    const stats = statsResult.data || [];


    // If no pueblos in DB, use defaults
    const finalPueblos = pueblos.length > 0 ? pueblos : getDefaultPueblos().map(p => ({
      ...p,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Build response
    const worldState: WorldState = {
      pueblos: finalPueblos.map((pueblo) => {
        const puebloTerminals = terminals.filter((t) => t.pueblo_id === pueblo.id);
        const puebloStats = stats.find((s) => s.pueblo_id === pueblo.id);

        return {
          id: pueblo.id,
          nombre: pueblo.nombre,
          owner_name: pueblo.owner_name,
          avatar_emoji: pueblo.avatar_emoji,
          color_primary: pueblo.color_primary,
          color_secondary: pueblo.color_secondary,
          terminals: puebloTerminals.map((t) => ({
            id: t.id,
            name: t.name,
            client_type: t.client_type,
            session_id: t.session_id,
            status: t.status,
            current_task: t.current_task,
            current_file: t.current_file,
            speech_bubble: t.speech_bubble,
            tasks_completed: t.tasks_completed || 0,
            energy: t.energy || 100,
            last_heartbeat: t.last_heartbeat,
          })),
          stats: {
            terminals_active: puebloTerminals.filter(
              (t) => t.status !== 'offline' && isRecent(t.last_heartbeat)
            ).length,
            tasks_pending: puebloStats?.tasks_pending || 0,
            tasks_completed_today: puebloStats?.tasks_completed_today || 0,
            energy: puebloStats?.energy_current || 100,
          },
        };
      }),
      activity: (activityResult.data || []).map((a) => ({
        id: a.id,
        pueblo_name: a.pueblos?.nombre || 'Unknown',
        terminal_name: a.terminals?.name || 'Unknown',
        action_type: a.action_type,
        description: a.description,
        created_at: a.created_at,
      })),
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(worldState);
  } catch (error) {
    console.error('Error fetching terminals:', error);

    // Return fallback data
    return NextResponse.json({
      pueblos: getDefaultPueblos(),
      activity: [],
      timestamp: new Date().toISOString(),
    } as WorldState);
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

// Terminals are considered active if heartbeat within last 60 seconds
const HEARTBEAT_TIMEOUT_MS = 60 * 1000;
// Delete offline terminals after 30 minutes of inactivity
const CLEANUP_THRESHOLD_MS = 30 * 60 * 1000;

function isRecent(timestamp: string): boolean {
  const cutoff = Date.now() - HEARTBEAT_TIMEOUT_MS;
  return new Date(timestamp).getTime() > cutoff;
}

async function markStaleTerminalsOffline(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const cutoff = new Date(Date.now() - HEARTBEAT_TIMEOUT_MS).toISOString();

  await supabase
    .from('terminals')
    .update({ status: 'offline', updated_at: new Date().toISOString() })
    .neq('status', 'offline')
    .lt('last_heartbeat', cutoff);
}

// Delete terminals that have been offline for more than 30 minutes
async function cleanupOldTerminals(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const cutoff = new Date(Date.now() - CLEANUP_THRESHOLD_MS).toISOString();

  await supabase
    .from('terminals')
    .delete()
    .eq('status', 'offline')
    .lt('last_heartbeat', cutoff);
}

// Delete old activity entries (keep last 24 hours)
async function cleanupOldActivity(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from('terminal_activity')
    .delete()
    .lt('created_at', oneDayAgo);
}

function getDefaultPueblos(): Pueblo[] {
  return [
    {
      id: 'aitzol',
      nombre: 'Pueblo de Aitzol',
      owner_name: 'Aitzol',
      avatar_emoji: '👨‍💻',
      color_primary: '#3b82f6',
      color_secondary: '#1e40af',
      terminals: [],
      stats: { terminals_active: 0, tasks_pending: 0, tasks_completed_today: 0, energy: 100 },
    },
    {
      id: 'sergi',
      nombre: 'Pueblo de Sergi',
      owner_name: 'Sergi',
      avatar_emoji: '🧑‍💻',
      color_primary: '#10b981',
      color_secondary: '#047857',
      terminals: [],
      stats: { terminals_active: 0, tasks_pending: 0, tasks_completed_today: 0, energy: 100 },
    },
    {
      id: 'alvaro',
      nombre: 'Pueblo de Alvaro',
      owner_name: 'Alvaro',
      avatar_emoji: '👩‍💻',
      color_primary: '#f59e0b',
      color_secondary: '#d97706',
      terminals: [],
      stats: { terminals_active: 0, tasks_pending: 0, tasks_completed_today: 0, energy: 100 },
    },
  ];
}
