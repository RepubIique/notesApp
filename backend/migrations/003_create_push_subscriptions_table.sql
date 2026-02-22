-- Migration: Create push_subscriptions table (optional feature)
-- Requirements: 13.2

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner TEXT NOT NULL CHECK (owner IN ('A', 'B')),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient subscription retrieval by owner
CREATE INDEX idx_push_subscriptions_owner ON push_subscriptions(owner);

-- Comments for documentation
COMMENT ON TABLE push_subscriptions IS 'Stores push notification subscriptions for PWA functionality (optional feature)';
COMMENT ON COLUMN push_subscriptions.owner IS 'Identity that owns this subscription: A or B';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Push service endpoint URL (must be unique)';
COMMENT ON COLUMN push_subscriptions.p256dh IS 'Public key for push encryption (p256dh)';
COMMENT ON COLUMN push_subscriptions.auth IS 'Authentication secret for push encryption';
COMMENT ON COLUMN push_subscriptions.created_at IS 'Timestamp when subscription was created';
COMMENT ON CONSTRAINT push_subscriptions_endpoint_key ON push_subscriptions IS 'Prevents duplicate subscriptions from same endpoint';
