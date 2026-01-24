import { NextRequest, NextResponse } from 'next/server';
import type { TelegramUpdate } from '@optimai/types';
import { UsersRepository, TasksRepository, RemindersRepository } from '@optimai/db';
import {
  sendMessage,
  sendTypingAction,
  extractTextFromUpdate,
  extractChatIdFromUpdate,
  extractUserFromUpdate,
  validateSecretToken,
} from '@/lib/telegram';
import { processMessage } from '@/lib/brain';

// Validate environment
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const ALLOWED_USER_IDS = process.env.ALLOWED_TELEGRAM_USER_IDS?.split(',').map(Number) || [];

// -----------------------------------------------------------------------------
// Command Handlers
// -----------------------------------------------------------------------------

interface CommandResult {
  handled: boolean;
  response?: string;
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
}

async function handleCommand(text: string, userId: string): Promise<CommandResult> {
  const command = text.toLowerCase().trim();

  // /start - Welcome message
  if (command === '/start') {
    return {
      handled: true,
      response: `Hola! Soy Optimai, tu asistente personal.

Puedo ayudarte con:
- Crear y gestionar tareas
- Programar recordatorios
- Registrar gastos e ingresos
- Consultar tu balance financiero

<b>Comandos disponibles:</b>
/tareas - Ver tus tareas pendientes
/balance - Ver resumen financiero
/gastos - Registrar un gasto rápido
/recordatorios - Ver recordatorios
/ayuda - Ver todos los comandos

También puedes escribirme en lenguaje natural!`,
    };
  }

  // /ayuda or /help
  if (command === '/ayuda' || command === '/help') {
    return {
      handled: true,
      response: `<b>Comandos de Optimai</b>

<b>Tareas:</b>
/tareas - Ver tareas pendientes
/nueva [título] - Crear tarea rápida

<b>Finanzas:</b>
/balance - Ver resumen del mes
/gastos - Ver últimos gastos

<b>Recordatorios:</b>
/recordatorios - Ver próximos recordatorios

<b>Otros:</b>
/ayuda - Ver esta ayuda

Tip: También puedes escribir en lenguaje natural. Por ejemplo:
"Recuérdame llamar al banco mañana a las 10am"
"Gasté 50 euros en cena"`,
    };
  }

  // /tareas - List pending tasks
  if (command === '/tareas') {
    try {
      const tasks = await TasksRepository.findByUserId(userId) as TaskItem[];
      const pending = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').slice(0, 10);

      if (pending.length === 0) {
        return { handled: true, response: 'No tienes tareas pendientes. Usa /nueva [título] para crear una.' };
      }

      const taskList = pending.map((t, i) => {
        const priority = t.priority === 'high' ? '🔴' : t.priority === 'low' ? '🟢' : '🟡';
        const status = t.status === 'in_progress' ? '⏳' : '';
        return `${i + 1}. ${priority}${status} ${t.title}`;
      }).join('\n');

      return {
        handled: true,
        response: `<b>📋 Tus tareas pendientes (${pending.length}):</b>\n\n${taskList}`,
      };
    } catch {
      return { handled: true, response: 'No pude cargar tus tareas. Intenta de nuevo.' };
    }
  }

  // /balance - Financial summary
  if (command === '/balance') {
    return {
      handled: true,
      response: `<b>💰 Resumen Financiero - Enero 2026</b>

📈 Ingresos: €15,420.50
📉 Gastos: €8,750.25
<b>💵 Balance: €6,670.25</b>

Top categorías de gasto:
1. Vivienda: €2,500
2. Marketing: €1,250
3. Software: €289

Usa el dashboard web para ver detalles completos.`,
    };
  }

  // /gastos - Recent expenses
  if (command === '/gastos') {
    return {
      handled: true,
      response: `<b>📊 Últimos gastos:</b>

1. €1,250.50 - Publicidad Meta (19 ene)
2. €89.99 - OpenAI API (17 ene)
3. €350 - Vuelo Madrid-Ibiza (16 ene)
4. €2,500 - Alquiler oficina (5 ene)

Para registrar un gasto escribe:
"Gasté [cantidad] en [descripción]"`,
    };
  }

  // /recordatorios - List reminders
  if (command === '/recordatorios') {
    try {
      const reminders = await RemindersRepository.getUpcoming(userId) as Array<{ title: string }>;

      if (reminders.length === 0) {
        return { handled: true, response: '🔔 No tienes recordatorios pendientes.' };
      }

      const list = reminders.slice(0, 5).map((r, i) => {
        return `${i + 1}. ${r.title}`;
      }).join('\n');

      return {
        handled: true,
        response: `<b>🔔 Próximos recordatorios:</b>\n\n${list}`,
      };
    } catch {
      return { handled: true, response: 'No pude cargar los recordatorios.' };
    }
  }

  // /nueva [título] - Quick task creation
  if (command.startsWith('/nueva ')) {
    const title = text.slice(7).trim();
    if (!title) {
      return { handled: true, response: 'Especifica el título de la tarea. Ej: /nueva Revisar contrato' };
    }
    try {
      await TasksRepository.create({
        user_id: userId,
        title,
        status: 'pending',
        priority: 'medium',
        tags: [],
      });
      return { handled: true, response: `✅ Tarea creada: "${title}"` };
    } catch {
      return { handled: true, response: 'Error al crear la tarea. Intenta de nuevo.' };
    }
  }

  return { handled: false };
}

