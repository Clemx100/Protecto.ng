-- Create the public.vehicles table for Protector.Ng
-- Run this in Supabase: Dashboard → SQL Editor → New query → paste and run
-- This fixes: "Could not find the table 'public.vehicles' in the schema cache"
-- After running, vehicles added in Super Admin will show in the app and vice versa.

-- Create vehicles table
CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_code text NOT NULL UNIQUE,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  type text NOT NULL DEFAULT 'suv' CHECK (type IN ('sedan', 'suv', 'van', 'motorcade')),
  is_armored boolean NOT NULL DEFAULT false,
  capacity integer NOT NULL DEFAULT 4,
  license_plate text NOT NULL,
  color text,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_available boolean NOT NULL DEFAULT true,
  current_location jsonb,
  last_maintenance text,
  image_url text,
  photo_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for common filters
CREATE INDEX IF NOT EXISTS idx_vehicles_is_available ON public.vehicles (is_available);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON public.vehicles (type);
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON public.vehicles (created_at DESC);

-- Allow the app (anon/authenticated) to read vehicles so booking and services can list them
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read vehicles" ON public.vehicles;
CREATE POLICY "Allow read vehicles"
  ON public.vehicles FOR SELECT
  USING (true);

-- Insert/update/delete: only via service role (Super Admin API bypasses RLS).

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION public.set_vehicles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vehicles_updated_at ON public.vehicles;
CREATE TRIGGER vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_vehicles_updated_at();

-- Grant usage to anon and authenticated so the app can read
GRANT SELECT ON public.vehicles TO anon;
GRANT SELECT ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;

COMMENT ON TABLE public.vehicles IS 'Fleet vehicles for Protector.Ng; managed in Super Admin, shown in app for booking.';
