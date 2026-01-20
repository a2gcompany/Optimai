// =============================================================================
// CSV Upload API - Handle file uploads and parse transactions
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { parseCSV, parseCSVAuto, parseCSVWithPreset, BANK_PRESETS } from '@/lib/parser';
import { categorizeBatch, smartCategorize } from '@/lib/categorizer';
import type { APIResponse, CSVParseResult, ParsedTransaction, CSVParserConfig } from '@optimai/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface UploadResponse {
  parseResult: CSVParseResult;
  categorized: boolean;
}

/**
 * POST /api/upload
 * Upload and parse a CSV file
 */
export async function POST(request: NextRequest): Promise<NextResponse<APIResponse<UploadResponse>>> {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Handle multipart form data
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const preset = formData.get('preset') as string | null;
      const categorize = formData.get('categorize') !== 'false';
      const userId = formData.get('userId') as string | null;

      if (!file) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NO_FILE',
              message: 'No file provided in the request',
            },
          },
          { status: 400 }
        );
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'FILE_TOO_LARGE',
              message: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
            },
          },
          { status: 400 }
        );
      }

      // Check file type
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.csv') && !fileName.endsWith('.txt')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_FILE_TYPE',
              message: 'Only CSV and TXT files are supported',
            },
          },
          { status: 400 }
        );
      }

      // Read file content
      const content = await file.text();

      // Parse CSV
      let parseResult: CSVParseResult;

      if (preset && preset in BANK_PRESETS) {
        parseResult = parseCSVWithPreset(content, preset as keyof typeof BANK_PRESETS);
      } else {
        parseResult = parseCSVAuto(content);
      }

      // Categorize if requested
      let transactions = parseResult.transactions;
      if (categorize && transactions.length > 0) {
        transactions = await categorizeBatch(transactions, { useAI: true });
        parseResult = { ...parseResult, transactions };
      }

      return NextResponse.json({
        success: true,
        data: {
          parseResult,
          categorized: categorize,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Handle JSON body (raw CSV content)
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { content, config, categorize = true, userId } = body as {
        content: string;
        config?: Partial<CSVParserConfig>;
        categorize?: boolean;
        userId?: string;
      };

      if (!content) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NO_CONTENT',
              message: 'No CSV content provided',
            },
          },
          { status: 400 }
        );
      }

      // Parse CSV
      let parseResult = config ? parseCSV(content, config) : parseCSVAuto(content);

      // Categorize if requested
      let transactions = parseResult.transactions;
      if (categorize && transactions.length > 0) {
        transactions = await categorizeBatch(transactions, { useAI: true });
        parseResult = { ...parseResult, transactions };
      }

      return NextResponse.json({
        success: true,
        data: {
          parseResult,
          categorized: categorize,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_CONTENT_TYPE',
          message: 'Expected multipart/form-data or application/json',
        },
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Upload error:', error);

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
 * GET /api/upload
 * Get available bank presets and configuration options
 */
export async function GET(): Promise<NextResponse<APIResponse<{ presets: string[] }>>> {
  return NextResponse.json({
    success: true,
    data: {
      presets: Object.keys(BANK_PRESETS),
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}
