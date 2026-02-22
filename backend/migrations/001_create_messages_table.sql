-- Migration: Create messages table with constraints
-- Requirements: 4.5, 10.4, 11.5

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender TEXT NOT NULL CHECK (sender IN ('A', 'B')),
  type TEXT NOT NULL CHECK (type IN ('text', 'image')),
  text TEXT,
  image_path TEXT,
  image_name TEXT,
  image_mime TEXT,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient message retrieval in newest-first order
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE messages IS 'Stores all text and image messages between identities A and B';
COMMENT ON COLUMN messages.sender IS 'Identity that sent the message: A or B';
COMMENT ON COLUMN messages.type IS 'Message type: text or image';
COMMENT ON COLUMN messages.text IS 'Text content for text messages (null for image messages)';
COMMENT ON COLUMN messages.image_path IS 'Storage path for image messages (null for text messages)';
COMMENT ON COLUMN messages.image_name IS 'Original filename for image messages (null for text messages)';
COMMENT ON COLUMN messages.image_mime IS 'MIME type for image messages (null for text messages)';
COMMENT ON COLUMN messages.deleted IS 'Soft delete flag - true if message was unsent';
COMMENT ON COLUMN messages.created_at IS 'Timestamp when message was created';
