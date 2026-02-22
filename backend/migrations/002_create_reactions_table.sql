-- Migration: Create reactions table with constraints
-- Requirements: 12.1, 12.3

CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_role TEXT NOT NULL CHECK (user_role IN ('A', 'B')),
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_role, emoji)
);

-- Index for efficient reaction retrieval by message
CREATE INDEX idx_reactions_message_id ON reactions(message_id);

-- Comments for documentation
COMMENT ON TABLE reactions IS 'Stores emoji reactions to messages from identities A and B';
COMMENT ON COLUMN reactions.message_id IS 'Reference to the message being reacted to (cascade delete)';
COMMENT ON COLUMN reactions.user_role IS 'Identity that added the reaction: A or B';
COMMENT ON COLUMN reactions.emoji IS 'Emoji character used for the reaction';
COMMENT ON COLUMN reactions.created_at IS 'Timestamp when reaction was created';
COMMENT ON CONSTRAINT reactions_message_id_user_role_emoji_key ON reactions IS 'Prevents duplicate reactions - same user cannot add same emoji to same message twice';
