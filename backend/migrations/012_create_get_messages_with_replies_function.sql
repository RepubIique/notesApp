-- Migration: Create function to fetch messages with reply data
-- This function performs a LEFT JOIN to include reply_to_message data efficiently
-- Requirements: 10.1, 10.4

-- Drop function if it exists (for idempotency)
DROP FUNCTION IF EXISTS get_messages_with_replies(integer, timestamptz);

-- Create function to fetch messages with reply data
CREATE OR REPLACE FUNCTION get_messages_with_replies(
  p_limit integer DEFAULT 50,
  p_before timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  sender text,
  type text,
  text text,
  image_path text,
  image_name text,
  image_mime text,
  audio_path text,
  audio_duration integer,
  reply_to_id uuid,
  reply_to_message jsonb,
  deleted boolean,
  created_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  read_by text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.sender,
    m.type,
    m.text,
    m.image_path,
    m.image_name,
    m.image_mime,
    m.audio_path,
    m.audio_duration,
    m.reply_to_id,
    CASE 
      WHEN m.reply_to_id IS NOT NULL THEN
        jsonb_build_object(
          'id', om.id,
          'sender', om.sender,
          'type', om.type,
          'text', om.text,
          'image_path', om.image_path,
          'audio_path', om.audio_path,
          'audio_duration', om.audio_duration,
          'deleted', om.deleted,
          'created_at', om.created_at
        )
      ELSE NULL
    END as reply_to_message,
    m.deleted,
    m.created_at,
    m.delivered_at,
    m.read_at,
    m.read_by
  FROM messages m
  LEFT JOIN messages om ON m.reply_to_id = om.id
  WHERE m.deleted = false
    AND (p_before IS NULL OR m.created_at < p_before)
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment for documentation
COMMENT ON FUNCTION get_messages_with_replies IS 'Fetches messages with LEFT JOIN to include reply_to_message data for efficient loading';
