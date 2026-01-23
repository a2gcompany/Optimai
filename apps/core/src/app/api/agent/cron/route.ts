import { NextRequest, NextResponse } from 'next/server';
import { RemindersRepository, UsersRepository } from '@optimai/db';
import { sendMessage } from '@/lib/telegram';
import type { Reminder, User } from '@optimai/types';

// Cron secret for Vercel Cron Jobs
const CRON_SECRET = process.env.CRON_SECRET;

// -----------------------------------------------------------------------------
// Cron Handler - Processes scheduled reminders
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    // Validate cron secret (Vercel sends this header for cron jobs)
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const results = {
      processed: 0,
      sent: 0,
      errors: 0,
      details: [] as Array<{ id: string; status: string; error?: string }>,
    };

    // Get all pending reminders
    const pendingReminders = await getPendingReminders(now);
    results.processed = pendingReminders.length;

    // Process each reminder
    for (const reminder of pendingReminders) {
      try {
        // Send the reminder
        await sendMessage({
          chatId: reminder.telegram_chat_id,
          text: `🔔 <b>Recordatorio</b>\n\n${reminder.message}`,
          parseMode: 'HTML',
        });

        // Mark as sent
        await RemindersRepository.update(reminder.id, {
          sent_at: now.toISOString(),
        });

        // Handle recurring reminders
        if (reminder.is_recurring && reminder.recurrence_pattern) {
          await scheduleNextRecurrence(reminder);
        }

        results.sent++;
        results.details.push({ id: reminder.id, status: 'sent' });
      } catch (error) {
        results.errors++;
        results.details.push({
          id: reminder.id,
          status: 'error',
          error: String(error),
        });
      }
    }

    // Process daily summaries if it's the right time (8 AM local)
    const hour = now.getUTCHours(); // Adjust based on user timezone
    if (hour === 14) {
      // 8 AM CST (UTC-6)
      await processDailySummaries(now);
    }

    return NextResponse.json({
      ok: true,
      timestamp: now.toISOString(),
      ...results,
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: String(error) },
      { status: 500 }
    );
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

async function getPendingReminders(now: Date): Promise<Reminder[]> {
  // Get all reminders that should be sent
  // (scheduled_at <= now AND sent_at IS NULL)
  const allReminders = await RemindersRepository.findPending();

  return allReminders.filter((r: Reminder) => {
    const scheduledAt = new Date(r.scheduled_at);
    return scheduledAt <= now && !r.sent_at;
  });
}

async function scheduleNextRecurrence(reminder: Reminder): Promise<void> {
  if (!reminder.recurrence_pattern) return;

  const { frequency, interval, end_date } = reminder.recurrence_pattern;
  const currentDate = new Date(reminder.scheduled_at);
  let nextDate: Date;

  switch (frequency) {
    case 'daily':
      nextDate = new Date(currentDate.getTime() + interval * 24 * 60 * 60 * 1000);
      break;
    case 'weekly':
      nextDate = new Date(currentDate.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
      break;
    case 'monthly':
      nextDate = new Date(currentDate);
      nextDate.setMonth(nextDate.getMonth() + interval);
      break;
    default:
      return;
  }

  // Check if next date is beyond end_date
  if (end_date && nextDate > new Date(end_date)) {
    return;
  }

  // Create new reminder for next occurrence
  await RemindersRepository.create({
    user_id: reminder.user_id,
    telegram_chat_id: reminder.telegram_chat_id,
    message: reminder.message,
    scheduled_at: nextDate.toISOString(),
    is_recurring: true,
    recurrence_pattern: reminder.recurrence_pattern,
  });
}

async function processDailySummaries(now: Date): Promise<void> {
  // Get users with daily summaries enabled
  const users = await UsersRepository.findAll();
  const eligibleUsers = users.filter(
    (u: User) => u.is_active && u.preferences?.daily_summary_time
  );

  for (const user of eligibleUsers) {
    try {
      // TODO: Generate and send daily summary
      // This will be implemented with finance integration
      console.log(`Would send daily summary to user ${user.id}`);
    } catch (error) {
      console.error(`Failed to send summary to user ${user.id}:`, error);
    }
  }
}

// Vercel Cron configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
