import { getOpenAIClient } from './client';
import type { ChatModel, Message } from './completion';
import type OpenAI from 'openai';

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface FunctionCallResult {
  name: string;
  arguments: Record<string, unknown>;
}

export interface CompletionWithFunctionsResult {
  content: string | null;
  functionCall: FunctionCallResult | null;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export async function createCompletionWithFunctions(
  messages: Message[],
  functions: FunctionDefinition[],
  options: {
    model?: ChatModel;
    temperature?: number;
    maxTokens?: number;
    functionCall?: 'auto' | 'none' | { name: string };
  } = {}
): Promise<CompletionWithFunctionsResult> {
  const client = getOpenAIClient();

  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = functions.map((f) => ({
    type: 'function' as const,
    function: {
      name: f.name,
      description: f.description,
      parameters: f.parameters,
    },
  }));

  let toolChoice: OpenAI.Chat.Completions.ChatCompletionToolChoiceOption | undefined;
  if (options.functionCall === 'auto') {
    toolChoice = 'auto';
  } else if (options.functionCall === 'none') {
    toolChoice = 'none';
  } else if (options.functionCall?.name) {
    toolChoice = { type: 'function', function: { name: options.functionCall.name } };
  }

  const response = await client.chat.completions.create({
    model: options.model || 'gpt-4o-mini',
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens,
    tools,
    tool_choice: toolChoice,
  });

  const choice = response.choices[0];
  const toolCall = choice.message.tool_calls?.[0];

  let functionCall: FunctionCallResult | null = null;
  if (toolCall?.function) {
    try {
      functionCall = {
        name: toolCall.function.name,
        arguments: JSON.parse(toolCall.function.arguments),
      };
    } catch {
      functionCall = {
        name: toolCall.function.name,
        arguments: {},
      };
    }
  }

  return {
    content: choice.message.content,
    functionCall,
    finishReason: choice.finish_reason || 'stop',
    usage: {
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    },
  };
}

// Pre-defined functions for Optimai
export const OPTIMAI_FUNCTIONS: FunctionDefinition[] = [
  {
    name: 'create_task',
    description: 'Create a new task or reminder for the user',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'The task title',
        },
        description: {
          type: 'string',
          description: 'Optional task description',
        },
        due_date: {
          type: 'string',
          description: 'Due date in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Task priority',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'create_reminder',
    description: 'Set a reminder for the user at a specific time',
    parameters: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The reminder message',
        },
        scheduled_at: {
          type: 'string',
          description: 'When to send the reminder (ISO format)',
        },
        is_recurring: {
          type: 'boolean',
          description: 'Whether the reminder should repeat',
        },
        recurrence: {
          type: 'string',
          enum: ['daily', 'weekly', 'monthly'],
          description: 'Recurrence pattern if is_recurring is true',
        },
      },
      required: ['message', 'scheduled_at'],
    },
  },
  {
    name: 'add_transaction',
    description: 'Record a financial transaction (income or expense)',
    parameters: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Transaction amount (positive number)',
        },
        type: {
          type: 'string',
          enum: ['income', 'expense'],
          description: 'Whether this is income or expense',
        },
        description: {
          type: 'string',
          description: 'Transaction description',
        },
        category: {
          type: 'string',
          description: 'Category name',
        },
        date: {
          type: 'string',
          description: 'Transaction date (ISO format), defaults to today',
        },
      },
      required: ['amount', 'type', 'description'],
    },
  },
  {
    name: 'query_finances',
    description: 'Query financial data or get summaries',
    parameters: {
      type: 'object',
      properties: {
        query_type: {
          type: 'string',
          enum: ['summary', 'transactions', 'by_category'],
          description: 'Type of financial query',
        },
        start_date: {
          type: 'string',
          description: 'Start date for the query period',
        },
        end_date: {
          type: 'string',
          description: 'End date for the query period',
        },
        category: {
          type: 'string',
          description: 'Filter by category (optional)',
        },
      },
      required: ['query_type'],
    },
  },
  {
    name: 'list_tasks',
    description: 'Get a list of user tasks',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'in_progress', 'completed', 'all'],
          description: 'Filter by task status',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of tasks to return',
        },
      },
    },
  },
];
