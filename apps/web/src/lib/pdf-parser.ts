// =============================================================================
// PDF Parser - Extract tasks/reminders from PDF files
// =============================================================================

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ImportedTask {
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: 'pdf_import';
  originalText: string;
  confidence: number;
}

export interface ParseResult {
  tasks: ImportedTask[];
  rawText: string;
  pageCount: number;
}

// -----------------------------------------------------------------------------
// Date Parsing Utilities
// -----------------------------------------------------------------------------

const MONTHS_ES: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
};

const DAYS_ES: Record<string, number> = {
  lunes: 1, martes: 2, miércoles: 3, miercoles: 3, jueves: 4, viernes: 5, sábado: 6, sabado: 6, domingo: 0,
};

function parseRelativeDate(text: string): string | undefined {
  const lower = text.toLowerCase();
  const today = new Date();

  if (lower.includes('hoy')) {
    return today.toISOString().split('T')[0];
  }

  if (lower.includes('mañana') || lower.includes('manana')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  if (lower.includes('pasado mañana') || lower.includes('pasado manana')) {
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    return dayAfter.toISOString().split('T')[0];
  }

  // "próximo lunes", "siguiente martes", etc.
  const nextDayMatch = lower.match(/(?:próximo|proximo|siguiente)\s+(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)/i);
  if (nextDayMatch) {
    const targetDay = DAYS_ES[nextDayMatch[1].toLowerCase()];
    if (targetDay !== undefined) {
      const result = new Date(today);
      const currentDay = result.getDay();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      result.setDate(result.getDate() + daysToAdd);
      return result.toISOString().split('T')[0];
    }
  }

  return undefined;
}

function parseAbsoluteDate(text: string): string | undefined {
  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // YYYY-MM-DD
  const ymdMatch = text.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // "25 de enero", "3 enero 2026"
  const textDateMatch = text.match(/(\d{1,2})\s*(?:de\s*)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)(?:\s*(?:de\s*)?(\d{4}))?/i);
  if (textDateMatch) {
    const [, day, monthStr, yearStr] = textDateMatch;
    const month = MONTHS_ES[monthStr.toLowerCase()];
    const year = yearStr ? parseInt(yearStr) : new Date().getFullYear();
    if (month !== undefined) {
      return `${year}-${String(month + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  return undefined;
}

function parseTime(text: string): string | undefined {
  // HH:MM or H:MM
  const timeMatch = text.match(/(\d{1,2}):(\d{2})(?:\s*(am|pm))?/i);
  if (timeMatch) {
    let [, hours, minutes, ampm] = timeMatch;
    let h = parseInt(hours);
    if (ampm?.toLowerCase() === 'pm' && h < 12) h += 12;
    if (ampm?.toLowerCase() === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${minutes}`;
  }

  // "10am", "3pm"
  const shortTimeMatch = text.match(/(\d{1,2})\s*(am|pm)/i);
  if (shortTimeMatch) {
    let [, hours, ampm] = shortTimeMatch;
    let h = parseInt(hours);
    if (ampm.toLowerCase() === 'pm' && h < 12) h += 12;
    if (ampm.toLowerCase() === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:00`;
  }

  // "por la mañana", "por la tarde", "por la noche"
  if (text.toLowerCase().includes('por la mañana') || text.toLowerCase().includes('por la manana')) {
    return '09:00';
  }
  if (text.toLowerCase().includes('por la tarde')) {
    return '15:00';
  }
  if (text.toLowerCase().includes('por la noche')) {
    return '20:00';
  }

  return undefined;
}

// -----------------------------------------------------------------------------
// Priority Detection
// -----------------------------------------------------------------------------

function detectPriority(text: string): ImportedTask['priority'] {
  const lower = text.toLowerCase();

  if (lower.includes('urgente') || lower.includes('crítico') || lower.includes('critico') || lower.includes('asap') || lower.includes('inmediato')) {
    return 'urgent';
  }

  if (lower.includes('importante') || lower.includes('alta') || lower.includes('prioridad alta') || lower.includes('high')) {
    return 'high';
  }

  if (lower.includes('baja') || lower.includes('cuando puedas') || lower.includes('sin prisa') || lower.includes('low')) {
    return 'low';
  }

  return 'medium';
}

// -----------------------------------------------------------------------------
// Task Extraction
// -----------------------------------------------------------------------------

function extractTasksFromText(text: string): ImportedTask[] {
  const tasks: ImportedTask[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Patterns that indicate a task/reminder
  const taskPatterns = [
    /^[-•*]\s*(.+)$/,                          // Bullet points: - Task, • Task, * Task
    /^(\d+)[.)]\s*(.+)$/,                      // Numbered: 1. Task, 1) Task
    /^(?:TODO|TASK|TAREA|RECORDAR|REMINDER):\s*(.+)$/i,  // TODO: Task
    /^(?:\[[ x]\])\s*(.+)$/i,                  // [ ] Task, [x] Task
    /^(?:◯|○|●|◉|☐|☑|✓|✗)\s*(.+)$/,           // Unicode bullets
  ];

  // Date/time prefix patterns
  const dateTimePrefixes = [
    /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\s*[-–:]\s*(.+)$/,  // 25/01/2026 - Task
    /^(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\s*[-–:]\s*(.+)$/,  // 2026-01-25 - Task
    /^(\d{1,2}:\d{2}(?:\s*(?:am|pm))?)\s*[-–:]\s*(.+)$/i,  // 10:00 - Task
    /^((?:hoy|mañana|manana|lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo))\s*[-–:]\s*(.+)$/i,
  ];

  for (const line of lines) {
    let title = '';
    let originalText = line;
    let confidence = 0.5;

    // Try task patterns
    for (const pattern of taskPatterns) {
      const match = line.match(pattern);
      if (match) {
        title = match[match.length - 1].trim();
        confidence = 0.8;
        break;
      }
    }

    // Try date/time prefix patterns
    if (!title) {
      for (const pattern of dateTimePrefixes) {
        const match = line.match(pattern);
        if (match) {
          title = match[2].trim();
          confidence = 0.85;
          break;
        }
      }
    }

    // If no pattern matched but line looks like a task (contains action verbs)
    if (!title) {
      const actionVerbs = /^(?:llamar|enviar|revisar|preparar|crear|actualizar|completar|terminar|hacer|comprar|pagar|contactar|escribir|leer|verificar|confirmar|agendar|programar|organizar|reunión|meeting|call|email|check)/i;
      if (actionVerbs.test(line)) {
        title = line;
        confidence = 0.6;
      }
    }

    // Skip if no title extracted or too short
    if (!title || title.length < 3) continue;

    // Extract date and time
    const dueDate = parseAbsoluteDate(line) || parseRelativeDate(line);
    const dueTime = parseTime(line);

    // Extract priority
    const priority = detectPriority(line);

    // Clean up title (remove date/time/priority markers)
    let cleanTitle = title
      .replace(/\(urgente\)/gi, '')
      .replace(/\(importante\)/gi, '')
      .replace(/\(alta\)/gi, '')
      .replace(/\(baja\)/gi, '')
      .replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/g, '')
      .replace(/\d{1,2}:\d{2}(?:\s*(?:am|pm))?/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Remove trailing dashes or colons
    cleanTitle = cleanTitle.replace(/[-–:]+$/, '').trim();

    if (cleanTitle.length >= 3) {
      tasks.push({
        title: cleanTitle,
        dueDate,
        dueTime,
        priority,
        source: 'pdf_import',
        originalText,
        confidence,
      });
    }
  }

  // Remove duplicates
  const seen = new Set<string>();
  return tasks.filter(task => {
    const key = task.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// -----------------------------------------------------------------------------
// Main Parser Function
// -----------------------------------------------------------------------------

export async function parsePdfToTasks(pdfBuffer: Buffer): Promise<ParseResult> {
  try {
    // Dynamic import for pdf-parse v2.x
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
    const textResult = await parser.getText();

    const tasks = extractTasksFromText(textResult.text);

    return {
      tasks,
      rawText: textResult.text,
      pageCount: textResult.pages.length,
    };
  } catch (error) {
    throw new Error(`Error parsing PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// -----------------------------------------------------------------------------
// Utility: Parse text directly (for testing)
// -----------------------------------------------------------------------------

export function parseTextToTasks(text: string): ImportedTask[] {
  return extractTasksFromText(text);
}
