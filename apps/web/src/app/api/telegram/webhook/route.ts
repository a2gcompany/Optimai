import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; first_name: string; username?: string };
    chat: { id: number };
    text?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();
    if (!update.message?.text) return NextResponse.json({ ok: true });

    const msg = update.message;
    const supabase = getSupabase();

    if (supabase) {
      await supabase.from('telegram_messages').insert({
        chat_id: msg.chat.id.toString(),
        message_id: msg.message_id,
        from_username: msg.from.username || msg.from.first_name,
        content: msg.text,
        direction: 'inbound',
        processed: false,
      });
    }

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: msg.chat.id, text: 'Procesando...' }),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
