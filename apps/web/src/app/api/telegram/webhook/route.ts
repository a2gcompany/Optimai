import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8366279403';

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
  return fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  }).then(r => r.json());
}

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();
    if (!update.message?.text) return NextResponse.json({ ok: true });

    const chatId = update.message.chat.id.toString();
    const text = update.message.text;
    const isOwner = chatId === TELEGRAM_CHAT_ID;

    console.log(`Telegram from ${chatId}: ${text}`);

    // Store in telegram_messages table
    await supabase.from('telegram_messages').insert({
      chat_id: chatId,
      content: text,
      direction: 'inbound',
      processed: false,
    });

    if (isOwner) {
      await sendTelegramMessage(chatId, 'Recibido. Claude procesara cuando este disponible.');
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Optimai Telegram webhook active' });
}
