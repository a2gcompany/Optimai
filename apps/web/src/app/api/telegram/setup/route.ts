import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const CRON_SECRET = process.env.CRON_SECRET;

interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
}

// Set webhook endpoint
export async function POST(request: NextRequest) {
  try {
    // Validate secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}` && CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 500 });
    }

    // Get webhook URL from request or use default
    const body = await request.json().catch(() => ({}));
    const webhookUrl = body.url || `${request.nextUrl.origin}/api/telegram/webhook`;

    // Set webhook with Telegram API
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: TELEGRAM_WEBHOOK_SECRET,
        allowed_updates: ['message', 'callback_query'],
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      return NextResponse.json({
        success: false,
        error: result.description || 'Failed to set webhook',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook configured successfully',
      webhookUrl,
    });
  } catch (error) {
    console.error('Setup webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Get webhook info endpoint
export async function GET(request: NextRequest) {
  try {
    // Validate secret for production
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}` && CRON_SECRET && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json({
        configured: false,
        error: 'TELEGRAM_BOT_TOKEN not configured',
      });
    }

    // Get webhook info from Telegram API
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
    const result = await response.json();

    if (!result.ok) {
      return NextResponse.json({
        configured: false,
        error: result.description || 'Failed to get webhook info',
      });
    }

    const info: WebhookInfo = result.result;

    return NextResponse.json({
      configured: !!info.url,
      webhookUrl: info.url || null,
      pendingUpdates: info.pending_update_count,
      lastError: info.last_error_message || null,
      lastErrorDate: info.last_error_date
        ? new Date(info.last_error_date * 1000).toISOString()
        : null,
      hasCustomCertificate: info.has_custom_certificate,
    });
  } catch (error) {
    console.error('Get webhook info error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Delete webhook endpoint
export async function DELETE(request: NextRequest) {
  try {
    // Validate secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}` && CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 500 });
    }

    // Delete webhook
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`);
    const result = await response.json();

    if (!result.ok) {
      return NextResponse.json({
        success: false,
        error: result.description || 'Failed to delete webhook',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error) {
    console.error('Delete webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
