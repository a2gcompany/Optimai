import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8366279403';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; first_name: string; username?: string };
    chat: { id: number; type: string };
    date: number;
    text?: string;
  };
}

async function sendTelegramMessage(chatId: string, text: string) {
  // Telegram has 4096 char limit, truncate if needed
  const truncated = text.length > 4000 ? text.substring(0, 4000) + '...' : text;
  return fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: truncated, parse_mode: 'Markdown' }),
  }).then(r => r.json());
}

// Get recent conversation history
async function getConversationHistory(chatId: string, limit = 10) {
  const { data } = await supabase
    .from('telegram_messages')
    .select('content, direction, created_at')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!data) return [];

  return data.reverse().map(msg => ({
    role: msg.direction === 'inbound' ? 'user' as const : 'assistant' as const,
    content: msg.content,
  }));
}

// Get current system state for context
async function getSystemContext() {
  try {
    // Get active terminals
    const { data: terminals } = await supabase
      .from('terminals')
      .select('name, client_type, status, current_task, last_heartbeat')
      .neq('status', 'offline')
      .order('last_heartbeat', { ascending: false })
      .limit(5);

    // Get recent activity
    const { data: activity } = await supabase
      .from('terminal_activity')
      .select('description, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    let context = 'Estado actual de Optimai World:\n';

    if (terminals && terminals.length > 0) {
      context += `\nTerminales activos (${terminals.length}):\n`;
      terminals.forEach(t => {
        context += `- ${t.client_type}: ${t.current_task || 'sin tarea'} (${t.status})\n`;
      });
    } else {
      context += '\nNo hay terminales activos.\n';
    }

    if (activity && activity.length > 0) {
      context += '\nActividad reciente:\n';
      activity.forEach(a => {
        const time = new Date(a.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        context += `- ${time}: ${a.description}\n`;
      });
    }

    return context;
  } catch (e) {
    console.error('Error getting system context:', e);
    return 'No se pudo obtener el estado del sistema.';
  }
}

// Generate response using Claude
async function generateResponse(userMessage: string, history: Array<{role: 'user' | 'assistant', content: string}>) {
  if (!ANTHROPIC_API_KEY) {
    return 'API de Claude no configurada. Añade ANTHROPIC_API_KEY en las variables de entorno de Vercel.';
  }

  try {
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const systemContext = await getSystemContext();

    const systemPrompt = `Eres el asistente de Aitzol para Optimai World - un sistema de monitoreo de terminales de código (Claude Code, Cursor, etc).

${systemContext}

Instrucciones:
- Responde de forma concisa y útil
- Si preguntan por el estado, usa la información del contexto
- Si piden hacer algo técnico, explica que solo puedes informar, no ejecutar comandos
- Usa español casual pero profesional
- No uses emojis excesivos
- Máximo 500 caracteres en la respuesta`;

    const messages = [
      ...history.slice(-6), // Last 6 messages for context
      { role: 'user' as const, content: userMessage }
    ];

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 300,
      system: systemPrompt,
      messages,
    });

    const textContent = response.content.find(c => c.type === 'text');
    return textContent?.text || 'No pude generar una respuesta.';
  } catch (error) {
    console.error('Claude API error:', error);
    return 'Error conectando con Claude. Intenta de nuevo.';
  }
}

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();
    if (!update.message?.text) return NextResponse.json({ ok: true });

    const chatId = update.message.chat.id.toString();
    const text = update.message.text;
    const isOwner = chatId === TELEGRAM_CHAT_ID;

    console.log(`📱 Telegram from ${chatId}: ${text}`);

    // Store inbound message
    await supabase.from('telegram_messages').insert({
      chat_id: chatId,
      content: text,
      direction: 'inbound',
      processed: false,
    });

    if (isOwner) {
      // Get history and generate response
      const history = await getConversationHistory(chatId);
      const response = await generateResponse(text, history);

      // Send response
      await sendTelegramMessage(chatId, response);

      // Store outbound message
      await supabase.from('telegram_messages').insert({
        chat_id: chatId,
        content: response,
        direction: 'outbound',
        processed: true,
      });

      // Mark inbound as processed
      await supabase
        .from('telegram_messages')
        .update({ processed: true })
        .eq('chat_id', chatId)
        .eq('direction', 'inbound')
        .eq('processed', false);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Optimai Telegram webhook active', ai: !!ANTHROPIC_API_KEY });
}
