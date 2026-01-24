// =============================================================================
// Telegram Bot API Client
// =============================================================================

import type { TelegramMessage, TelegramUpdate } from '@optimai/types';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

function getToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
  }
  return token;
}

function apiUrl(method: string): string {
  return `${TELEGRAM_API_BASE}${getToken()}/${method}`;
}

// -----------------------------------------------------------------------------
// Core API Methods
// -----------------------------------------------------------------------------

interface TelegramApiResponse<T = unknown> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

async function callApi<T>(
  method: string,
  body?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(apiUrl(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data: TelegramApiResponse<T> = await response.json();

  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description || 'Unknown error'}`);
  }

  return data.result as T;
}

// -----------------------------------------------------------------------------
// Message Methods
// -----------------------------------------------------------------------------

export interface SendMessageOptions {
  chatId: number;
  text: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  replyToMessageId?: number;
  disableNotification?: boolean;
}

export async function sendMessage(options: SendMessageOptions): Promise<TelegramMessage> {
  return callApi<TelegramMessage>('sendMessage', {
    chat_id: options.chatId,
    text: options.text,
    parse_mode: options.parseMode,
    reply_to_message_id: options.replyToMessageId,
    disable_notification: options.disableNotification,
  });
}

export async function sendTypingAction(chatId: number): Promise<boolean> {
  return callApi<boolean>('sendChatAction', {
    chat_id: chatId,
    action: 'typing',
  });
}

// -----------------------------------------------------------------------------
// File Methods
// -----------------------------------------------------------------------------

export interface TelegramFile {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

export async function getFile(fileId: string): Promise<TelegramFile> {
  return callApi<TelegramFile>('getFile', { file_id: fileId });
}

export function getFileDownloadUrl(filePath: string): string {
  return `https://api.telegram.org/file/bot${getToken()}/${filePath}`;
}

export async function downloadFile(fileId: string): Promise<ArrayBuffer> {
  const file = await getFile(fileId);
  if (!file.file_path) {
    throw new Error('File path not available');
  }

  const url = getFileDownloadUrl(file.file_path);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  return response.arrayBuffer();
}

// -----------------------------------------------------------------------------
// Webhook Management
// -----------------------------------------------------------------------------

export interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
}

export async function setWebhook(url: string, secretToken?: string): Promise<boolean> {
  return callApi<boolean>('setWebhook', {
    url,
    secret_token: secretToken,
    allowed_updates: ['message', 'callback_query'],
  });
}

export async function deleteWebhook(): Promise<boolean> {
  return callApi<boolean>('deleteWebhook');
}

export async function getWebhookInfo(): Promise<WebhookInfo> {
  return callApi<WebhookInfo>('getWebhookInfo');
}

// -----------------------------------------------------------------------------
// Update Parsing Helpers
// -----------------------------------------------------------------------------

export function extractTextFromUpdate(update: TelegramUpdate): string | null {
  if (update.message?.text) {
    return update.message.text;
  }
  if (update.callback_query?.data) {
    return update.callback_query.data;
  }
  return null;
}

export function extractChatIdFromUpdate(update: TelegramUpdate): number | null {
  if (update.message?.chat.id) {
    return update.message.chat.id;
  }
  if (update.callback_query?.message?.chat.id) {
    return update.callback_query.message.chat.id;
  }
  return null;
}

export function extractUserFromUpdate(update: TelegramUpdate) {
  if (update.message?.from) {
    return update.message.from;
  }
  if (update.callback_query?.from) {
    return update.callback_query.from;
  }
  return null;
}

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

export function validateSecretToken(
  receivedToken: string | null,
  expectedToken: string | undefined
): boolean {
  if (!expectedToken) return true;
  return receivedToken === expectedToken;
}
