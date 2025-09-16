-- Check the current structure of the agents table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'agents' 
AND table_schema = 'public'
ORDER BY ordinal_position;
