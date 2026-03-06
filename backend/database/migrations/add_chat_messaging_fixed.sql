-- Chat & Messaging System schema
-- PostgreSQL-only implementation (no MongoDB)
-- Fixed version: Handles existing tables properly

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (to avoid schema conflicts)
-- This is safe if you're running this on a fresh database or want to reset
-- If you have existing data, comment out the DROP statements and use ALTER TABLE instead

DROP TABLE IF EXISTS conversation_members CASCADE;
DROP TABLE IF EXISTS message_attachments CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_invites CASCADE;
DROP TABLE IF EXISTS user_presence CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- 1. Conversations (direct or group)
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group')),
    name VARCHAR(100), -- Group name (null for direct)
    description TEXT,
    avatar_url VARCHAR(500),
    
    -- Group settings
    is_public BOOLEAN DEFAULT false,
    require_approval BOOLEAN DEFAULT true,
    max_members INTEGER DEFAULT 100,
    
    -- Crypto integration
    associated_token VARCHAR(20), -- Link to token (e.g., "BTC")
    auto_share_signals BOOLEAN DEFAULT false,
    
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_token ON conversations(associated_token) WHERE associated_token IS NOT NULL;
CREATE INDEX idx_conversations_created_by ON conversations(created_by);

-- 2. Conversation Members
CREATE TABLE conversation_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    
    -- Notification settings
    notifications_enabled BOOLEAN DEFAULT true,
    mute_until TIMESTAMP WITH TIME ZONE,
    
    -- Read tracking
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_message_id UUID,
    
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_members_conversation ON conversation_members(conversation_id);
CREATE INDEX idx_members_user ON conversation_members(user_id);
CREATE INDEX idx_members_role ON conversation_members(conversation_id, role);

-- 3. Messages (PostgreSQL replaces MongoDB)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Content
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text', -- 'text', 'signal', 'file', 'system'
    
    -- Rich formatting (JSONB for flexibility)
    metadata JSONB DEFAULT '{}', -- {mentions: [], hashtags: [], links: [], reactions: {}}
    
    -- Signal sharing
    is_signal BOOLEAN DEFAULT false,
    signal_data JSONB, -- {type, token, severity, data}
    
    -- Threading
    reply_to UUID REFERENCES messages(id),
    
    -- Attachments
    has_attachments BOOLEAN DEFAULT false,
    attachment_count INTEGER DEFAULT 0,
    
    -- Status
    edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Delivery tracking (array of user IDs who read it)
    read_by INTEGER[] DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_signal ON messages(is_signal) WHERE is_signal = true;
CREATE INDEX idx_messages_reply_to ON messages(reply_to) WHERE reply_to IS NOT NULL;
CREATE INDEX idx_messages_content_search ON messages USING gin(to_tsvector('english', content));
CREATE INDEX idx_messages_metadata ON messages USING gin(metadata);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_deleted ON messages(conversation_id, deleted, created_at DESC) WHERE deleted = false;

-- 4. Message Attachments
CREATE TABLE message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'image', 'document', 'video'
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    
    -- Store in /uploads/chat/ directory (reuse existing pattern)
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(500) NOT NULL, -- /uploads/chat/filename
    thumbnail_url VARCHAR(500), -- For images/videos
    
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_attachments_message ON message_attachments(message_id);
CREATE INDEX idx_attachments_uploaded_by ON message_attachments(uploaded_by);

-- 5. Invitations
CREATE TABLE conversation_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    
    invited_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    invite_code VARCHAR(50) UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_invites_conversation ON conversation_invites(conversation_id);
CREATE INDEX idx_invites_user ON conversation_invites(invited_user_id);
CREATE INDEX idx_invites_code ON conversation_invites(invite_code);
CREATE INDEX idx_invites_status ON conversation_invites(status, expires_at);

-- 6. User Presence (can use Redis, but also store in DB for persistence)
CREATE TABLE user_presence (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    device_type VARCHAR(50), -- 'web', 'mobile', 'desktop'
    device_id VARCHAR(100),
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_presence_status ON user_presence(status, last_seen);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_presence_updated_at ON user_presence;
CREATE TRIGGER update_user_presence_updated_at BEFORE UPDATE ON user_presence
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

