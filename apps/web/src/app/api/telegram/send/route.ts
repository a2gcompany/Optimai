import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8366279403';

export async function POST(request: NextRequest) {
  try {
    const { message, chatId } = await request.json();
    const targetChat = chatId || TELEGRAM_CHAT_ID;

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChat,
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    );

    const data = await response.json();
    return NextResponse.json({ ok: data.ok, messageId: data.result?.message_id });
  } catch (error) {
    console.error('Error sending telegram:', error);
    return NextResponse.json({ ok: false, error: 'Failed to send' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/telegram/send',
    method: 'POST',
    body: { message: 'string', chatId: 'optional' },
  });
}
