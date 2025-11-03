-- ====================================================================
-- ADD MISSING completed_at COLUMN TO BOOKINGS TABLE
-- ====================================================================
-- This fixes the error: "Could not find the 'completed_at' column"
-- ====================================================================

BEGIN;

-- Add completed_at column if it doesn't exist
DO $$ 
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'completed_at'
    ) THEN
        -- Add the column
        ALTER TABLE bookings 
        ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE '✅ Added completed_at column to bookings table';
        
        -- Set completed_at for already completed bookings based on updated_at
        UPDATE bookings 
        SET completed_at = updated_at 
        WHERE status = 'completed' 
        AND completed_at IS NULL;
        
        RAISE NOTICE '✅ Set completed_at for existing completed bookings';
    ELSE
        RAISE NOTICE '⚠️ completed_at column already exists';
    END IF;
END $$;

-- Also add other potentially missing timestamp columns
DO $$ 
BEGIN
    -- Add accepted_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'accepted_at'
    ) THEN
        ALTER TABLE bookings ADD COLUMN accepted_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added accepted_at column';
    END IF;
    
    -- Add deployed_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'deployed_at'
    ) THEN
        ALTER TABLE bookings ADD COLUMN deployed_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added deployed_at column';
    END IF;
    
    -- Add cancelled_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE bookings ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added cancelled_at column';
    END IF;
END $$;

COMMIT;

-- Verify the columns were added
DO $$ 
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'bookings' 
    AND column_name IN ('completed_at', 'accepted_at', 'deployed_at', 'cancelled_at');
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Timestamp columns found: %', col_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FIX COMPLETE!';
    RAISE NOTICE 'Operators can now complete bookings!';
    RAISE NOTICE '========================================';
END $$;







