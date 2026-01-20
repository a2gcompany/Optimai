// =============================================================================
// Categorize API - AI-powered transaction categorization
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { smartCategorize, categorizeBatch, addUserPattern, getCategoryStats, DEFAULT_CATEGORIES } from '@/lib/categorizer';
import type { APIResponse, ParsedTransaction } from '@optimai/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CategorizeRequest {
  transactions: Array<{
    description: string;
    amount?: number;
  }>;
  userId?: string;
}

interface CategorizeResponse {
  results: Array<{
    description: string;
    category: string;
    confidence: number;
    source: string;
  }>;
  stats: Record<string, { count: number; total: number }>;
}

/**
 * POST /api/transactions/categorize
 * Categorize transactions using AI
 */
export async function POST(request: NextRequest): Promise<NextResponse<APIResponse<CategorizeResponse>>> {
  try {
    const body = (await request.json()) as CategorizeRequest;
    const { transactions, userId } = body;

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_TRANSACTIONS',
            message: 'transactions array is required',
          },
        },
        { status: 400 }
      );
    }

    // Categorize each transaction
    const results = await Promise.all(
      transactions.map(async (t) => {
        const { category, confidence, source } = await smartCategorize(t.description, userId);
        return {
          description: t.description,
          category,
          confidence,
          source,
        };
      })
    );

    // Calculate stats
    const statsMap = new Map<string, { count: number; total: number }>();
    for (let i = 0; i < results.length; i++) {
      const category = results[i].category;
      const amount = Math.abs(transactions[i].amount || 0);
      const current = statsMap.get(category) || { count: 0, total: 0 };
      statsMap.set(category, {
        count: current.count + 1,
        total: current.total + amount,
      });
    }

    const stats: Record<string, { count: number; total: number }> = {};
    statsMap.forEach((value, key) => {
      stats[key] = value;
    });

    return NextResponse.json({
      success: true,
      data: {
        results,
        stats,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Categorize error:', error);

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
 * PUT /api/transactions/categorize
 * Add a user pattern for future categorization
 */
export async function PUT(request: NextRequest): Promise<NextResponse<APIResponse<{ success: boolean }>>> {
  try {
    const body = await request.json();
    const { userId, pattern, category, isRegex = false } = body as {
      userId: string;
      pattern: string;
      category: string;
      isRegex?: boolean;
    };

    if (!userId || !pattern || !category) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_PARAMS',
            message: 'userId, pattern, and category are required',
          },
        },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = DEFAULT_CATEGORIES.map((c) => c.name);
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CATEGORY',
            message: `Invalid category. Valid options: ${validCategories.join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    addUserPattern(userId, pattern, category, isRegex);

    return NextResponse.json({
      success: true,
      data: { success: true },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Add pattern error:', error);

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
 * GET /api/transactions/categorize
 * Get available categories
 */
export async function GET(): Promise<NextResponse<APIResponse<{ categories: Array<{ name: string; type: string }> }>>> {
  return NextResponse.json({
    success: true,
    data: {
      categories: DEFAULT_CATEGORIES.map((c) => ({
        name: c.name,
        type: c.type,
      })),
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}
