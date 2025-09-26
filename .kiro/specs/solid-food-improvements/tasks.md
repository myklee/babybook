# Implementation Plan

- [x] 1. Database Schema Setup and Migration

  - Create new database tables for improved solid food system
  - Implement migration scripts to convert existing data
  - Add proper indexes and constraints for performance
  - _Requirements: 1.1, 2.1, 4.1, 5.1_

- [x] 1.1 Create new database tables

  - Write SQL migration to create `user_food_items` table with proper constraints
  - Write SQL migration to create `solid_food_events` table with foreign key relationships
  - Add unique constraints to prevent duplicate food names per user
  - Create indexes for optimal query performance
  - _Requirements: 2.4, 5.3_

- [x] 1.2 Implement data migration script

  - Create migration script to convert existing `solid_foods` records to new structure
  - Extract unique food names per user and create `user_food_items` records
  - Create feeding records for each existing solid food with type "solid"
  - Create `solid_food_events` linking records to maintain relationships
  - Preserve consumption counts, dates, and reaction data
  - _Requirements: 4.2, 4.4_

- [x] 1.3 Add database validation and constraints

  - Implement check constraints for food name length and format
  - Add foreign key constraints with proper cascade behavior
  - Create unique indexes to prevent duplicate food names per user
  - Add triggers to automatically update consumption counts
  - _Requirements: 2.4, 5.3_

- [x] 2. Update Database Types and Interfaces

  - Update TypeScript interfaces to reflect new database schema
  - Create new types for user food items and solid food events
  - Update existing feeding types to support multiple foods
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 2.1 Create new TypeScript interfaces

  - Define `UserFoodItem` interface with all required properties
  - Define `SolidFoodEvent` interface for linking foods to feeding events
  - Define `SolidFeedingEvent` interface extending base Feeding type
  - Create `FoodStats` interface for consumption analytics
  - _Requirements: 4.1, 4.3, 8.1_

- [x] 2.2 Update database type definitions

  - Add new table types to Database interface in supabase.ts
  - Update existing types to support new solid food event structure
  - Ensure proper typing for all CRUD operations
  - Add type guards for solid food event validation
  - _Requirements: 1.1, 3.1_

- [x] 3. Implement Core Store Methods for Food Management

  - Create methods for managing user's personal food list
  - Implement CRUD operations for food items
  - Add validation and duplicate prevention
  - _Requirements: 2.1, 2.4, 5.1, 5.3, 7.1_

- [x] 3.1 Implement user food item CRUD operations

  - Create `addUserFoodItem` method with duplicate checking
  - Create `getUserFoodItems` method with sorting and filtering
  - Create `updateUserFoodItem` method with validation
  - Create `deleteUserFoodItem` method with usage checking
  - Add proper error handling and user feedback
  - _Requirements: 5.1, 5.3, 7.1, 7.2_

- [x] 3.2 Add food search and autocomplete functionality

  - Implement fuzzy search for food names
  - Create autocomplete suggestions from user's food list
  - Add search result ranking based on consumption frequency
  - Optimize search performance for large food lists
  - _Requirements: 2.2, 2.5, 5.4_

- [x] 3.3 Implement consumption tracking

  - Create methods to increment/decrement food consumption counts
  - Update first_tried_date and last_tried_date automatically
  - Ensure consumption counts remain accurate during edits
  - Add batch update capabilities for multiple foods
  - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [x] 4. Implement Solid Food Event Management

  - Create methods for recording solid food events as feeding events
  - Support multiple foods per event
  - Integrate with existing feeding system
  - _Requirements: 1.1, 3.1, 3.2, 3.4_

- [x] 4.1 Create solid food event creation method

  - Implement `createSolidFoodEvent` method that creates feeding record
  - Support multiple food selection in single event
  - Create corresponding `solid_food_events` records for each food
  - Update consumption counts for all selected foods
  - Ensure transaction integrity across all operations
  - _Requirements: 1.1, 3.1, 3.2, 4.1_

- [x] 4.2 Implement solid food event editing

  - Create `updateSolidFoodEvent` method for modifying existing events
  - Support adding and removing foods from existing events
  - Update consumption counts when foods are added or removed
  - Maintain data consistency during concurrent edits
  - _Requirements: 3.4, 4.4_

- [x] 4.3 Add solid food event deletion

  - Implement `deleteSolidFoodEvent` method with proper cleanup
  - Decrement consumption counts for all foods in the event
  - Remove feeding record and associated solid_food_events records
  - Ensure referential integrity is maintained
  - _Requirements: 1.5, 4.5_

- [x] 5. Create New Solid Food Event Modal Component

  - Build new modal for recording solid food events
  - Support multiple food selection
  - Integrate with feeding event creation
  - _Requirements: 3.1, 3.2, 5.1, 6.1_

- [x] 5.1 Build multi-food selection interface

  - Create searchable food list with autocomplete
  - Implement multi-select functionality with visual feedback
  - Add "Add new food" option for custom foods
  - Show selected foods with removal capability
  - _Requirements: 3.1, 3.2, 5.1, 5.4_

