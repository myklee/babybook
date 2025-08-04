# Pumping Timer Implementation Plan

- [x] 1. Set up database schema and types
  - Create database migration for pumping_sessions table
  - Add PumpingSession TypeScript interface to types file
  - Add database table definition to supabase types
  - _Requirements: 1.4, 4.1_

- [x] 2. Implement store methods for pumping sessions
  - Add pumping sessions reactive state to baby store
  - Implement addPumpingSession method with validation
  - Implement getBabyPumpingSessions method for data retrieval
  - Implement updatePumpingSession method for editing
  - Implement deletePumpingSession method with proper cleanup
  - Add pumping sessions to store initialization and data loading
  - _Requirements: 1.4, 4.1, 6.2, 6.3_

- [x] 3. Create PumpingTimerModal component
  - Create new PumpingTimerModal.vue component file
  - Integrate DualBreastTimer component for timing functionality
  - Add amount input fields for left and right breast (ml)
  - Implement form validation for duration and amount inputs
  - Add More Options collapsible section with notes field
  - Implement save functionality that calls store addPumpingSession method
  - Add proper modal styling consistent with other modals
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

- [x] 4. Add pump action button to UI
  - Add "Pump" button to HomePage action grid with pump icon
  - Add "Pump" button to BabyHistoryPage action buttons
  - Implement click handlers to open PumpingTimerModal
  - Add proper button styling and hover effects
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5. Integrate pumping sessions into timeline display
  - Update Timeline component to accept pumpingEvents prop
  - Add pumping session markers with distinct styling (purple color, pump icon)
  - Implement click handlers for pumping session details display
  - Add pumping session tooltip with duration and amount information
  - Update BabyHistoryPage to pass pumping events to Timeline component
  - _Requirements: 4.2, 4.3_

- [x] 6. Add pumping sessions to history views
  - Update HistoryList component to display recent pumping sessions
  - Add pumping sessions section with duration and amount display
  - Update BabyHistoryPage combined history to include pumping events
  - Ensure pumping sessions appear chronologically with other events
  - Add proper icons and styling for pumping session display
  - _Requirements: 4.2, 4.4_

- [x] 7. Create PumpingEditModal component
  - Create new PumpingEditModal.vue component file
  - Pre-populate form fields with existing pumping session data
  - Allow editing of duration, amounts, and notes
  - Implement save functionality using updatePumpingSession store method
  - Add delete functionality with confirmation dialog
  - Add proper error handling and loading states
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 8. Implement pumping session editing functionality
  - Add click handlers to pumping sessions in HistoryList for editing
  - Add click handlers to pumping sessions in timeline for editing
  - Integrate PumpingEditModal into HomePage and BabyHistoryPage
  - Ensure proper modal state management and cleanup
  - Test edit and delete functionality across all views
  - _Requirements: 6.1, 6.4_

- [x] 12. Polish UI and accessibility
  - Add proper ARIA labels and screen reader support
  - Ensure keyboard navigation works for all modal interactions
  - Verify color contrast and visual accessibility
  - Test responsive design on mobile and desktop
  - Add proper focus management for modal interactions
  - Implement consistent styling with existing app design
  - _Requirements: 5.4_