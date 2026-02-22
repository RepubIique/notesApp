-- Add read status tracking to messages table
ALTER TABLE messages 
ADD COLUMN delivered_at TIMESTAMPTZ,
ADD COLUMN read_at TIMESTAMPTZ,
ADD COLUMN read_by TEXT CHECK (read_by IN ('A', 'B', NULL));

-- Create index for efficient queries
CREATE INDEX idx_messages_read_status ON messages(sender, read_at);

-- Create table for tracking user activity (last seen, typing status)
CREATE TABLE user_activity (
  user_role TEXT PRIMARY KEY CHECK (user_role IN ('A', 'B')),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_typing BOOLEAN NOT NULL DEFAULT FALSE,
  typing_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Initialize with both users
INSERT INTO user_activity (user_role, last_seen, is_typing) 
VALUES ('A', NOW(), FALSE), ('B', NOW(), FALSE)
ON CONFLICT (user_role) DO NOTHING;

-- Create index for efficient queries
CREATE INDEX idx_user_activity_typing ON user_activity(user_role, is_typing);
