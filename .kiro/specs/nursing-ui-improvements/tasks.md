# Implementation Plan

- [x] 1. Create PersistentNursingIndicator component
  - Create new component to display active nursing session on main page
  - Implement floating indicator with elapsed time display
  - Add current breast and session status information
  - Implement tap-to-reopen modal functionality
  - Add visual progress animations and styling
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Enhance store with active session tracking
  - Add active nursing session state management to babyStore
  - Implement getActiveNursingSession method
  - Add session persistence to local storage
  - Create session recovery logic for app restart
  - Add background session continuation support
  - _Requirements: 1.1, 4.1, 4.2, 4.3, 4.4_

- [x] 3. Integrate persistent indicator into HomePage
  - Add PersistentNursingIndicator to HomePage template
  - Implement computed property for active nursing sessions
  - Add conditional display logic for indicator visibility
  - Connect tap handler to reopen nursing modal
  - Style indicator to fit with existing HomePage design
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 4. Simplify DualBreastTimer UI by removing icons and emojis
  - Replace nursing icon (🤱) with "Nursing Timer" text label
  - Remove breast icons and use "Left Breast" / "Right Breast" text
  - Update timer separator to use text instead of "vs" symbol
  - Implement clean typography-focused design
  - Remove all emoji usage from component
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. Simplify BreastTimer UI with text-based labels
  - Replace breast SVG icons with text labels
  - Remove state indicator icons and use text descriptions
  - Update button text to be more descriptive
  - Implement clean button styling without decorative elements
  - Remove all visual symbols and use clear text labels
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 6. Implement automatic time handling in nursing timers
  - Remove manual time entry requirements from save process
  - Auto-capture start time when timer begins
  - Auto-calculate duration when session ends
  - No required entry
  - Update validation to work with automatic timing
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 7. Enhance NursingTimerModal with persistence support
  - Implement session state persistence when modal closes
  - Add session recovery when modal reopens
  - Handle app backgrounding gracefully during active sessions
  - Update modal close logic to support background continuation
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 8. Create NursingEditModal component
  - Create dedicated modal component for editing completed nursing sessions
  - Implement existing time picker component for start and end times
  - Add breast selection radio buttons
  - Create notes editing text area
  - Implement validation for logical time ranges and data integrity
  - nothing is required
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 9. Add time validation and error handling to edit modal
  - Validate that end time is after start time
  - Check for reasonable session durations
  - Provide helpful error messages for invalid inputs
  - Implement real-time validation feedback
  - _Requirements: 5.3, 5.4, 5.5_

- [x] 10. Integrate NursingEditModal into existing edit workflow
  - Update HistoryList component to use new edit modal for nursing sessions
  - Replace existing nursing edit logic with dedicated modal
  - Implement proper data flow between components
  - Add edit modal state management
  - Test integration with existing nursing session data
  - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [x] 10.1. Add delete functionality to NursingEditModal
  - Add delete button to the nursing edit modal interface
  - Implement confirmation dialog for session deletion
  - Add delete event emission to parent components
  - Integrate with store's deleteNursingSession method
  - Add proper error handling for deletion failures
  - Update modal styling to accommodate delete button
  - _Requirements: 5.6_

- [x] 11. Implement session persistence and recovery system
  - Create local storage persistence for active nursing sessions
  - Add session recovery logic for app restart scenarios
  - Implement background timer continuation
  - Add device identification for session ownership
  - Create data integrity validation for recovered sessions
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_