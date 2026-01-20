import { getSupabaseClient } from '../client';
import type { Tables, InsertTables, UpdateTables, Json } from '../types';

export type Conversation = Tables<'conversations'>;
export type ConversationInsert = InsertTables<'conversations'>;
export type ConversationUpdate = UpdateTables<'conversations'>;

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export async function getConversationByUserAndChat(
  userId: string,
  telegramChatId: number
): Promise<Conversation | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('telegram_chat_id', telegramChatId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createConversation(
  conversation: ConversationInsert
): Promise<Conversation> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('conversations')
    .insert(conversation)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addMessageToConversation(
  conversationId: string,
  message: ConversationMessage
): Promise<Conversation> {
  const supabase = getSupabaseClient();

  // Fetch current conversation
  const { data: current, error: fetchError } = await supabase
    .from('conversations')
    .select('messages')
    .eq('id', conversationId)
    .single();

  if (fetchError) throw fetchError;

  const messages = (current.messages as ConversationMessage[]) || [];
  messages.push(message);

  const { data, error } = await supabase
    .from('conversations')
    .update({
      messages: messages as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .select()
    .single();

  if (error) throw error;
  return data;
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
): Promise<Conversation> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('conversations')
    .update({
      messages: [],
      context: {},
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getRecentConversations(
  userId: string,
  limit: number = 10
): Promise<Conversation[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}
