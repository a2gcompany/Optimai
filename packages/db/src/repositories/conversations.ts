import { getSupabaseClient } from '../client';

// Conversations are stored in-memory since Nucleus doesn't have a conversations table
// This is a temporary solution until the optimai_conversations table is created

export interface Conversation {
  id: string;
  user_id: string;
  telegram_chat_id: number;
  messages: ConversationMessage[];
  context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ConversationInsert {
  user_id: string;
  telegram_chat_id: number;
  messages?: ConversationMessage[];
  context?: Record<string, unknown>;
}

export type ConversationUpdate = Partial<Conversation>;

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// In-memory storage for conversations (fallback when table doesn't exist)
const conversationsCache = new Map<string, Conversation>();

function getCacheKey(userId: string, chatId: number): string {
  return `${userId}:${chatId}`;
}

export async function getConversationByUserAndChat(
  userId: string,
  telegramChatId: number
): Promise<Conversation | null> {
  // Try to get from Nucleus messages table
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('sender_phone', `telegram:${telegramChatId}`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('getConversationByUserAndChat error:', error);
    // Fallback to cache
    const key = getCacheKey(userId, telegramChatId);
    return conversationsCache.get(key) || null;
  }

  // Convert messages to conversation format
  if (data && data.length > 0) {
    const messages: ConversationMessage[] = data.map((m) => ({
      role: m.direction === 'incoming' ? 'user' as const : 'assistant' as const,
      content: m.content || '',
      timestamp: m.created_at,
    })).reverse();

    return {
      id: `conv-${telegramChatId}`,
      user_id: userId,
      telegram_chat_id: telegramChatId,
      messages,
      context: {},
      created_at: data[data.length - 1]?.created_at || new Date().toISOString(),
      updated_at: data[0]?.created_at || new Date().toISOString(),
    };
  }

  // Fallback to cache
  const key = getCacheKey(userId, telegramChatId);
  return conversationsCache.get(key) || null;
}

export async function createConversation(
  conversation: ConversationInsert
): Promise<Conversation> {
  const newConv: Conversation = {
    id: `conv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: conversation.user_id,
    telegram_chat_id: conversation.telegram_chat_id,
    messages: conversation.messages || [],
    context: conversation.context || {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Store in cache
  const key = getCacheKey(conversation.user_id, conversation.telegram_chat_id);
  conversationsCache.set(key, newConv);

  return newConv;
}

export async function addMessageToConversation(
  conversationId: string,
  message: ConversationMessage
): Promise<Conversation> {
  // Find conversation in cache by ID
  let conversation: Conversation | undefined;
  for (const conv of conversationsCache.values()) {
    if (conv.id === conversationId) {
      conversation = conv;
      break;
    }
  }

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  conversation.messages.push(message);
  conversation.updated_at = new Date().toISOString();

  // Keep only last 50 messages
  if (conversation.messages.length > 50) {
    conversation.messages = conversation.messages.slice(-50);
  }

  return conversation;
}

export async function updateConversation(
  id: string,
  updates: ConversationUpdate
): Promise<Conversation | null> {
  // Find conversation in cache by ID
  for (const [key, conv] of conversationsCache.entries()) {
    if (conv.id === id) {
      const updated = {
        ...conv,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      conversationsCache.set(key, updated);
      return updated;
    }
  }
  return null;
}

export async function getOrCreateConversation(
  userId: string,
  telegramChatId: number
): Promise<Conversation> {
  const existing = await getConversationByUserAndChat(userId, telegramChatId);
  if (existing) return existing;

  return createConversation({
    user_id: userId,
    telegram_chat_id: telegramChatId,
    messages: [],
    context: {},
  });
}

export async function clearConversationHistory(
  conversationId: string
): Promise<Conversation | null> {
  for (const [key, conv] of conversationsCache.entries()) {
    if (conv.id === conversationId) {
      conv.messages = [];
      conv.context = {};
      conv.updated_at = new Date().toISOString();
      return conv;
    }
  }
  return null;
}

export async function getRecentConversations(
  userId: string,
  limit: number = 10
): Promise<Conversation[]> {
  const conversations: Conversation[] = [];

  for (const conv of conversationsCache.values()) {
    if (conv.user_id === userId) {
      conversations.push(conv);
    }
  }

  return conversations
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, limit);
}

export async function getConversationsByUserId(userId: string): Promise<Conversation[]> {
  return getRecentConversations(userId, 50);
}

// Class-based repository for compatibility
export const ConversationsRepository = {
  findByUserAndChat: getConversationByUserAndChat,
  findByUserId: getConversationsByUserId,
  create: createConversation,
  update: updateConversation,
  addMessage: addMessageToConversation,
  getOrCreate: getOrCreateConversation,
  clearHistory: clearConversationHistory,
  getRecent: getRecentConversations,
};
