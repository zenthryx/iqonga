-- Create user_shopify_configs table for per-user Shopify integrations
CREATE TABLE IF NOT EXISTS user_shopify_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shop_domain VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    scope TEXT NOT NULL,
    webhook_secret TEXT,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one active config per user
    UNIQUE(user_id, shop_domain)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_shopify_configs_user_id ON user_shopify_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shopify_configs_shop_domain ON user_shopify_configs(shop_domain);
CREATE INDEX IF NOT EXISTS idx_user_shopify_configs_active ON user_shopify_configs(user_id, is_active);

-- Create user_shopify_oauth_states table for OAuth flow security
CREATE TABLE IF NOT EXISTS user_shopify_oauth_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    state VARCHAR(255) NOT NULL UNIQUE,
    shop_domain VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for OAuth state lookups
CREATE INDEX IF NOT EXISTS idx_user_shopify_oauth_states_state ON user_shopify_oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_user_shopify_oauth_states_expires ON user_shopify_oauth_states(expires_at);

-- Create user_shopify_webhooks table for webhook event tracking
CREATE TABLE IF NOT EXISTS user_shopify_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shop_domain VARCHAR(255) NOT NULL,
    webhook_id VARCHAR(255) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique webhook per user/shop/topic
    UNIQUE(user_id, shop_domain, topic)
);

-- Create index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_user_shopify_webhooks_user_id ON user_shopify_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shopify_webhooks_shop_domain ON user_shopify_webhooks(shop_domain);
