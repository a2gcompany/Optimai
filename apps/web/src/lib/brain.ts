// =============================================================================
// Brain - AI processing layer for Optimai
// =============================================================================

import {
  createCompletionWithFunctions,
  OPTIMAI_FUNCTIONS,
  OPTIMAI_SYSTEM_PROMPT,
  createContextualPrompt,
  type Message,
  type FunctionCallResult,
} from '@optimai/ai';
import {
  UsersRepository,
  ConversationsRepository,
  TasksRepository,
  RemindersRepository,
} from '@optimai/db';
import type { User, BrainAction, Task, Reminder } from '@optimai/types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface BrainInput {
  userId: string;
  chatId: number;
  message: string;
  userName?: string;
}

export interface BrainOutput {
  response: string;
  action: BrainAction | null;
  actionResult?: unknown;
}

// -----------------------------------------------------------------------------
// Action Handlers
// -----------------------------------------------------------------------------

async function handleCreateTask(
  userId: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; task?: Task; error?: string }> {
  try {
    const task = await TasksRepository.create({
      user_id: userId,
      title: args.title as string,
      description: args.description as string | undefined,
      due_date: args.due_date as string | undefined,
      priority: (args.priority as 'low' | 'medium' | 'high') || 'medium',
      status: 'pending',
      tags: [],
    });
    return { success: true, task };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function handleCreateReminder(
  userId: string,
  chatId: number,
  args: Record<string, unknown>
): Promise<{ success: boolean; reminder?: Reminder; error?: string }> {
  try {
    const reminder = await RemindersRepository.create({
      user_id: userId,
      telegram_chat_id: chatId,
      message: args.message as string,
      scheduled_at: args.scheduled_at as string,
      is_recurring: (args.is_recurring as boolean) || false,
      recurrence_pattern: args.recurrence
        ? { frequency: args.recurrence as 'daily' | 'weekly' | 'monthly', interval: 1 }
        : undefined,
    });
    return { success: true, reminder };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function handleListTasks(
  userId: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; tasks?: Task[]; error?: string }> {
  try {
    const status = args.status as string | undefined;
    const limit = (args.limit as number) || 10;

    let tasks: Task[];
    if (status && status !== 'all') {
      tasks = await TasksRepository.findByUserId(userId);
      tasks = tasks.filter((t) => t.status === status);
    } else {
      tasks = await TasksRepository.findByUserId(userId);
    }

    return { success: true, tasks: tasks.slice(0, limit) };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function executeAction(
  functionCall: FunctionCallResult,
  userId: string,
  chatId: number
): Promise<{ action: BrainAction; result: unknown }> {
  const { name, arguments: args } = functionCall;

  switch (name) {
    case 'create_task': {
      const result = await handleCreateTask(userId, args);
      return {
        action: {
          type: 'create_task',
          payload: {
            title: args.title as string,
            description: args.description as string | undefined,
            dueDate: args.due_date as string | undefined,
            priority: args.priority as 'low' | 'medium' | 'high' | undefined,
          },
        },
        result,
      };
    }

    case 'create_reminder': {
      const result = await handleCreateReminder(userId, chatId, args);
      return {
        action: {
          type: 'send_reminder',
          payload: {
            message: args.message as string,
            scheduledAt: args.scheduled_at as string,
            chatId,
          },
        },
        result,
      };
    }

    case 'list_tasks': {
      const result = await handleListTasks(userId, args);
      return { action: { type: 'none' }, result };
    }

    case 'add_transaction':
    case 'query_finances':
      // These will be implemented in the finance app
      return { action: { type: 'none' }, result: { message: 'Finance features coming soon' } };

    default:
      return { action: { type: 'none' }, result: null };
  }
}

// -----------------------------------------------------------------------------
// Main Brain Function
// -----------------------------------------------------------------------------

export async function processMessage(input: BrainInput): Promise<BrainOutput> {
  const { userId, chatId, message, userName } = input;

  // Load user and conversation history
  const user = await UsersRepository.findById(userId);
  const conversations = await ConversationsRepository.findByUserId(userId);
  const latestConversation = conversations[0];

  // Build message history
  const messages: Message[] = [];

  // Add system prompt with context
  const systemPrompt = createContextualPrompt(OPTIMAI_SYSTEM_PROMPT, {
    userName: userName || user?.first_name,
    timezone: user?.preferences?.timezone || 'America/Mexico_City',
    language: user?.preferences?.language || 'es',
  });
  messages.push({ role: 'system', content: systemPrompt });

  // Add conversation history (last 10 messages)
  if (latestConversation?.messages) {
    const recentMessages = latestConversation.messages.slice(-10);
    for (const msg of recentMessages) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }
  }

  // Add current message
  messages.push({ role: 'user', content: message });

  // Call AI with function calling
  const completion = await createCompletionWithFunctions(messages, OPTIMAI_FUNCTIONS, {
    model: 'gpt-4o-mini',
    temperature: 0.7,
  });

  let response = completion.content || '';
  let action: BrainAction | null = null;
  let actionResult: unknown;

  // Execute function if called
  if (completion.functionCall) {
    const executed = await executeAction(completion.functionCall, userId, chatId);
    action = executed.action;
    actionResult = executed.result;

    // If no text response, generate one based on action result
    if (!response && action.type !== 'none') {
      response = generateActionResponse(action, actionResult);
    }
  }

  // Update conversation history
  await updateConversation(userId, chatId, message, response);

  return { response, action, actionResult };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function generateActionResponse(action: BrainAction, result: unknown): string {
  const success = (result as { success?: boolean })?.success;

  switch (action.type) {
    case 'create_task':
      return success
        ? `Tarea creada: "${action.payload.title}"`
        : 'Hubo un error al crear la tarea.';

    case 'send_reminder':
      return success
        ? `Recordatorio programado para ${new Date(action.payload.scheduledAt).toLocaleString('es-MX')}`
        : 'Hubo un error al crear el recordatorio.';

    default:
      return '';
  }
}

async function updateConversation(
  userId: string,
  chatId: number,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  try {
    const conversations = await ConversationsRepository.findByUserId(userId);
    let conversation = conversations.find((c) => c.telegram_chat_id === chatId);

    const timestamp = new Date().toISOString();
    const newMessages = [
      { role: 'user' as const, content: userMessage, timestamp },
      { role: 'assistant' as const, content: assistantResponse, timestamp },
    ];

    if (conversation) {
      const updatedMessages = [...conversation.messages, ...newMessages].slice(-50);
      await ConversationsRepository.update(conversation.id, { messages: updatedMessages });
    } else {
      await ConversationsRepository.create({
        user_id: userId,
        telegram_chat_id: chatId,
        messages: newMessages,
        context: {},
      });
    }
  } catch (error) {
    console.error('Failed to update conversation:', error);
  }
}

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export { OPTIMAI_FUNCTIONS, OPTIMAI_SYSTEM_PROMPT };
