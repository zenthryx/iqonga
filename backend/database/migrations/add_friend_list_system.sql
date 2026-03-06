-- Friend List System Migration
-- Adds friend relationships and friend requests functionality

-- 1. Friend Requests Table
CREATE TABLE IF NOT EXISTS friend_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
    message TEXT, -- Optional message with friend request
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Prevent duplicate requests
    UNIQUE(requester_id, recipient_id),
    -- Prevent self-friending
    CHECK (requester_id != recipient_id)
);

-- Indexes for friend requests
CREATE INDEX IF NOT EXISTS idx_friend_requests_requester ON friend_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_recipient ON friend_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_recipient_status ON friend_requests(recipient_id, status);

-- 2. Friends Table (bidirectional relationships)
CREATE TABLE IF NOT EXISTS friends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Metadata
    nickname VARCHAR(100), -- Custom nickname for this friend
    notes TEXT, -- Personal notes about this friend
    -- Status
    is_favorite BOOLEAN DEFAULT false,
    is_blocked BOOLEAN DEFAULT false,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure bidirectional relationship (user_id < friend_id for consistency)
    -- This prevents duplicate entries
    UNIQUE(user_id, friend_id),
    -- Prevent self-friending
    CHECK (user_id != friend_id)
);

-- Indexes for friends
CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_user_favorite ON friends(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_friends_user_blocked ON friends(user_id, is_blocked) WHERE is_blocked = true;

-- 3. Function to automatically create bidirectional friend relationship
CREATE OR REPLACE FUNCTION create_friendship(user1_id INTEGER, user2_id INTEGER)
RETURNS VOID AS $$
DECLARE
    lower_id INTEGER;
    higher_id INTEGER;
BEGIN
    -- Ensure consistent ordering (lower ID first)
    IF user1_id < user2_id THEN
        lower_id := user1_id;
        higher_id := user2_id;
    ELSE
        lower_id := user2_id;
        higher_id := user1_id;
    END IF;

    -- Insert bidirectional relationships
    INSERT INTO friends (user_id, friend_id)
    VALUES (lower_id, higher_id), (higher_id, lower_id)
    ON CONFLICT (user_id, friend_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to remove bidirectional friend relationship
CREATE OR REPLACE FUNCTION remove_friendship(user1_id INTEGER, user2_id INTEGER)
RETURNS VOID AS $$
BEGIN
    DELETE FROM friends 
    WHERE (user_id = user1_id AND friend_id = user2_id)
       OR (user_id = user2_id AND friend_id = user1_id);
END;
$$ LANGUAGE plpgsql;

-- 5. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_friend_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_friend_requests_updated_at
    BEFORE UPDATE ON friend_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_friend_updated_at();

CREATE TRIGGER update_friends_updated_at
    BEFORE UPDATE ON friends
    FOR EACH ROW
    EXECUTE FUNCTION update_friend_updated_at();

-- 6. View for friend list with user details
CREATE OR REPLACE VIEW friend_list_view AS
SELECT 
    f.id,
    f.user_id,
    f.friend_id,
    f.nickname,
    f.notes,
    f.is_favorite,
    f.is_blocked,
    f.created_at,
    f.updated_at,
    u.username as friend_username,
    u.email as friend_email
FROM friends f
INNER JOIN users u ON f.friend_id = u.id
WHERE f.is_blocked = false;

-- Comments for documentation
COMMENT ON TABLE friend_requests IS 'Stores friend requests between users';
COMMENT ON TABLE friends IS 'Stores bidirectional friend relationships';
COMMENT ON FUNCTION create_friendship IS 'Creates bidirectional friend relationship between two users';
COMMENT ON FUNCTION remove_friendship IS 'Removes bidirectional friend relationship between two users';

