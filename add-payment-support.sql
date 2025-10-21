-- Add payment support to PROTECTOR.NG database
-- Run this in your Supabase SQL Editor

-- 1. Create payments table for tracking payment history
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NGN',
  reference VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'paystack',
  paid_at TIMESTAMP WITH TIME ZONE,
  customer_email VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 3. Update bookings table to ensure 'paid' status is supported
-- (This is just a comment - the status column already exists as text, so 'paid' is automatically supported)

-- 4. Enable RLS (Row Level Security) for payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for payments table

-- Allow users to view their own payment records
CREATE POLICY "Users can view their own payments"
  ON payments
  FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE client_id = auth.uid()
    )
  );

-- Allow operators to view all payments
CREATE POLICY "Operators can view all payments"
  ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'operator'
    )
  );

-- Allow service role to insert/update payments (for webhook)
CREATE POLICY "Service role can manage payments"
  ON payments
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- 6. Create a function to update booking status when payment is received
CREATE OR REPLACE FUNCTION handle_payment_success()
RETURNS TRIGGER AS $$
BEGIN
  -- Update booking status to 'paid' when payment is successful
  IF NEW.status = 'success' AND (OLD.status IS NULL OR OLD.status != 'success') THEN
    UPDATE bookings 
    SET status = 'paid', updated_at = NOW()
    WHERE id = NEW.booking_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger to auto-update booking status on payment
DROP TRIGGER IF EXISTS payment_success_trigger ON payments;
CREATE TRIGGER payment_success_trigger
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION handle_payment_success();

-- 8. Add a view for operator dashboard showing payment status
CREATE OR REPLACE VIEW operator_bookings_with_payments AS
SELECT 
  b.*,
  p.amount as payment_amount,
  p.reference as payment_reference,
  p.paid_at,
  p.payment_method,
  CASE 
    WHEN p.status = 'success' THEN true 
    ELSE false 
  END as is_paid
FROM bookings b
LEFT JOIN payments p ON b.id = p.booking_id;

-- Grant access to the view
GRANT SELECT ON operator_bookings_with_payments TO authenticated;
GRANT SELECT ON operator_bookings_with_payments TO service_role;

-- Done!
SELECT 'Payment support added successfully!' as message;

