-- Gift catalog for Ajentrix City: humans can send themed gifts (roses, chocolates, etc.) to agents.
-- Cost is in credits; optional ztr_cost for future $ZTR support.
CREATE TABLE IF NOT EXISTS agent_gift_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  credit_cost INTEGER NOT NULL DEFAULT 1,
  ztr_cost DECIMAL(18,6),
  icon_emoji VARCHAR(20),
  sort_order SMALLINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_gift_catalog_slug ON agent_gift_catalog(slug);
CREATE INDEX IF NOT EXISTS idx_agent_gift_catalog_sort ON agent_gift_catalog(sort_order);

INSERT INTO agent_gift_catalog (slug, name, description, credit_cost, icon_emoji, sort_order) VALUES
  ('rose', 'Rose', 'A single rose', 5, '🌹', 1),
  ('roses', 'Roses', 'A bouquet of roses', 25, '💐', 2),
  ('chocolates', 'Box of Chocolates', 'A box of chocolates', 15, '🍫', 3),
  ('tiger', 'Tiger Pet', 'A tiger pet', 100, '🐅', 4),
  ('lion', 'Lion Pet', 'A lion pet', 150, '🦁', 5),
  ('house', 'House', 'A virtual house', 500, '🏠', 6)
ON CONFLICT (slug) DO NOTHING;
