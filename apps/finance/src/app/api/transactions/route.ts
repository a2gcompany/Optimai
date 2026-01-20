// =============================================================================
// Transactions API - CRUD operations for financial transactions
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@optimai/db';
import type { APIResponse, Transaction, PaginationMeta } from '@optimai/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TransactionListResponse {
  transactions: Transaction[];
  pagination: PaginationMeta;
}

/**
 * GET /api/transactions
 * List transactions with optional filters
 */
export async function GET(request: NextRequest): Promise<NextResponse<APIResponse<TransactionListResponse>>> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const categoryId = searchParams.get('categoryId');
    const type = searchParams.get('type') as 'income' | 'expense' | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = Math.min(parseInt(searchParams.get('perPage') || '50', 10), 100);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'userId query parameter is required',
          },
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Build query
    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (startDate) {
      query = query.gte('date', startDate);
    }

    if (endDate) {
      query = query.lte('date', endDate);
    }

    // Pagination
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: error.message,
          },
        },
        { status: 500 }
      );
    }

    const total = count || 0;

    return NextResponse.json({
      success: true,
      data: {
        transactions: data as Transaction[],
        pagination: {
          page,
          per_page: perPage,
          total,
          total_pages: Math.ceil(total / perPage),
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('GET transactions error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/transactions
 * Create new transactions (single or batch)
 */
export async function POST(request: NextRequest): Promise<NextResponse<APIResponse<{ created: number }>>> {
  try {
    const body = await request.json();
    const { userId, transactions } = body as {
      userId: string;
      transactions: Array<{
        amount: number;
        type: 'income' | 'expense';
        description: string;
        date: string;
        categoryId?: string;
        metadata?: Record<string, unknown>;
      }>;
    };

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'userId is required',
          },
        },
        { status: 400 }
      );
    }

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_TRANSACTIONS',
            message: 'transactions array is required and must not be empty',
          },
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Prepare records for insertion
    const records = transactions.map((t) => ({
      user_id: userId,
      amount: t.amount,
      currency: 'EUR',
      type: t.type,
      category_id: t.categoryId || null,
      description: t.description,
      date: t.date,
      source: { type: 'csv_import', filename: 'upload' },
      metadata: t.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('transactions')
      .insert(records)
      .select('id');

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: error.message,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        created: data?.length || 0,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('POST transactions error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}
