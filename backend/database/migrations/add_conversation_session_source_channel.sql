-- Session improvements for AI Assistant (OpenClaw-inspired, cloud)
-- Add source_channel and source_peer_id so conversations can be keyed by (agent_id, channel, peer).
-- Used for Telegram/WhatsApp/Teams: one conversation per (agent, channel, peer).

-- Add columns if not present (safe for existing conversations: NULL = platform/voice chat)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'source_channel') THEN
        ALTER TABLE conversations ADD COLUMN source_channel VARCHAR(50) NULL;
        COMMENT ON COLUMN conversations.source_channel IS 'Channel origin: telegram, whatsapp, teams, widget, api. NULL = legacy platform/voice.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'source_peer_id') THEN
        ALTER TABLE conversations ADD COLUMN source_peer_id VARCHAR(255) NULL;
        COMMENT ON COLUMN conversations.source_peer_id IS 'Peer id in that channel (e.g. Telegram user id, WhatsApp phone).';
    END IF;
END $$;

-- Unique session key: one conversation per (agent_id, source_channel, source_peer_id) when channel is set
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_session_key
ON conversations (agent_id, source_channel, source_peer_id)
WHERE source_channel IS NOT NULL AND source_peer_id IS NOT NULL;

-- Lookup by session key
CREATE INDEX IF NOT EXISTS idx_conversations_agent_channel_peer
ON conversations (agent_id, source_channel, source_peer_id)
WHERE source_channel IS NOT NULL;
