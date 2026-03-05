-- Migrate messages.read_by from INTEGER[] to UUID[] for standalone (users.id is UUID).
-- Run this if you see: invalid input syntax for type integer: "<uuid>" when marking messages as read.
-- Usage: psql -U ajentrix -d ajentrix_standalone -f Backend/standalone_db/migrate_messages_read_by_uuid.sql

BEGIN;

-- Drop and re-add so we can change type (no direct INTEGER[] -> UUID[] cast)
ALTER TABLE messages DROP COLUMN IF EXISTS read_by;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_by UUID[] DEFAULT '{}';

COMMIT;