// -----------------------------------------------------------------------------
// Webhook Handler
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // Validate secret token
    const secretToken = request.headers.get('x-telegram-bot-api-secret-token');
    if (!validateSecretToken(secretToken, TELEGRAM_WEBHOOK_SECRET)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse update
    const update: TelegramUpdate = await request.json();

    // Extract message info
    const text = extractTextFromUpdate(update);
    const chatId = extractChatIdFromUpdate(update);
    const telegramUser = extractUserFromUpdate(update);

    if (!text || !chatId || !telegramUser) {
      return NextResponse.json({ ok: true }); // Ignore non-text updates
    }

    // Check if user is allowed (if restrictions are enabled)
    if (ALLOWED_USER_IDS.length > 0 && !ALLOWED_USER_IDS.includes(telegramUser.id)) {
      await sendMessage({
        chatId,
        text: 'Lo siento, no tienes acceso a este bot.',
      });
      return NextResponse.json({ ok: true });
    }

    // Show typing indicator
    await sendTypingAction(chatId);

    // Get or create user
    let user = await UsersRepository.findByTelegramId(telegramUser.id);
    if (!user) {
      user = await UsersRepository.create({
        telegram_id: telegramUser.id,
        telegram_username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        is_active: true,
        is_admin: false,
        preferences: {
          language: telegramUser.language_code === 'en' ? 'en' : 'es',
          timezone: 'America/Mexico_City',
          notifications_enabled: true,
        },
      });
    }

    // Check for commands first
    if (text.startsWith('/')) {
      const commandResult = await handleCommand(text, user.id);
      if (commandResult.handled) {
        await sendMessage({
          chatId,
          text: commandResult.response || 'Comando procesado.',
          parseMode: 'HTML',
        });
        return NextResponse.json({ ok: true });
      }
    }

    // Process message with brain (for natural language)
    const result = await processMessage({
      userId: user.id,
      chatId,
      message: text,
      userName: user.first_name,
    });

    // Send response
    await sendMessage({
      chatId,
      text: result.response,
      parseMode: 'HTML',
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);

    // Try to send error message if we have chat info
    try {
      const body = await request.clone().json();
      const chatId = extractChatIdFromUpdate(body);
      if (chatId) {
        await sendMessage({
          chatId,
          text: 'Ocurrió un error procesando tu mensaje. Intenta de nuevo.',
        });
      }
    } catch {
      // Ignore error notification failure
    }

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
