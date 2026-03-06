-- Optional allowlist: only these Telegram/WhatsApp/Teams user IDs can use this assistant.
-- Empty or NULL = allow anyone (current behaviour).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'channel_connections' AND column_name = 'allowed_peer_ids'
  ) THEN
    ALTER TABLE channel_connections ADD COLUMN allowed_peer_ids TEXT[] DEFAULT '{}';
    COMMENT ON COLUMN channel_connections.allowed_peer_ids IS 'If non-empty, only these channel peer IDs (e.g. Telegram user IDs) can use the assistant. Empty = allow all.';
  END IF;
END $$;
