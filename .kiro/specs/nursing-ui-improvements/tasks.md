# Implementation Plan

- [ ] 1. Create PersistentNursingIndicator component
  - Create new component to display active nursing session on main page
  - Implement floating indicator with elapsed time display
  - Add current breast and session status information
  - Implement tap-to-reopen modal functionality
  - Add visual progress animations and styling
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Enhance store with active session tracking
  - Add active nursing session state management to babyStore
  - Implement getActiveNursingSession method
  - Add session persistence to local storage
  - Create session recovery logic for app restart
  - Add background session continuation support
  - _Requirements: 1.1, 4.1, 4.2, 4.3, 4.4_

- [ ] 3. Integrate persistent indicator into HomePage
  - Add PersistentNursingIndicator to HomePage template
  - Implement computed property for active nursing sessions
  - Add conditional display logic for indicator visibility
  - Connect tap handler to reopen nursing modal
  - Style indicator to fit with existing HomePage design
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 4. Simplify DualBreastTimer UI by removing icons and emojis
  - Replace nursing icon (🤱) with "Nursing Timer" text label
  - Remove breast icons and use "Left Breast" / "Right Breast" text
  - Update timer separator to use text instead of "vs" symbol
  - Implement clean typography-focused design
  - Remove all emoji usage from component
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 5. Simplify BreastTimer UI with text-based labels
  - Replace breast SVG icons with text labels
  - Remove state indicator icons and use text descriptions
  - Update button text to be more descriptive
  - Implement clean button styling without decorative elements
  - Remove all visual symbols and use clear text labels
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 6. Implement automatic time handling in nursing timers
  - Remove manual time entry requirements from save process
  - Auto-capture start time when timer begins
  - Auto-calculate duration when session ends
  - Simplify save process to only require breast selection and notes
  - Update validation to work with automatic timing
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 7. Enhance NursingTimerModal with persistence support
  - Prevent modal close during active nursing sessions
  - Implement session state persistence when modal closes
  - Add session recovery when modal reopens
  - Handle app backgrounding gracefully during active sessions
  - Update modal close logic to support background continuation
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 8. Create NursingEditModal component
  - Create dedicated modal component for editing completed nursing sessions
  - Implement time picker controls for start and end times
  - Add breast selection radio buttons
  - Create notes editing text area
  - Implement validation for logical time ranges and data integrity
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 9. Add time validation and error handling to edit modal
  - Validate that end time is after start time
  - Check for reasonable session durations
  - Prevent future timestamps
  - Provide helpful error messages for invalid inputs
  - Implement real-time validation feedback
  - _Requirements: 5.3, 5.4, 5.5_

- [ ] 10. Integrate NursingEditModal into existing edit workflow
  - Update HistoryList component to use new edit modal for nursing sessions
  - Replace existing nursing edit logic with dedicated modal
  - Implement proper data flow between components
  - Add edit modal state management
  - Test integration with existing nursing session data
  - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [ ] 11. Implement session persistence and recovery system
  - Create local storage persistence for active nursing sessions
  - Add session recovery logic for app restart scenarios
  - Implement background timer continuation
  - Add device identification for session ownership
  - Create data integrity validation for recovered sessions
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 12. Update nursing session display components
  - Enhance NursingSessionDisplay to show active session status
  - Add "In Progress" indicators for ongoing sessions
  - Update session formatting for active vs completed sessions
  - Implement visual distinction between active and historical sessions
  - Add tap-to-view functionality for active sessions
  - _Requirements: 1.2, 1.3, 1.5_

- [ ] 13. Add comprehensive error handling and validation
  - Implement session persistence error handling
  - Add validation for all nursing session data
  - Create user-friendly error messages
  - Add fallback mechanisms for persistence failures
  - Implement graceful degradation for unsupported features
  - _Requirements: 2.5, 4.4, 4.5, 5.3, 5.4, 5.5_

- [ ] 14. Optimize performance for background session management
  - Implement efficient timer update mechanisms
  - Optimize local storage read/write operations
  - Add debouncing for frequent session updates
  - Minimize battery usage during background operation
  - Implement cleanup for old session data
  - _Requirements: 4.3, 4.4_

- [ ] 15. Add accessibility improvements for simplified UI
  - Add comprehensive ARIA labels for text-based interface
  - Implement proper focus management for modal interactions
  - Add keyboard navigation support for all nursing controls
  - Ensure screen reader compatibility with simplified interface
  - Test with high contrast mode and large text settings
  - _Requirements: 3.3, 3.4, 3.5_

- [ ] 16. Create comprehensive test suite for nursing improvements
  - Write unit tests for PersistentNursingIndicator component
  - Test session persistence and recovery functionality
  - Add integration tests for modal-to-indicator transitions
  - Test automatic time handling accuracy
  - Create tests for edit modal validation logic
  - _Requirements: All requirements_

- [ ] 17. Update nursing timer styling for clean design
  - Implement typography-focused styling for all nursing components
  - Remove decorative elements and focus on functionality
  - Create consistent text-based button styling
  - Add clean spacing and layout for simplified interface
  - Ensure responsive design works with text-only interface
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 18. Implement milestone feedback for persistent sessions
  - Add visual feedback for significant session milestones
  - Create notifications for long-running sessions
  - Implement progress indicators for active sessions
  - Add haptic feedback for important session events
  - Create audio cues for session state changes
  - _Requirements: 1.5_

- [ ] 19. Add session data migration and compatibility
  - Ensure backward compatibility with existing nursing data
  - Implement data migration for new session format
  - Add fallback handling for legacy session records
  - Test compatibility with existing nursing analytics
  - Validate data integrity during migration
  - _Requirements: 2.4, 4.2, 4.5_

- [ ] 20. Final integration and testing
  - Integrate all nursing UI improvements into main application
  - Perform end-to-end testing of complete nursing workflow
  - Test session persistence across app lifecycle events
  - Validate automatic time handling in real-world scenarios
  - Conduct user acceptance testing for simplified interface
  - _Requirements: All requirements_