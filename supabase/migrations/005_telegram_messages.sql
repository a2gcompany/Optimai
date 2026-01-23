-- Telegram messages table for Optimai
CREATE TABLE IF NOT EXISTS telegram_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT NOT NULL,
  content TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_messages_chat ON telegram_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_time ON telegram_messages(created_at DESC);

ALTER TABLE telegram_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all telegram_messages" ON telegram_messages FOR ALL USING (true) WITH CHECK (true);
