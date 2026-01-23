import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface HeartbeatPayload {
  // Required
  session_id: string;        // Unique session identifier
  owner_name: string;        // Pueblo owner (Aitzol, Sergi, Alvaro)
  client_type: string;       // claude-code, cursor, codex, copilot, etc.

  // Optional status
  name?: string;             // Terminal friendly name
  status?: 'active' | 'thinking' | 'coding' | 'idle';
  current_task?: string;
  current_file?: string;
  speech_bubble?: string;

  // Optional metrics
  tasks_completed?: number;
  lines_written?: number;
  energy?: number;

  // Optional metadata
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// POST /api/terminals/heartbeat
// Called by terminals to report their status
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const payload: HeartbeatPayload = await request.json();

    // Validate required fields
    if (!payload.session_id || !payload.owner_name || !payload.client_type) {
      return NextResponse.json(
        { error: 'Missing required fields: session_id, owner_name, client_type' },
        { status: 400 }
      );
    }

    // 1. Find or create pueblo
    let pueblo = await findPuebloByOwner(payload.owner_name);
    if (!pueblo) {
      pueblo = await createPueblo(payload.owner_name);
      if (!pueblo) {
        return NextResponse.json(
          { error: 'Failed to find or create pueblo' },
          { status: 500 }
        );
      }
    }

    // 2. Upsert terminal
    const terminal = await upsertTerminal(pueblo.id, payload);
    if (!terminal) {
      return NextResponse.json(
        { error: 'Failed to update terminal' },
        { status: 500 }
      );
    }

    // 3. Log activity if status changed significantly
    if (payload.current_task) {
      await logActivity(terminal.id, pueblo.id, 'task_start', payload.current_task);
    }

    return NextResponse.json({
      ok: true,
      terminal_id: terminal.id,
      pueblo_id: pueblo.id,
      pueblo_name: pueblo.nombre,
    });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

interface Pueblo {
  id: string;
  nombre: string;
  owner_name: string;
}

interface Terminal {
  id: string;
  pueblo_id: string;
  session_id: string;
}

async function findPuebloByOwner(ownerName: string): Promise<Pueblo | null> {
  const { data, error } = await supabase
    .from('pueblos')
    .select('id, nombre, owner_name')
    .ilike('owner_name', ownerName)
    .single();

  if (error || !data) return null;
  return data;
}

async function createPueblo(ownerName: string): Promise<Pueblo | null> {
  const colors = [
    { primary: '#3b82f6', secondary: '#1e40af' }, // blue
    { primary: '#10b981', secondary: '#047857' }, // green
    { primary: '#f59e0b', secondary: '#d97706' }, // amber
    { primary: '#8b5cf6', secondary: '#6d28d9' }, // purple
    { primary: '#ef4444', secondary: '#dc2626' }, // red
  ];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  const { data, error } = await supabase
    .from('pueblos')
    .insert({
      nombre: `Pueblo de ${ownerName}`,
      owner_name: ownerName,
      avatar_emoji: '👨‍💻',
      color_primary: randomColor.primary,
      color_secondary: randomColor.secondary,
    })
    .select('id, nombre, owner_name')
    .single();

  if (error) {
    console.error('Error creating pueblo:', error);
    return null;
  }

  // Also create pueblo_stats
  if (data) {
    await supabase.from('pueblo_stats').insert({ pueblo_id: data.id });
  }

  return data;
}

async function upsertTerminal(puebloId: string, payload: HeartbeatPayload): Promise<Terminal | null> {
  const { data, error } = await supabase
    .from('terminals')
    .upsert(
      {
        pueblo_id: puebloId,
        session_id: payload.session_id,
        name: payload.name || `${payload.client_type} session`,
        client_type: payload.client_type,
        status: payload.status || 'active',
        current_task: payload.current_task || null,
        current_file: payload.current_file || null,
        speech_bubble: payload.speech_bubble || null,
        tasks_completed: payload.tasks_completed || 0,
        lines_written: payload.lines_written || 0,
        energy: payload.energy ?? 100,
        last_heartbeat: new Date().toISOString(),
        metadata: payload.metadata || {},
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'pueblo_id,session_id',
      }
    )
    .select('id, pueblo_id, session_id')
    .single();

  if (error) {
    console.error('Error upserting terminal:', error);
    return null;
  }
  return data;
}

async function logActivity(
  terminalId: string,
  puebloId: string,
  actionType: string,
  description: string
): Promise<void> {
  await supabase.from('terminal_activity').insert({
    terminal_id: terminalId,
    pueblo_id: puebloId,
    action_type: actionType,
    description: description,
  });
}

// Allow GET to check if endpoint is working
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/terminals/heartbeat',
    method: 'POST',
    required: ['session_id', 'owner_name', 'client_type'],
    optional: ['name', 'status', 'current_task', 'current_file', 'speech_bubble', 'energy'],
  });
}
