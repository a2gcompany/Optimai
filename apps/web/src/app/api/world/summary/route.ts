import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Types
interface WorldSummary {
  ralph: {
    status: 'running' | 'idle' | 'stopped';
    currentBuilding: 'hq' | 'taller' | 'banco' | 'biblioteca' | 'torre';
    lastAction: string;
    energy: number;
    loopCount: number;
    updatedAt: string;
  };
  counts: {
    tasksPending: number;
    tasksCompleted: number;
    tasksCompletedToday: number;
    ideas: number;
    remindersActive: number;
  };
  finance: {
    total: number;
  };
  source: 'supabase' | 'fallback';
}

export async function GET() {
  const project = 'Optimai';

  try {
    // Fetch all data in parallel
    const [
      ralphResult,
      tasksPendingResult,
      tasksCompletedResult,
      tasksCompletedTodayResult,
      ideasResult,
      remindersResult,
      financeResult,
    ] = await Promise.all([
      // Ralph status
      supabase
        .from('ralph_status')
        .select('*')
        .eq('project', project)
        .single(),

      // Tasks pending
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('project', project)
        .in('status', ['pending', 'in_progress']),

      // Tasks completed total
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('project', project)
        .eq('status', 'completed'),

      // Tasks completed today
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('project', project)
        .eq('status', 'completed')
        .gte('completed_at', new Date().toISOString().split('T')[0]),

      // Ideas count
      supabase
        .from('ideas')
        .select('id', { count: 'exact', head: true })
        .eq('project', project),

      // Active reminders
      supabase
        .from('reminders')
        .select('id', { count: 'exact', head: true })
        .eq('project', project)
        .eq('status', 'active'),

      // Latest finance record
      supabase
        .from('finances')
        .select('total')
        .eq('project', project)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
    ]);

    // Build response
    const ralph = ralphResult.data;
    const hasRalphData = ralph && !ralphResult.error;

    const response: WorldSummary = {
      ralph: {
        status: hasRalphData ? (ralph.status as WorldSummary['ralph']['status']) : 'stopped',
        currentBuilding: hasRalphData ? (ralph.current_building as WorldSummary['ralph']['currentBuilding']) || 'hq' : 'hq',
        lastAction: hasRalphData ? ralph.last_action || 'Sin acción' : 'Sin conexión',
        energy: hasRalphData ? ralph.energy || 0 : 0,
        loopCount: hasRalphData ? ralph.loop_count || 0 : 0,
        updatedAt: hasRalphData ? ralph.updated_at || ralph.timestamp : new Date().toISOString(),
      },
      counts: {
        tasksPending: tasksPendingResult.count || 0,
        tasksCompleted: tasksCompletedResult.count || 0,
        tasksCompletedToday: tasksCompletedTodayResult.count || 0,
        ideas: ideasResult.count || 0,
        remindersActive: remindersResult.count || 0,
      },
      finance: {
        total: financeResult.data?.total || 0,
      },
      source: hasRalphData ? 'supabase' : 'fallback',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching world summary:', error);

    // Return fallback data
    return NextResponse.json({
      ralph: {
        status: 'stopped',
        currentBuilding: 'hq',
        lastAction: 'Error de conexión',
        energy: 0,
        loopCount: 0,
        updatedAt: new Date().toISOString(),
      },
      counts: {
        tasksPending: 0,
        tasksCompleted: 0,
        tasksCompletedToday: 0,
        ideas: 0,
        remindersActive: 0,
      },
      finance: {
        total: 0,
      },
      source: 'fallback',
    } as WorldSummary);
  }
}
