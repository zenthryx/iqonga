-- Instagram Integration Tables
-- Stores Instagram Business account connections and posts

-- Instagram Business Accounts
CREATE TABLE IF NOT EXISTS instagram_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    instagram_business_account_id VARCHAR(50) NOT NULL,
    username VARCHAR(100) NOT NULL,
    name VARCHAR(200),
    profile_picture_url TEXT,
    followers_count INTEGER DEFAULT 0,
    follows_count INTEGER DEFAULT 0,
    media_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, instagram_business_account_id)
);

-- Instagram Access Tokens
CREATE TABLE IF NOT EXISTS instagram_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    page_id VARCHAR(50) NOT NULL,
    instagram_business_account_id VARCHAR(50) NOT NULL,
    access_token TEXT NOT NULL,
    token_type VARCHAR(20) DEFAULT 'bearer',
    expires_at TIMESTAMP NOT NULL,
    scopes TEXT[], -- Array of granted scopes
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, page_id, instagram_business_account_id)
);

-- Instagram Posts
CREATE TABLE IF NOT EXISTS instagram_posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    instagram_business_account_id VARCHAR(50) NOT NULL,
    instagram_media_id VARCHAR(50) NOT NULL,
    media_type VARCHAR(20) NOT NULL, -- 'IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'
    media_url TEXT,
    thumbnail_url TEXT,
    caption TEXT,
    permalink TEXT,
    like_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    engagement INTEGER DEFAULT 0,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(instagram_business_account_id, instagram_media_id)
);

-- Instagram Comments
CREATE TABLE IF NOT EXISTS instagram_comments (
    id SERIAL PRIMARY KEY,
    instagram_post_id INTEGER REFERENCES instagram_posts(id) ON DELETE CASCADE,
    instagram_comment_id VARCHAR(50) NOT NULL,
    instagram_business_account_id VARCHAR(50) NOT NULL,
    commenter_username VARCHAR(100),
    commenter_profile_picture_url TEXT,
    text TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    is_reply BOOLEAN DEFAULT false,
    parent_comment_id VARCHAR(50),
    created_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(instagram_comment_id)
);

-- Instagram Analytics (daily snapshots)
CREATE TABLE IF NOT EXISTS instagram_analytics (
    id SERIAL PRIMARY KEY,
    instagram_business_account_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    followers_count INTEGER DEFAULT 0,
    follows_count INTEGER DEFAULT 0,
    media_count INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    profile_views INTEGER DEFAULT 0,
    website_clicks INTEGER DEFAULT 0,
    email_contacts INTEGER DEFAULT 0,
    phone_call_clicks INTEGER DEFAULT 0,
    text_message_clicks INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(instagram_business_account_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_user_id ON instagram_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_ig_id ON instagram_accounts(instagram_business_account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_tokens_user_id ON instagram_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_tokens_page_id ON instagram_tokens(page_id);
CREATE INDEX IF NOT EXISTS idx_instagram_tokens_expires_at ON instagram_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_user_id ON instagram_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_ig_account ON instagram_posts(instagram_business_account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_published_at ON instagram_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_instagram_comments_post_id ON instagram_comments(instagram_post_id);
CREATE INDEX IF NOT EXISTS idx_instagram_comments_ig_id ON instagram_comments(instagram_comment_id);
CREATE INDEX IF NOT EXISTS idx_instagram_analytics_account_date ON instagram_analytics(instagram_business_account_id, date);

-- Update triggers for timestamps
CREATE OR REPLACE FUNCTION update_instagram_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_instagram_accounts_updated_at
    BEFORE UPDATE ON instagram_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_instagram_updated_at();

CREATE TRIGGER trigger_update_instagram_tokens_updated_at
    BEFORE UPDATE ON instagram_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_instagram_updated_at();

CREATE TRIGGER trigger_update_instagram_posts_updated_at
    BEFORE UPDATE ON instagram_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_instagram_updated_at();

-- Comments for documentation
COMMENT ON TABLE instagram_accounts IS 'Instagram Business accounts connected to users';
COMMENT ON TABLE instagram_tokens IS 'Access tokens for Instagram API with expiration tracking';
COMMENT ON TABLE instagram_posts IS 'Published Instagram posts with engagement metrics';
COMMENT ON TABLE instagram_comments IS 'Comments on Instagram posts';
COMMENT ON TABLE instagram_analytics IS 'Daily analytics snapshots for Instagram accounts';



