import { NextRequest, NextResponse } from 'next/server';
import type { TelegramUpdate } from '@optimai/types';
import { UsersRepository } from '@optimai/db';
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

    // Process message with brain
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
