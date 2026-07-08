-- City-specific home promo cards (Protector in {city})
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS city_insights (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  city_name TEXT NOT NULL,
  city_slug TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  response_time_label TEXT NOT NULL DEFAULT '15–45 min',
  metrics_label TEXT NOT NULL DEFAULT 'Avg response • Avg mission price',
  price_min DECIMAL(12,2) NOT NULL DEFAULT 250000,
  price_max DECIMAL(12,2) NOT NULL DEFAULT 700000,
  currency TEXT NOT NULL DEFAULT 'NGN',
  cta_label TEXT NOT NULL DEFAULT 'Get city insights →',
  cta_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_city_insights_city_name_lower
  ON city_insights (LOWER(city_name));

CREATE INDEX IF NOT EXISTS idx_city_insights_active ON city_insights (is_active);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_city_insights_updated_at'
  ) THEN
    CREATE TRIGGER update_city_insights_updated_at
    BEFORE UPDATE ON city_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

INSERT INTO city_insights (
  city_name,
  city_slug,
  image_url,
  response_time_label,
  metrics_label,
  price_min,
  price_max,
  is_default,
  sort_order
)
SELECT
  'Lagos',
  'lagos',
  '/images/PRADO/slideshow/lexus-lx570-gallery-1.webp',
  '15–45 min',
  'Avg response • Avg mission price',
  250000,
  700000,
  TRUE,
  0
WHERE NOT EXISTS (SELECT 1 FROM city_insights WHERE city_slug = 'lagos');
