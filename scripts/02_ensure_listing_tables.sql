-- Idempotent listing schema migration for marketplace features.
-- Run this in Supabase SQL editor if listing APIs report missing tables.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_type') THEN
    CREATE TYPE vehicle_type AS ENUM ('sedan', 'suv', 'van', 'motorcade');
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS vehicle_listings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  type vehicle_type NOT NULL DEFAULT 'suv',
  seats INTEGER DEFAULT 4,
  with_driver BOOLEAN DEFAULT FALSE,
  price_per_day DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'NGN',
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  availability JSONB DEFAULT '{}'::JSONB,
  kyc_status TEXT DEFAULT 'pending',
  approval_status TEXT DEFAULT 'pending',
  moderation_notes TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS protector_listings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  provider_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT NOT NULL,
  category_label TEXT DEFAULT 'Protector',
  bio TEXT,
  qualifications TEXT[] DEFAULT ARRAY[]::TEXT[],
  years_experience INTEGER DEFAULT 0,
  hourly_rate DECIMAL(10,2),
  daily_rate DECIMAL(10,2),
  currency TEXT DEFAULT 'NGN',
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  availability JSONB DEFAULT '{}'::JSONB,
  kyc_status TEXT DEFAULT 'pending',
  approval_status TEXT DEFAULT 'pending',
  moderation_notes TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listing_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  listing_type TEXT NOT NULL CHECK (listing_type IN ('vehicle', 'protector')),
  listing_id UUID NOT NULL,
  provider_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  verification_status TEXT DEFAULT 'pending',
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_listings_owner ON vehicle_listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_listings_approval_status ON vehicle_listings(approval_status);
CREATE INDEX IF NOT EXISTS idx_vehicle_listings_kyc_status ON vehicle_listings(kyc_status);
CREATE INDEX IF NOT EXISTS idx_protector_listings_provider ON protector_listings(provider_id);
CREATE INDEX IF NOT EXISTS idx_protector_listings_approval_status ON protector_listings(approval_status);
CREATE INDEX IF NOT EXISTS idx_protector_listings_kyc_status ON protector_listings(kyc_status);
CREATE INDEX IF NOT EXISTS idx_listing_documents_listing ON listing_documents(listing_type, listing_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_vehicle_listings_updated_at'
      AND tgrelid = 'vehicle_listings'::regclass
  ) THEN
    CREATE TRIGGER update_vehicle_listings_updated_at
    BEFORE UPDATE ON vehicle_listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_protector_listings_updated_at'
      AND tgrelid = 'protector_listings'::regclass
  ) THEN
    CREATE TRIGGER update_protector_listings_updated_at
    BEFORE UPDATE ON protector_listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_listing_documents_updated_at'
      AND tgrelid = 'listing_documents'::regclass
  ) THEN
    CREATE TRIGGER update_listing_documents_updated_at
    BEFORE UPDATE ON listing_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

SELECT 'Listing marketplace schema ensured successfully.' AS status;
