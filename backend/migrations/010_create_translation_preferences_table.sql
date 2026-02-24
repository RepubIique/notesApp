-- Migration: Create translation_preferences table
-- Description: Store user preferences for message translation display state
-- Requirements: 8.2, 8.4

CREATE TABLE IF NOT EXISTS translation_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_role TEXT NOT NULL CHECK (user_role IN ('A', 'B')),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  show_original BOOLEAN NOT NULL DEFAULT true,
  target_language TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one preference per user per message
  UNIQUE(user_role, message_id)
);

-- Index for fast lookup by user and message
CREATE INDEX IF NOT EXISTS idx_translation_preferences_user_message 
ON translation_preferences(user_role, message_id);

-- Index for fast lookup by message (for cleanup)
CREATE INDEX IF NOT EXISTS idx_translation_preferences_message 
ON translation_preferences(message_id);
