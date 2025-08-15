# Migration 016 Testing Guide

## Overview

This guide explains how to test migration `016_add_include_solids_in_schedule.sql` which adds the `include_solids_in_schedule` column to the `baby_settings` table.

## Migration Details

The migration performs the following operations:

1. Adds `include_solids_in_schedule BOOLEAN DEFAULT FALSE` column
2. Updates all existing records to have `include_solids_in_schedule = FALSE`
3. Sets the column to NOT NULL
4. Adds documentation comment to the column

## Testing Methods

### Method 1: Using Supabase CLI (Recommended)

If you have Supabase CLI installed:

```bash
# Apply the migration
supabase db push

# Or if using local development
supabase migration up

# Run verification queries
supabase db sql --file verify-migration-016.sql
```

### Method 2: Using SQL Client

Connect to your database and run the verification script:

```bash
psql -h your-db-host -U your-username -d your-database -f verify-migration-016.sql
```

### Method 3: Using Node.js Test Script

Run the JavaScript test script (requires environment variables):

```bash
# Set environment variables
export VITE_SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_KEY="your-service-key"

# Run the test
node test-migration-016.js
```

### Method 4: Manual Verification via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to Table Editor → baby_settings
3. Check that the `include_solids_in_schedule` column exists
4. Verify all existing records have the value `false`
5. Try creating a new record and confirm it gets the default value

## Expected Results

### Column Properties

- **Name**: `include_solids_in_schedule`
- **Type**: `boolean`
- **Default**: `false`
- **Nullable**: `NO` (NOT NULL constraint)
- **Comment**: Explains the column purpose

### Data Verification

- All existing `baby_settings` records should have `include_solids_in_schedule = false`
- New records should automatically get `include_solids_in_schedule = false`
- The column should accept both `true` and `false` values when explicitly set
- No records should have `NULL` values for this column

## Rollback Plan

If the migration needs to be rolled back:

```sql
-- Remove the column
ALTER TABLE baby_settings DROP COLUMN include_solids_in_schedule;
```

## Next Steps

After successful migration testing:

1. Update TypeScript interfaces in `src/lib/supabase.ts`
2. Proceed with implementing the feeding schedule logic
3. Update the baby store to handle the new setting
4. Create UI components for the setting

## Troubleshooting

### Common Issues

1. **Column already exists**: The migration is idempotent and should handle this gracefully
2. **Permission errors**: Ensure you have proper database permissions
3. **Foreign key constraints**: Ensure all referenced baby records exist

### Verification Queries

```sql
-- Check column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'baby_settings' AND column_name = 'include_solids_in_schedule';

-- Check all records have default value
SELECT COUNT(*) FROM baby_settings WHERE include_solids_in_schedule IS NOT FALSE;
-- Should return 0

-- Check column properties
\d baby_settings
```
