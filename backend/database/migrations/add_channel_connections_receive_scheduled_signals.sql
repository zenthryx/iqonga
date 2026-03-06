-- Opt-in for receiving scheduled trade signals in this channel (e.g. Telegram group).
-- When false or null, the scheduled signal job does not send to this connection.

ALTER TABLE channel_connections
  ADD COLUMN IF NOT EXISTS receive_scheduled_signals BOOLEAN DEFAULT false;

COMMENT ON COLUMN channel_connections.receive_scheduled_signals IS 'If true, scheduled trade signals (SIGNAL_PAIRS) are sent to this channel. No message when there is no trade.';
