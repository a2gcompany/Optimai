import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Telegram API
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Allowed users (optional restriction)
const ALLOWED_USER_IDS = process.env.ALLOWED_TELEGRAM_USER_IDS?.split(',').map(Number) || [];

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: { id: number; type: string };
  date: number;
  text?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

async function sendMessage(chatId: number, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML') {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      }),
    });
    return response.ok;
  } catch (e) {
    console.error('Error sending message:', e);
    return false;
  }
}

async function sendTypingAction(chatId: number) {
  try {
    await fetch(`${TELEGRAM_API}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        action: 'typing',
      }),
    });
  } catch {
    // Ignore typing action errors
  }
}

// Simple command processor
async function processCommand(text: string, userId: string): Promise<string> {
  const lowerText = text.toLowerCase().trim();

  // /start command
  if (lowerText === '/start') {
    return `<b>Bienvenido a Optimai</b>

Tu asistente personal para gestionar:
- Tareas y proyectos
- Finanzas y transacciones
- Recordatorios
- Ideas y mejoras

<b>Comandos disponibles:</b>
/tareas - Ver tareas pendientes
/recordatorios - Ver recordatorios
/stats - Ver estadísticas
/help - Ayuda`;
  }

  // /tareas command
  if (lowerText === '/tareas' || lowerText.includes('tareas')) {
    const { data: tasks } = await supabase
      .from('dev_tasks')
      .select('*')
      .in('status', ['pending', 'in_progress'])
      .order('priority', { ascending: false })
      .limit(5);

    if (!tasks || tasks.length === 0) {
      return 'No tienes tareas pendientes.';
    }

    let response = '<b>Tareas pendientes:</b>\n\n';
    tasks.forEach((t, i) => {
      const emoji = t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '🟢';
      response += `${emoji} ${t.title}\n`;
      if (t.description) {
        response += `   <i>${t.description.substring(0, 50)}...</i>\n`;
      }
    });

    return response;
  }

  // /recordatorios command
  if (lowerText === '/recordatorios' || lowerText.includes('recordatorio')) {
    const { data: reminders } = await supabase
      .from('reminders')
      .select('*')
      .eq('is_completed', false)
      .order('priority', { ascending: false })
      .limit(5);

    if (!reminders || reminders.length === 0) {
      return 'No tienes recordatorios pendientes.';
    }

    let response = '<b>Recordatorios:</b>\n\n';
    reminders.forEach((r) => {
      response += `🔔 ${r.title}\n`;
      if (r.list_name) {
        response += `   📁 ${r.list_name}\n`;
      }
    });

    return response;
  }

  // /stats command
  if (lowerText === '/stats' || lowerText.includes('estadistica')) {
    const [tasks, reminders] = await Promise.all([
      supabase.from('dev_tasks').select('status'),
      supabase.from('reminders').select('is_completed'),
    ]);

    const taskStats = {
      total: tasks.data?.length || 0,
      pending: tasks.data?.filter(t => t.status === 'pending').length || 0,
      completed: tasks.data?.filter(t => t.status === 'completed' || t.status === 'done').length || 0,
    };

    const reminderStats = {
      total: reminders.data?.length || 0,
      pending: reminders.data?.filter(r => !r.is_completed).length || 0,
    };

    return `<b>Estadísticas</b>

📋 <b>Tareas:</b>
   Total: ${taskStats.total}
   Pendientes: ${taskStats.pending}
   Completadas: ${taskStats.completed}

🔔 <b>Recordatorios:</b>
   Total: ${reminderStats.total}
   Pendientes: ${reminderStats.pending}`;
  }

  // /help command
  if (lowerText === '/help' || lowerText === 'ayuda') {
    return `<b>Comandos de Optimai:</b>

/start - Iniciar el bot
/tareas - Ver tareas pendientes
/recordatorios - Ver recordatorios
/stats - Ver estadísticas
/help - Mostrar esta ayuda

También puedes escribir mensajes naturales como:
- "mis tareas"
- "recordatorios"
- "estadísticas"`;
  }

  // Default response
  return `Hola! Soy Optimai, tu asistente personal.

Puedes usar comandos como:
- /tareas - Ver tareas
- /recordatorios - Ver recordatorios
- /stats - Estadísticas
- /help - Ayuda

O visita el dashboard web para más funciones.`;
}

export async function POST(request: NextRequest) {
  try {
    // Validate secret token (optional)
    const secretToken = request.headers.get('x-telegram-bot-api-secret-token');
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expectedSecret && secretToken !== expectedSecret) {
      console.log('Invalid secret token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse update
    const update: TelegramUpdate = await request.json();

    // Extract message info
    const message = update.message;
    if (!message || !message.text || !message.from) {
      return NextResponse.json({ ok: true }); // Ignore non-text updates
    }

    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text;
    const userName = message.from.first_name;

    // Check if user is allowed (if restrictions are enabled)
    if (ALLOWED_USER_IDS.length > 0 && !ALLOWED_USER_IDS.includes(userId)) {
      await sendMessage(chatId, 'Lo siento, no tienes acceso a este bot.');
      return NextResponse.json({ ok: true });
    }

    // Show typing indicator
    await sendTypingAction(chatId);

    // Process the message
    const response = await processCommand(text, String(userId));

    // Send response
    await sendMessage(chatId, response);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'optimai-telegram-webhook',
    timestamp: new Date().toISOString(),
  });
}
