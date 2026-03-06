-- Fix conversations table schema
-- IMPORTANT: This table is used for BOTH voice chat (user_id, agent_id) AND chat messaging (created_by)
-- We need to preserve user_id for voice chat and ensure created_by exists for chat messaging

DO $$
DECLARE
    has_user_id BOOLEAN;
    has_created_by BOOLEAN;
    has_agent_id BOOLEAN;
BEGIN
    -- Check if user_id column exists (for voice chat)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'conversations' 
        AND column_name = 'user_id'
    ) INTO has_user_id;

    -- Check if created_by column exists (for chat messaging)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'conversations' 
        AND column_name = 'created_by'
    ) INTO has_created_by;

    -- Check if agent_id exists (indicates voice chat table)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'conversations' 
        AND column_name = 'agent_id'
    ) INTO has_agent_id;

    -- If created_by doesn't exist, add it (for chat messaging)
    -- We keep user_id for voice chat compatibility
    IF NOT has_created_by THEN
        ALTER TABLE conversations ADD COLUMN created_by INTEGER REFERENCES users(id);
        RAISE NOTICE 'Added created_by column for chat messaging';
    ELSE
        RAISE NOTICE 'created_by column already exists';
    END IF;

    -- If both user_id and agent_id exist, this is a voice chat table
    -- We keep both user_id and created_by - they serve different purposes
    IF has_user_id AND has_agent_id THEN
        RAISE NOTICE 'Table has both voice chat (user_id, agent_id) and chat messaging (created_by) columns';
    END IF;

    -- Make user_id nullable for chat messaging (voice chat can still use it)
    -- This allows chat conversations to be created without user_id
    IF has_user_id THEN
        -- Check if user_id is currently NOT NULL
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'conversations' 
            AND column_name = 'user_id'
            AND is_nullable = 'NO'
        ) THEN
            -- Make it nullable to allow chat messaging
            ALTER TABLE conversations ALTER COLUMN user_id DROP NOT NULL;
            RAISE NOTICE 'Made user_id nullable to support both voice chat and chat messaging';
        END IF;
    END IF;

    -- Make agent_id nullable for chat messaging (voice chat can still use it)
    -- This allows chat conversations to be created without agent_id
    IF has_agent_id THEN
        -- Check if agent_id is currently NOT NULL
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'conversations' 
            AND column_name = 'agent_id'
            AND is_nullable = 'NO'
        ) THEN
            -- Make it nullable to allow chat messaging
            ALTER TABLE conversations ALTER COLUMN agent_id DROP NOT NULL;
            RAISE NOTICE 'Made agent_id nullable to support both voice chat and chat messaging';
        END IF;
    END IF;

    -- Note: We keep created_by nullable for now to avoid breaking existing data
    -- Chat messaging code should always provide created_by when creating conversations
END $$;

-- Verify the final schema
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'conversations'
  AND column_name IN ('user_id', 'agent_id', 'created_by')
ORDER BY ordinal_position;

