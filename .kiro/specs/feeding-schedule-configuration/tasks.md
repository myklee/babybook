# Feeding Schedule Configuration - Implementation Plan

- [x] 1. Create database migration for baby_settings table

  - Add `include_solids_in_schedule` boolean column with default FALSE
  - Update existing records to have the default value
  - Test migration on development database
  - _Requirements: 1.4, 2.1_

- [x] 2. Update TypeScript interfaces and database types

  - Add `include_solids_in_schedule` field to BabySettings interface
  - Update Supabase database types in supabase.ts
  - Create feeding schedule utility types and interfaces
  - _Requirements: 1.1, 2.1_

- [x] 3. Implement feeding schedule calculation utilities

  - Create `getFeedingTypesForSchedule` function
  - Implement `getScheduleRelevantFeedings` filtering function
  - Build `calculateNextFeedingTime` with solids inclusion logic
  - Add unit tests for schedule calculation functions
  - _Requirements: 1.1, 1.2, 3.1, 3.2_

- [x] 4. Extend baby store with schedule configuration methods

  - Add `getBabySettings` helper function
  - Implement `updateBabySettings` with Supabase integration
  - Create `getNextFeedingTime` method using new calculation logic
  - Add `doesFeedingAffectSchedule` utility method
  - _Requirements: 2.2, 2.3, 3.1, 3.3_

- [x] 5. Update feeding addition logic to respect schedule settings

  - Modify feeding addition methods to check schedule relevance
  - Update feeding reminder calculations when new feedings are added
  - Ensure solid food additions don't affect schedule when setting is disabled
  - _Requirements: 1.2, 3.2, 3.4_

- [x] 6. Create baby settings form component with solids schedule option

  - Add checkbox for "Include solid foods in feeding schedule" setting
  - Implement form validation and error handling
  - Add helpful description text explaining the setting
  - Create save/update functionality with loading states
  - _Requirements: 2.1, 2.2_

- [x] 7. Update existing baby settings UI to include new option

  - Integrate the new setting into existing baby settings forms
  - Ensure the setting loads correctly for existing babies
  - Add proper form styling consistent with design system
  - _Requirements: 2.1, 2.2_

- [x] 8. Update feeding schedule calculations throughout the app

  - Modify any existing feeding reminder logic to use new calculation methods
  - Update feeding analytics to respect schedule configuration
  - Ensure feeding history displays correctly based on settings
  - _Requirements: 3.1, 3.4_

- [x] 9. Handle default settings creation for new babies

  - Update baby creation logic to set default schedule configuration
  - Ensure new babies have `include_solids_in_schedule = false` by default
  - Create default baby settings when missing
  - _Requirements: 1.4_

- [x] 10. Add error handling and user feedback

  - Implement error handling for settings updates
  - Add success notifications when settings are saved
  - Handle network errors with retry mechanisms
  - Create fallback behavior when settings are missing
  - _Requirements: 2.3_

- [x] 11. Test and validate the complete feature
  - Test feeding schedule calculations with both settings enabled/disabled
  - Verify that existing data works correctly after migration
  - Test settings persistence across app sessions
  - Validate that solid foods are properly excluded/included based on setting
  - _Requirements: 1.1, 1.2, 2.2, 3.1, 3.2, 3.4_
