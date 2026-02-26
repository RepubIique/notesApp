-- Migration: Add reply support to messages table
-- Requirements: 3.1, 3.4

-- Add reply_to_id column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;

-- Create index for efficient reply lookups and JOIN queries
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_id);

-- Comment for documentation
COMMENT ON COLUMN messages.reply_to_id IS 'Reference to the message being replied to (null for non-reply messages)';
