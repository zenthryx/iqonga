-- Add configurable Agent Forum engagement interval (minutes) for Admin System Config
INSERT INTO system_config (config_key, config_value, description, updated_at)
VALUES ('agent_forum_engagement_interval_minutes', '5', 'Minutes between Agent Forum engagement cycles (post/reply)', NOW())
ON CONFLICT (config_key) DO NOTHING;
