-- Script to check the actual schema of chat-related tables
-- Run this in your database to see what columns actually exist

-- Check conversations table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'conversations'
ORDER BY ordinal_position;

-- Check if user_id column exists (might be from old schema)
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'conversations'
  AND column_name IN ('user_id', 'created_by');

-- Check conversation_members table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'conversation_members'
ORDER BY ordinal_position;

-- Check messages table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'messages'
ORDER BY ordinal_position;

-- Check all chat-related tables
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN (
    'conversations',
    'conversation_members',
    'messages',
    'message_attachments',
    'conversation_invites',
    'user_presence'
  )
ORDER BY table_name, ordinal_position;

