-- Add media support to scheduled_posts for image/video generation and attachments
-- media_urls: URLs of images or videos to attach (e.g. from AI generation or uploads)
-- telegram_chat_id: target Telegram group when platform is telegram (optional if stored per-post)

ALTER TABLE scheduled_posts
  ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';

ALTER TABLE scheduled_posts
  ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(255);

COMMENT ON COLUMN scheduled_posts.media_urls IS 'URLs of images or videos to attach to the post (Twitter: up to 4 images or 1 video; Telegram: photo/video with caption)';
COMMENT ON COLUMN scheduled_posts.telegram_chat_id IS 'Target Telegram chat ID when platform is telegram';

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_telegram_chat ON scheduled_posts(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;
