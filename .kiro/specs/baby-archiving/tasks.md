# Baby Archiving - Implementation Tasks

## Database Migration

- [ ] 1. Create database migration to add archived column
  - Add `archived BOOLEAN DEFAULT FALSE` to babies table
  - Update existing records to set archived = FALSE
  - Add index on archived column for query performance
  - _Requirements: 1.3, 2.3, 3.1_

## Store Updates

- [ ] 2. Update baby store functions
  - Replace `deleteBaby()` function with `archiveBaby()`
  - Update `getBabies()` to filter out archived babies
  - Add `getArchivedBabies()` function for future use
  - Update TypeScript interfaces to include archived field
  - _Requirements: 1.1, 1.4, 3.3_

## UI Component Updates

- [ ] 3. Update EditBabyModal component

  - Replace "Delete Baby" button with "Mark as Grown Up" button
  - Update button styling to be less destructive (remove red color)
  - Change confirmation dialog text to positive messaging
  - Update success/error messages for archiving
  - _Requirements: 1.1, 2.1, 2.2_

- [ ] 4. Update confirmation dialog
  - Change dialog title from "Delete Baby" to "Mark as Grown Up"
  - Update message to explain data preservation
  - Use positive language about baby growing up
  - Maintain cancel option for user safety
  - _Requirements: 2.1, 2.2_

## Testing and Validation

- [ ] 5. Test archive functionality

  - Verify baby is removed from active lists after archiving
  - Confirm all baby data remains in database
  - Test home page updates correctly
  - Verify no data loss occurs during archive process
  - _Requirements: 1.2, 1.3, 3.2_

- [ ] 6. Update error handling
  - Handle archive operation failures gracefully
  - Show appropriate success/error messages
  - Ensure user is redirected properly after archiving
  - Test edge cases and error scenarios
  - _Requirements: 2.2, 3.4_
