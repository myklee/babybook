# Implementation Plan

- [x] 1. Enhanced nursing session data model
  - Update TypeScript interfaces for dual-timer nursing sessions
  - Add left_duration and right_duration fields to nursing session types
  - Create BreastTimerState interface for individual timer management
  - Update nursing session validation to handle dual durations
  - _Requirements: 1.1, 3.1, 3.2_

- [x] 2. Enhanced baby store nursing methods
  - Update saveNursingSession method to accept left and right durations
  - Implement logic to determine breast_used based on timer durations
  - Add validation for dual-timer nursing session data
  - Update nursing analytics to handle individual breast durations
  - _Requirements: 3.1, 3.2, 3.3, 5.1_

- [x] 3. BreastTimer component
  - Create individual breast timer component with toggle functionality
  - Implement start/pause/resume state management
  - Add real-time duration display with proper formatting
  - Include visual state indicators (active, paused, stopped)
  - Add large touch-friendly controls for mobile use
  - _Requirements: 1.1, 1.2, 1.3, 2.1_

- [x] 4. DualBreastTimer component
  - Create main component containing left and right BreastTimer components
  - Implement coordination between individual breast timers
  - Add notes input functionality
  - Include save and cancel actions
  - Handle timer state synchronization and validation
  - _Requirements: 1.1, 1.2, 1.4, 3.3_

- [x] 5. NursingTimerModal component
  - Create modal container for dual breast timer interface
  - Implement full-screen modal layout for mobile
  - Add keyboard shortcuts support (spacebar to toggle, escape to cancel)
  - Include proper modal accessibility features
  - Handle modal backdrop and focus management
  - _Requirements: 1.1, 1.2, 2.2_

- [x] 6. Update HomePage nursing integration
  - Replace existing nursing button with new dual-timer modal trigger
  - Remove complex ActiveNursingSession widget (simplified approach)
  - Update nursing button to open DualBreastTimer modal
  - Handle modal open/close state management
  - _Requirements: 1.1, 1.5_

- [x] 7. Enhanced history display for nursing
  - Update HistoryList to show dual breast durations for nursing sessions
  - Display individual left and right durations when both were used
  - Show single breast duration when only one was used
  - Add breast usage indicators and visual enhancements
  - Update nursing session display formatting
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 8. NursingSessionDisplay component
  - Create dedicated component for displaying nursing sessions in history
  - Show total duration and individual breast durations
  - Include breast usage indicators and session notes
  - Add edit functionality for nursing sessions
  - Implement proper accessibility labels
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 9. Background timer management
  - Implement timer continuation when app is backgrounded
  - Add proper timer cleanup and memory management
  - Handle app state transitions gracefully
  - Ensure timer accuracy across app lifecycle events
  - Add timer persistence for app crashes/restarts
  - _Requirements: 1.5, 2.2_

- [x] 10. Basic nursing analytics
  - Create simple nursing analytics calculations
  - Implement total nursing time and average session duration
  - Add left vs right breast usage balance calculations
  - Create daily and weekly nursing summaries
  - Include nursing data in existing analytics displays
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 11. Mobile optimization
  - Optimize dual timer layout for mobile screens
  - Ensure large touch targets for all timer controls
  - Test one-handed operation capabilities
  - Add haptic feedback for timer actions
  - Optimize for various screen sizes and orientations
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 12. Error handling and validation
  - Add comprehensive validation for dual-timer data
  - Implement user-friendly error messages
  - Handle edge cases (both timers at zero, invalid durations)
  - Add recovery mechanisms for interrupted sessions
  - Implement data integrity checks
  - _Requirements: 1.4, 3.3, 3.4_

- [x] 13. Testing and quality assurance
  - Write unit tests for all new nursing timer components
  - Add integration tests for dual-timer flow
  - Test timer accuracy and performance
  - Validate nursing session saving and display
  - Test mobile responsiveness and accessibility
  - _Requirements: All requirements_

- [x] 14. Performance optimization
  - Optimize timer rendering and update performance
  - Minimize battery usage during active timers
  - Implement efficient component re-rendering
  - Add proper cleanup for timer intervals
  - Optimize modal performance and animations
  - _Requirements: 1.2, 2.1, 2.2_

- [x] 15. Final integration and polish
  - Remove old nursing timer components and code
  - Clean up unused imports and dependencies
  - Add smooth animations and transitions
  - Implement final UI polish and consistency
  - Perform comprehensive end-to-end testing
  - _Requirements: All requirements_