-- Query Performance Test for get_messages_with_replies function
-- This file documents how to test query performance with EXPLAIN ANALYZE
-- Requirements: 10.1, 10.4

-- Test 1: Basic query performance (50 messages)
EXPLAIN ANALYZE
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
ORDER BY m.created_at DESC
LIMIT 50;

-- Test 2: Query with before filter
EXPLAIN ANALYZE
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
  AND m.created_at < NOW()
ORDER BY m.created_at DESC
LIMIT 50;

-- Test 3: Verify index usage
-- Check if idx_messages_reply_to is being used
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM messages m
LEFT JOIN messages om ON m.reply_to_id = om.id
WHERE m.reply_to_id IS NOT NULL
LIMIT 100;

-- Expected Results:
-- - Query execution time should be < 50ms for typical message loads
-- - Index scan should be used on created_at for ordering
-- - Index scan should be used on reply_to_id for JOIN
-- - No sequential scans on large tables

-- Performance Benchmarks:
-- - 100 messages with 20% having replies: < 30ms
-- - 1000 messages with 20% having replies: < 100ms
-- - JOIN should use idx_messages_reply_to index

-- Notes:
-- - The LEFT JOIN ensures all messages are returned, even without replies
-- - The CASE statement only builds the JSON object when reply_to_id is not NULL
-- - The query filters out soft-deleted messages (deleted = false)
-- - The ORDER BY uses the created_at index for efficient sorting
