-- Phase 3.2 Session improvements: session key and agent/channel/peer on conversations.
-- Run once when you need session-scoped conversations (e.g. agent + channel + peer).
-- Requires: conversations table already exists.

-- Session key and agent/channel/peer (nullable; used when conversation is keyed by session)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS session_key VARCHAR(512),
  ADD COLUMN IF NOT EXISTS agent_id UUID,
  ADD COLUMN IF NOT EXISTS channel VARCHAR(64),
  ADD COLUMN IF NOT EXISTS peer_id VARCHAR(256),
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE;

-- One conversation per session_key when set
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_session_key
  ON conversations(session_key) WHERE session_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_agent_channel_peer
  ON conversations(agent_id, channel, peer_id) WHERE agent_id IS NOT NULL;

COMMENT ON COLUMN conversations.session_key IS 'Derived from (agent_id, channel, peer_id) and dm_scope; used to find or create agent sessions.';
COMMENT ON COLUMN conversations.agent_id IS 'Agent owning this conversation when session-scoped (e.g. widget/Telegram).';
COMMENT ON COLUMN conversations.channel IS 'Channel source: e.g. widget, telegram, api.';
COMMENT ON COLUMN conversations.peer_id IS 'External peer id (e.g. Telegram user id) or canonical user id depending on dm_scope.';
COMMENT ON COLUMN conversations.last_activity_at IS 'Last message or activity; used for idle timeout and reset policies.';