- [x] 5.2 Integrate feeding event metadata

  - Add date and time picker for event timing
  - Include notes field for feeding observations
  - Add reaction selection (liked, disliked, neutral, allergic)
  - Ensure consistent UI with other feeding modals
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 5.3 Implement form validation and submission

  - Validate that at least one food is selected
  - Ensure all required fields are completed
  - Handle form submission with proper error handling
  - Show loading states and success feedback
  - _Requirements: 3.1, 5.1, 6.1_

- [x] 6. Create Food Item Management Component

  - Build interface for managing personal food list
  - Support adding, editing, and deleting food items
  - Show consumption statistics
  - _Requirements: 5.1, 7.1, 7.2, 8.1_

- [x] 6.1 Build food list display

  - Create searchable and sortable food list
  - Show consumption count for each food item
  - Display first tried and last tried dates
  - Add filtering options (by consumption, date, etc.)
  - _Requirements: 4.2, 7.1, 8.1_

- [x] 6.2 Implement food item editing

  - Add inline editing for food names
  - Show confirmation dialogs for destructive actions
  - Handle validation errors gracefully
  - Update UI immediately after successful changes
  - _Requirements: 7.1, 7.2, 7.4_

- [x] 6.3 Add food deletion with usage warnings

  - Check if food is used in existing events before deletion
  - Show warning dialog with usage count and impact
  - Provide options to archive vs permanently delete
  - Handle cascading updates when food is deleted
  - _Requirements: 7.3, 7.4, 7.5_

- [x] 7. Update Timeline and History Components

  - Modify existing components to display solid food events
  - Show multiple foods per event
  - Maintain consistent editing interface
  - _Requirements: 1.2, 1.3, 1.4, 6.4_

- [x] 7.1 Update Timeline component for solid food events

  - Display solid food events with appropriate icons
  - Show multiple food names in compact format
  - Add expand/collapse for events with many foods
  - Maintain chronological ordering with other feeding events
  - _Requirements: 1.2, 1.3, 3.3_

- [x] 7.2 Enhance HistoryList component

  - Include solid food events in feeding history
  - Show food names, consumption counts, and reactions
  - Add filtering options for solid food events
  - Ensure consistent styling with other feeding types
  - _Requirements: 1.2, 1.3, 4.2_

- [x] 7.3 Update EditRecord component

  - Support editing solid food events through unified interface
  - Allow modification of food selection and metadata
  - Handle validation and error states consistently
  - Maintain transaction integrity during edits
  - _Requirements: 1.4, 3.4, 6.4_

- [x] 8. Update Feeding Schedule Integration

  - Ensure solid food events appear in feeding schedules
  - Maintain existing schedule calculation logic
  - Update feeding type filters
  - _Requirements: 1.2, 6.5_

- [x] 8.1 Update feeding schedule calculations

  - Ensure solid food events are included when enabled in settings
  - Maintain existing `include_solids_in_schedule` functionality
  - Update feeding type filtering to handle new event structure
  - Test schedule accuracy with mixed feeding types
  - _Requirements: 1.2, 6.5_

- [x] 8.2 Update recent feedings display

  - Include solid food events in recent feedings list
  - Show appropriate formatting for multi-food events
  - Maintain consistent timing and sorting
  - Add visual indicators for solid food events
  - _Requirements: 1.3_

- [ ] 9. Comprehensive Testing and Validation

  - Write unit tests for all new functionality
  - Create integration tests for user workflows
  - Test data migration accuracy
  - Validate performance with large datasets
  - _Requirements: All requirements_

- [ ] 9.1 Write unit tests for store methods

  - Test food item CRUD operations with edge cases
  - Validate solid food event creation and editing
  - Test consumption count calculations
  - Verify error handling and validation
  - _Requirements: 2.4, 4.1, 4.4, 5.3_

- [ ] 9.2 Create integration tests for user workflows

  - Test complete solid food event creation flow
  - Validate food list management workflows
  - Test editing and deletion scenarios
  - Verify core functionality accuracy
  - _Requirements: 1.1, 3.1, 7.1_

- [ ] 9.3 Test data migration and rollback

  - Validate migration script with sample data
  - Test edge cases (empty data, duplicates, large datasets)
  - Verify rollback procedures work correctly
  - Test performance with production-sized datasets
  - _Requirements: 4.2, 7.5_

- [ ] 10. Performance Optimization and Cleanup

  - Optimize database queries for large datasets
  - Remove deprecated solid food components
  - Update documentation and user guides
  - _Requirements: All requirements_

- [ ] 10.1 Optimize database performance

  - Add appropriate indexes for common queries
  - Optimize joins between feedings and solid_food_events
  - Implement query result caching where appropriate
  - Test performance with large numbers of foods and events
  - _Requirements: 2.2, 4.2_

- [ ] 10.2 Remove deprecated code and components

  - Remove old SolidFoodModal, SolidFoodInput, and related components
  - Clean up unused methods in baby store
  - Remove deprecated database table after successful migration
  - Update imports and references throughout codebase
  - _Requirements: All requirements_

- [ ] 10.3 Update documentation and user experience
  - Update component documentation for new solid food system
  - Create user guide for new food management features
  - Add helpful tooltips and onboarding for new functionality
  - Ensure accessibility compliance for all new components
  - _Requirements: All requirements_

## Related Task Files

- **Food Statistics and Analytics**: See `.kiro/specs/solid-food-analytics/tasks.md` for analytics and statistics features that were split out for later implementation.
