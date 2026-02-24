-- Migration: Create translations table for message translation caching
-- Requirements: 4.1, 4.5

CREATE TABLE IF NOT EXISTS translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one translation per message per language pair
  UNIQUE(message_id, source_language, target_language)
);

-- Index for fast lookup by message
CREATE INDEX idx_translations_message_id ON translations(message_id);

-- Index for language pair queries
CREATE INDEX idx_translations_languages ON translations(source_language, target_language);

-- Comments for documentation
COMMENT ON TABLE translations IS 'Stores cached translations for messages to reduce API calls';
COMMENT ON COLUMN translations.message_id IS 'Reference to the message being translated (cascade delete)';
COMMENT ON COLUMN translations.source_language IS 'Source language code (ISO 639-1 format, e.g., en, zh-CN, zh-TW)';
COMMENT ON COLUMN translations.target_language IS 'Target language code (ISO 639-1 format, e.g., en, zh-CN, zh-TW)';
COMMENT ON COLUMN translations.translated_text IS 'The translated message text';
COMMENT ON COLUMN translations.created_at IS 'Timestamp when translation was created';
COMMENT ON CONSTRAINT translations_message_id_source_language_target_language_key ON translations IS 'Prevents duplicate translations - one translation per message per language pair';
