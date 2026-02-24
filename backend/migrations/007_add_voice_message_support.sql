-- Migration: Add voice message support to messages table
-- Requirements: 2.2, 2.4, 5.1, 6.1, 6.2

-- Update type constraint to include 'voice'
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_type_check CHECK (type IN ('text', 'image', 'voice'));

-- Add columns for voice messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS audio_path TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS audio_duration INTEGER;

-- Comments for documentation
COMMENT ON COLUMN messages.audio_path IS 'Storage path for voice messages (null for text/image messages)';
COMMENT ON COLUMN messages.audio_duration IS 'Duration in seconds for voice messages (null for text/image messages)';
