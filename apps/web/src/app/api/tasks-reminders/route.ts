import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || '00000000-0000-0000-0000-000000000001';

// ============================================================================
// GET - List all tasks/reminders with filters
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Filters
    const type = searchParams.get('type'); // 'task' | 'reminder'
    const status = searchParams.get('status'); // 'pending' | 'in_progress' | 'completed' | 'cancelled'
    const priority = searchParams.get('priority'); // 'low' | 'medium' | 'high' | 'urgent'
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('tasks_reminders')
      .select('*', { count: 'exact' })
      .eq('user_id', DEFAULT_USER_ID)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq('type', type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate summary
    const { data: allItems } = await supabase
      .from('tasks_reminders')
      .select('type, status')
      .eq('user_id', DEFAULT_USER_ID);

    const summary = {
      total: allItems?.length || 0,
      tasks: allItems?.filter((i) => i.type === 'task').length || 0,
      reminders: allItems?.filter((i) => i.type === 'reminder').length || 0,
      pending: allItems?.filter((i) => i.status === 'pending').length || 0,
      inProgress: allItems?.filter((i) => i.status === 'in_progress').length || 0,
      completed: allItems?.filter((i) => i.status === 'completed').length || 0,
    };

    return NextResponse.json({
      items: data,
      count,
      summary,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Create new task/reminder
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const item = {
      user_id: DEFAULT_USER_ID,
      title: body.title,
      description: body.description || null,
      type: body.type || 'task',
      status: body.status || 'pending',
      priority: body.priority || 'medium',
      due_date: body.due_date || null,
      recurring: body.recurring || false,
      recurrence_rule: body.recurrence_rule || null,
      tags: body.tags || [],
      source: 'manual',
    };

    const { data, error } = await supabase
      .from('tasks_reminders')
      .insert(item)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH - Update task/reminder
// ============================================================================
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    // If completing, set completed_at
    if (updates.status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('tasks_reminders')
      .update(updates)
      .eq('id', id)
      .eq('user_id', DEFAULT_USER_ID)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Delete task/reminder
// ============================================================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const { error } = await supabase
      .from('tasks_reminders')
      .delete()
      .eq('id', id)
      .eq('user_id', DEFAULT_USER_ID);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
