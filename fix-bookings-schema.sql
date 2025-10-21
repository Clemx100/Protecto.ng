-- Fix bookings table schema for Paystack integration
-- This adds missing columns that are causing the test to fail

-- First, let's check what columns exist
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add duration column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bookings' AND column_name='duration') THEN
        ALTER TABLE bookings ADD COLUMN duration TEXT;
    END IF;
    
    -- Add pickup_details column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bookings' AND column_name='pickup_details') THEN
        ALTER TABLE bookings ADD COLUMN pickup_details JSONB;
    END IF;
    
    -- Add destination_details column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bookings' AND column_name='destination_details') THEN
        ALTER TABLE bookings ADD COLUMN destination_details JSONB;
    END IF;
    
    -- Add personnel column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bookings' AND column_name='personnel') THEN
        ALTER TABLE bookings ADD COLUMN personnel JSONB;
    END IF;
    
    -- Add vehicles column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bookings' AND column_name='vehicles') THEN
        ALTER TABLE bookings ADD COLUMN vehicles JSONB;
    END IF;
    
    -- Add protection_type column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bookings' AND column_name='protection_type') THEN
        ALTER TABLE bookings ADD COLUMN protection_type TEXT;
    END IF;
    
    -- Add contact column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bookings' AND column_name='contact') THEN
        ALTER TABLE bookings ADD COLUMN contact JSONB;
    END IF;
    
    -- Add timestamp column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bookings' AND column_name='timestamp') THEN
        ALTER TABLE bookings ADD COLUMN timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Add total_price column if missing (for payment integration)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bookings' AND column_name='total_price') THEN
        ALTER TABLE bookings ADD COLUMN total_price DECIMAL(10,2);
    END IF;
    
    -- Add payment_status column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bookings' AND column_name='payment_status') THEN
        ALTER TABLE bookings ADD COLUMN payment_status TEXT DEFAULT 'pending';
    END IF;
    
    -- Add payment_reference column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bookings' AND column_name='payment_reference') THEN
        ALTER TABLE bookings ADD COLUMN payment_reference TEXT;
    END IF;
    
    -- Add payment_amount column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bookings' AND column_name='payment_amount') THEN
        ALTER TABLE bookings ADD COLUMN payment_amount DECIMAL(10,2);
    END IF;
    
    -- Add payment_currency column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bookings' AND column_name='payment_currency') THEN
        ALTER TABLE bookings ADD COLUMN payment_currency TEXT DEFAULT 'NGN';
    END IF;
    
    -- Add payment_method column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bookings' AND column_name='payment_method') THEN
        ALTER TABLE bookings ADD COLUMN payment_method TEXT;
    END IF;
    
    -- Add payment_date column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bookings' AND column_name='payment_date') THEN
        ALTER TABLE bookings ADD COLUMN payment_date TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add payment_approved column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bookings' AND column_name='payment_approved') THEN
        ALTER TABLE bookings ADD COLUMN payment_approved BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add payment_approved_at column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bookings' AND column_name='payment_approved_at') THEN
        ALTER TABLE bookings ADD COLUMN payment_approved_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Show the updated structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;

SELECT '✅ Bookings table schema updated for Paystack integration!' as status;
