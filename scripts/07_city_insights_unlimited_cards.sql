-- Allow unlimited promo cards per city/state and category.
-- Run this in Supabase SQL Editor if you already applied 06_promo_card_smart_fields.sql.

DROP INDEX IF EXISTS idx_city_insights_slug_category;
DROP INDEX IF EXISTS idx_city_insights_city_category;
DROP INDEX IF EXISTS idx_city_insights_city_name_lower;

ALTER TABLE city_insights DROP CONSTRAINT IF EXISTS city_insights_city_slug_key;

CREATE INDEX IF NOT EXISTS idx_city_insights_slug ON city_insights (city_slug);
CREATE INDEX IF NOT EXISTS idx_city_insights_city_name ON city_insights (LOWER(city_name));
CREATE INDEX IF NOT EXISTS idx_city_insights_category ON city_insights (card_category);
CREATE INDEX IF NOT EXISTS idx_city_insights_slug_category_lookup
  ON city_insights (city_slug, card_category);
