-- Smart promo cards: category (protector/vehicle), headline, description
-- Unlimited cards per city/state and category.

ALTER TABLE city_insights
  ADD COLUMN IF NOT EXISTS card_category TEXT NOT NULL DEFAULT 'protector',
  ADD COLUMN IF NOT EXISTS headline TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

ALTER TABLE city_insights DROP CONSTRAINT IF EXISTS city_insights_city_slug_key;

DROP INDEX IF EXISTS idx_city_insights_city_name_lower;
DROP INDEX IF EXISTS idx_city_insights_slug_category;
DROP INDEX IF EXISTS idx_city_insights_city_category;

CREATE INDEX IF NOT EXISTS idx_city_insights_slug ON city_insights (city_slug);
CREATE INDEX IF NOT EXISTS idx_city_insights_city_name ON city_insights (LOWER(city_name));
CREATE INDEX IF NOT EXISTS idx_city_insights_category ON city_insights (card_category);
CREATE INDEX IF NOT EXISTS idx_city_insights_slug_category_lookup
  ON city_insights (city_slug, card_category);
UPDATE city_insights
SET
  headline = COALESCE(NULLIF(headline, ''), 'Protector in ' || city_name),
  description = COALESCE(NULLIF(description, ''), metrics_label),
  card_category = COALESCE(NULLIF(card_category, ''), 'protector')
WHERE headline IS NULL OR headline = '';

COMMENT ON COLUMN city_insights.card_category IS 'promo type: protector, vehicle, or bulletproof_vehicle';
COMMENT ON COLUMN city_insights.headline IS 'Primary title shown on the home promo card';
COMMENT ON COLUMN city_insights.description IS 'Secondary line / supporting copy from super admin';
