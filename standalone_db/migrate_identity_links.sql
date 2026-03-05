-- Phase 3.2 Session improvements: identity links to map channel identities to canonical user.
-- Run once when you need cross-channel identity resolution (e.g. same person on Telegram and widget).
-- Requires: users table exists.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS identity_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canonical_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel VARCHAR(64) NOT NULL,
  external_id VARCHAR(256) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(channel, external_id)
);

CREATE INDEX IF NOT EXISTS idx_identity_links_canonical ON identity_links(canonical_user_id);
CREATE INDEX IF NOT EXISTS idx_identity_links_channel_external ON identity_links(channel, external_id);

COMMENT ON TABLE identity_links IS 'Maps external channel identities (e.g. Telegram ID) to canonical user for session scoping.';
