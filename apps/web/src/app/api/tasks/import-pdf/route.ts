import { NextRequest, NextResponse } from 'next/server';
import { parsePdfToTasks, type ImportedTask } from '@/lib/pdf-parser';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ImportResponse {
  success: boolean;
  tasks: ImportedTask[];
  pageCount: number;
  error?: string;
}

// -----------------------------------------------------------------------------
// POST /api/tasks/import-pdf
// Parse PDF and return extracted tasks
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse<ImportResponse>> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, tasks: [], pageCount: 0, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
      return NextResponse.json(
        { success: false, tasks: [], pageCount: 0, error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, tasks: [], pageCount: 0, error: 'File too large (max 10MB)' },
        { status: 400 }
      );
    }

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF
    const result = await parsePdfToTasks(buffer);

    return NextResponse.json({
      success: true,
      tasks: result.tasks,
      pageCount: result.pageCount,
    });
  } catch (error) {
    console.error('PDF import error:', error);
    return NextResponse.json(
      {
        success: false,
        tasks: [],
        pageCount: 0,
        error: error instanceof Error ? error.message : 'Failed to parse PDF',
      },
      { status: 500 }
    );
  }
}

// -----------------------------------------------------------------------------
// GET /api/tasks/import-pdf
// Health check and info
// -----------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: '/api/tasks/import-pdf',
    method: 'POST',
    accepts: 'multipart/form-data',
    maxFileSize: '10MB',
    supportedFormats: ['application/pdf'],
    description: 'Upload a PDF file to extract tasks and reminders',
  });
}
