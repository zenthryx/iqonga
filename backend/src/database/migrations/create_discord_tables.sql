-- Discord Bot Configurations Table
CREATE TABLE IF NOT EXISTS discord_bot_configs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bot_token TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Discord Agent Configurations Table
CREATE TABLE IF NOT EXISTS discord_agent_configs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    guild_id VARCHAR(20),
    channel_id VARCHAR(20),
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(guild_id, channel_id)
);

-- Discord Interactions Log Table
CREATE TABLE IF NOT EXISTS discord_interactions (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20),
    channel_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    message_content TEXT NOT NULL,
    ai_response TEXT,
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_discord_bot_configs_user_id ON discord_bot_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_discord_agent_configs_user_id ON discord_agent_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_discord_agent_configs_guild_channel ON discord_agent_configs(guild_id, channel_id);
CREATE INDEX IF NOT EXISTS idx_discord_interactions_guild_id ON discord_interactions(guild_id);
CREATE INDEX IF NOT EXISTS idx_discord_interactions_channel_id ON discord_interactions(channel_id);
CREATE INDEX IF NOT EXISTS idx_discord_interactions_user_id ON discord_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_discord_interactions_agent_id ON discord_interactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_discord_interactions_created_at ON discord_interactions(created_at);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_discord_bot_configs_updated_at 
    BEFORE UPDATE ON discord_bot_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discord_agent_configs_updated_at 
    BEFORE UPDATE ON discord_agent_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discord_interactions_updated_at 
    BEFORE UPDATE ON discord_interactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
