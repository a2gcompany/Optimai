// =============================================================================
// @optimai/types - Tipos centrales para el ecosistema Optimai
// =============================================================================

// -----------------------------------------------------------------------------
// Telegram Types
// -----------------------------------------------------------------------------

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  photo?: TelegramPhotoSize[];
  document?: TelegramDocument;
  reply_to_message?: TelegramMessage;
}

export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramWebhookPayload {
  update_id: number;
  message?: TelegramMessage;
}

// -----------------------------------------------------------------------------
// AI / Brain Types
// -----------------------------------------------------------------------------

export type AIModel = 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-3.5-turbo';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
}

export interface AICompletionRequest {
  model: AIModel;
  messages: AIMessage[];
  temperature?: number;
  max_tokens?: number;
  functions?: AIFunction[];
  function_call?: 'auto' | 'none' | { name: string };
}

export interface AIFunction {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AICompletionResponse {
  id: string;
  model: string;
  choices: AIChoice[];
  usage: AIUsage;
}

export interface AIChoice {
  index: number;
  message: AIMessage;
  finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter';
}

export interface AIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface BrainContext {
  userId: string;
  chatId: number;
  conversationHistory: AIMessage[];
  userPreferences?: UserPreferences;
}

export interface BrainResponse {
  text: string;
  action?: BrainAction;
  confidence: number;
}

export type BrainAction =
  | { type: 'none' }
  | { type: 'create_task'; payload: CreateTaskPayload }
  | { type: 'query_finance'; payload: QueryFinancePayload }
  | { type: 'send_reminder'; payload: SendReminderPayload }
  | { type: 'analyze_document'; payload: AnalyzeDocumentPayload };

export interface CreateTaskPayload {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface QueryFinancePayload {
  query: string;
  dateRange?: DateRange;
  category?: string;
}

export interface SendReminderPayload {
  message: string;
  scheduledAt: string;
  chatId: number;
}

export interface AnalyzeDocumentPayload {
  fileId: string;
  analysisType: 'invoice' | 'receipt' | 'contract' | 'general';
}

// -----------------------------------------------------------------------------
// Database / Supabase Types
// -----------------------------------------------------------------------------

export interface User {
  id: string;
  telegram_id: number;
  telegram_username?: string;
  first_name: string;
  last_name?: string;
  email?: string;
  is_active: boolean;
  is_admin: boolean;
  preferences: UserPreferences;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  language: 'es' | 'en';
  timezone: string;
  notifications_enabled: boolean;
  daily_summary_time?: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  telegram_chat_id: number;
  messages: ConversationMessage[];
  context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  completed_at?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  message: string;
  scheduled_at: string;
  sent_at?: string;
  telegram_chat_id: number;
  is_recurring: boolean;
  recurrence_pattern?: RecurrencePattern;
  created_at: string;
}

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  end_date?: string;
}

// -----------------------------------------------------------------------------
// Finance Types
// -----------------------------------------------------------------------------

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  type: 'income' | 'expense';
  category_id?: string;
  description?: string;
  date: string;
  source: TransactionSource;
  metadata?: TransactionMetadata;
  created_at: string;
  updated_at: string;
}

export type TransactionSource =
  | { type: 'manual' }
  | { type: 'csv_import'; filename: string }
  | { type: 'bank_sync'; bank_id: string }
  | { type: 'receipt_scan'; file_id: string };

export interface TransactionMetadata {
  merchant?: string;
  location?: string;
  receipt_url?: string;
  notes?: string;
  tags?: string[];
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon?: string;
  color?: string;
  parent_id?: string;
  type: 'income' | 'expense' | 'both';
  is_system: boolean;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date?: string;
  alerts_enabled: boolean;
  alert_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface FinancialSummary {
  period: DateRange;
  total_income: number;
  total_expenses: number;
  net: number;
  by_category: CategorySummary[];
  top_expenses: Transaction[];
  trend: 'up' | 'down' | 'stable';
}

export interface CategorySummary {
  category: Category;
  total: number;
  percentage: number;
  transaction_count: number;
}

export interface DateRange {
  start: string;
  end: string;
}

// -----------------------------------------------------------------------------
// CSV Parser Types
// -----------------------------------------------------------------------------

export interface CSVParserConfig {
  delimiter: string;
  hasHeader: boolean;
  dateColumn: string;
  amountColumn: string;
  descriptionColumn: string;
  dateFormat: string;
  encoding: 'utf-8' | 'latin1' | 'utf-16';
}

export interface ParsedTransaction {
  date: string;
  amount: number;
  description: string;
  raw: Record<string, string>;
  confidence: number;
  suggestedCategory?: string;
}

export interface CSVParseResult {
  success: boolean;
  transactions: ParsedTransaction[];
  errors: CSVParseError[];
  stats: {
    total_rows: number;
    parsed_rows: number;
    error_rows: number;
  };
}

export interface CSVParseError {
  row: number;
  column?: string;
  message: string;
  raw?: string;
}

// -----------------------------------------------------------------------------
// API Response Types
// -----------------------------------------------------------------------------

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta?: APIMeta;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface APIMeta {
  pagination?: PaginationMeta;
  timestamp: string;
  request_id?: string;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

// -----------------------------------------------------------------------------
// Cron / Scheduled Jobs Types
// -----------------------------------------------------------------------------

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  handler: string;
  payload?: Record<string, unknown>;
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
}

export interface CronJobResult {
  job_id: string;
  started_at: string;
  completed_at: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

// -----------------------------------------------------------------------------
// Agent Types
// -----------------------------------------------------------------------------

export interface AgentTask {
  id: string;
  type: AgentTaskType;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  attempts: number;
  max_attempts: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export type AgentTaskType =
  | 'send_daily_summary'
  | 'process_reminders'
  | 'analyze_spending'
  | 'categorize_transactions'
  | 'generate_report';

export interface AgentConfig {
  max_concurrent_tasks: number;
  task_timeout_ms: number;
  retry_delay_ms: number;
  enabled_tasks: AgentTaskType[];
}

// -----------------------------------------------------------------------------
// Utility Types
// -----------------------------------------------------------------------------

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type AsyncResult<T, E = Error> = Promise<
  { success: true; data: T } | { success: false; error: E }
>;

// Type guards
export function isTelegramMessage(update: TelegramUpdate): update is TelegramUpdate & { message: TelegramMessage } {
  return update.message !== undefined;
}

export function isCallbackQuery(update: TelegramUpdate): update is TelegramUpdate & { callback_query: TelegramCallbackQuery } {
  return update.callback_query !== undefined;
}
