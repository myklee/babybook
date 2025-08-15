-- Verification script for migration 016: Add include_solids_in_schedule column
-- Run this script after applying the migration to verify it worked correctly

-- Test 1: Check if the column exists and has the correct properties
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'baby_settings' 
    AND column_name = 'include_solids_in_schedule';

-- Expected result:
-- column_name: include_solids_in_schedule
-- data_type: boolean
-- is_nullable: NO
-- column_default: false

-- Test 2: Check that all existing records have the default value
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN include_solids_in_schedule = false THEN 1 END) as records_with_false,
    COUNT(CASE WHEN include_solids_in_schedule = true THEN 1 END) as records_with_true,
    COUNT(CASE WHEN include_solids_in_schedule IS NULL THEN 1 END) as null_records
FROM baby_settings;

-- Expected result: All records should have include_solids_in_schedule = false, no NULL values

-- Test 3: Verify the column comment exists
SELECT 
    col_description(c.oid, a.attnum) as column_comment
FROM pg_class c
JOIN pg_attribute a ON a.attrelid = c.oid
WHERE c.relname = 'baby_settings' 
    AND a.attname = 'include_solids_in_schedule';

-- Expected result: Should show the comment about the column purpose

-- Test 4: Test inserting a new record (should get default value)
-- Note: This requires a valid baby_id, so it's commented out
-- INSERT INTO baby_settings (baby_id) VALUES ('some-valid-baby-id');
-- SELECT include_solids_in_schedule FROM baby_settings WHERE baby_id = 'some-valid-baby-id';
-- Expected result: include_solids_in_schedule should be false

-- Test 5: Test that we can update the column value
-- UPDATE baby_settings SET include_solids_in_schedule = true WHERE baby_id = 'some-valid-baby-id';
-- SELECT include_solids_in_schedule FROM baby_settings WHERE baby_id = 'some-valid-baby-id';
-- Expected result: include_solids_in_schedule should be true

ECHO 'Migration 016 verification complete. Check the results above to ensure:';
ECHO '1. Column exists with correct type (boolean) and NOT NULL constraint';
ECHO '2. All existing records have include_solids_in_schedule = false';
ECHO '3. Column comment is present';
ECHO '4. New records get the default value of false';
ECHO '5. Column can be updated to true when needed';