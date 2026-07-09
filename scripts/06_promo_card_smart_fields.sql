-- Smart promo cards: category (protector/vehicle), headline, description
-- Allows multiple cards per city (one per category).

ALTER TABLE city_insights
  ADD COLUMN IF NOT EXISTS card_category TEXT NOT NULL DEFAULT 'protector',
  ADD COLUMN IF NOT EXISTS headline TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

ALTER TABLE city_insights DROP CONSTRAINT IF EXISTS city_insights_city_slug_key;

DROP INDEX IF EXISTS idx_city_insights_city_name_lower;

CREATE UNIQUE INDEX IF NOT EXISTS idx_city_insights_slug_category
  ON city_insights (city_slug, card_category);

CREATE UNIQUE INDEX IF NOT EXISTS idx_city_insights_city_category
  ON city_insights (LOWER(city_name), card_category);

UPDATE city_insights
SET
  headline = COALESCE(NULLIF(headline, ''), 'Protector in ' || city_name),
  description = COALESCE(NULLIF(description, ''), metrics_label),
  card_category = COALESCE(NULLIF(card_category, ''), 'protector')
WHERE headline IS NULL OR headline = '';

COMMENT ON COLUMN city_insights.card_category IS 'promo type: protector or vehicle';
COMMENT ON COLUMN city_insights.headline IS 'Primary title shown on the home promo card';
COMMENT ON COLUMN city_insights.description IS 'Secondary line / supporting copy from super admin';
