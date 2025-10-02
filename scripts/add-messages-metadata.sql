-- Add metadata column to messages table for storing invoice data
-- Run this in Supabase SQL Editor

-- Check if metadata column exists, if not add it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE messages ADD COLUMN metadata JSONB DEFAULT '{}';
    COMMENT ON COLUMN messages.metadata IS 'JSON data for special message types (invoice data, attachments, etc.)';
    RAISE NOTICE 'Added metadata column to messages table';
  ELSE
    RAISE NOTICE 'Metadata column already exists';
  END IF;
END $$;

-- Also add invoice_data column as fallback if needed
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'invoice_data'
  ) THEN
    ALTER TABLE messages ADD COLUMN invoice_data JSONB DEFAULT NULL;
    COMMENT ON COLUMN messages.invoice_data IS 'Invoice data for invoice messages (fallback field)';
    RAISE NOTICE 'Added invoice_data column to messages table';
  ELSE
    RAISE NOTICE 'Invoice_data column already exists';
  END IF;
END $$;

-- Create index for quick filtering of invoice messages
CREATE INDEX IF NOT EXISTS idx_messages_invoice 
ON messages(booking_id) 
WHERE message_type = 'invoice';

-- Create index for metadata queries
CREATE INDEX IF NOT EXISTS idx_messages_metadata 
ON messages USING gin(metadata);

SELECT 'Messages table updated successfully for invoice support! ✅' as status;


