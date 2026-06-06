# QuickScheduleWidget Manual Testing Guide

## Prerequisites

- Have at least one baby in the system
- Have at least one active feeding schedule created for the baby

## Test Cases

### 1. Widget Visibility

**Steps:**

1. Navigate to the HomePage
2. Select a baby that has active schedules

**Expected Result:**

- The QuickScheduleWidget should appear between the "View full history" link and the action grid
- The widget should display "Quick Schedules" as the title
- All active schedules for the selected baby should be displayed as buttons

### 2. Widget Hidden When No Active Schedules

**Steps:**

1. Navigate to the HomePage
2. Select a baby that has no active schedules

**Expected Result:**

- The QuickScheduleWidget should not be visible
- No empty widget or placeholder should be shown

### 3. Schedule Button Display

**Steps:**

1. View the QuickScheduleWidget with active schedules

**Expected Result:**

- Each schedule button should display:
  - The schedule name
  - An icon representing the feeding type (breast/formula/solid)
  - For formula schedules: the default amount (e.g., "120ml")
- Buttons should have appropriate colors:
  - Breast: Light color (var(--color-feeding-breast))
  - Formula: Light color (var(--color-feeding-formula))
  - Solid: Dark color (var(--color-feeding-solid))

### 4. Trigger Schedule - Success

**Steps:**

1. Click on a schedule button in the QuickScheduleWidget

**Expected Result:**

- Button should show a loading state (spinner overlay)
- Button should be disabled during the operation
- After completion, a success notification should appear:
  - Title: "Feeding logged!"
  - Message: "[Schedule Name] feeding entry created for [Baby Name]"
- The feeding entry should appear in the history list below
- The button should return to its normal state

### 5. Trigger Schedule - Loading State

**Steps:**

1. Click on a schedule button
2. Observe the button during the API call

**Expected Result:**

- Button should have the "is-loading" class
- A semi-transparent overlay should appear over the button
- A spinner should be visible in the center of the button
- The schedule icon should spin
- The button should be disabled (not clickable)

### 6. Prevent Multiple Simultaneous Triggers

**Steps:**

1. Click on a schedule button
2. Quickly click the same button again before the first request completes

**Expected Result:**

- Only one API call should be made
- The second click should be ignored
- Only one feeding entry should be created

### 7. Trigger Schedule - Error Handling

**Steps:**

1. Disconnect from the internet or simulate a network error
2. Click on a schedule button

**Expected Result:**

- An error notification should appear:
  - Title: "Failed to log feeding"
  - Message: Error details or "An unexpected error occurred"
- No feeding entry should be created
- The button should return to its normal state

### 8. Multiple Schedules Display

**Steps:**

1. Create multiple active schedules for a baby (breast, formula, solid)
2. View the QuickScheduleWidget

**Expected Result:**

- All active schedules should be displayed
- Buttons should wrap to multiple rows on smaller screens
- Each button should maintain its minimum width (140px on mobile, 160px on desktop)
- Buttons should have consistent spacing (gap: 0.5rem on mobile, 0.75rem on desktop)

### 9. Responsive Design - Mobile

**Steps:**

1. View the HomePage on a mobile device or resize browser to mobile width (<480px)

**Expected Result:**

- Widget should adapt to smaller screen
- Buttons should be smaller (min-width: 120px)
- Icons should be 20px
- Font sizes should be reduced
- Widget padding should be 0.75rem
- Buttons should wrap appropriately

### 10. Responsive Design - Desktop

**Steps:**

1. View the HomePage on a desktop browser (>768px)

**Expected Result:**

- Widget should have max-width of 600px
- Buttons should be larger (min-width: 160px)
- Icons should be 24px
- Larger gaps between buttons (0.75rem)
- Widget padding should be 1rem

### 11. Accessibility

**Steps:**

1. Use keyboard navigation to interact with the widget
2. Use a screen reader to test the widget

**Expected Result:**

- All buttons should be keyboard accessible (Tab to navigate, Enter to trigger)
- Each button should have an appropriate aria-label: "Trigger [Schedule Name] schedule"
- Screen reader should announce the button purpose clearly
- Loading state should be communicated to screen readers

### 12. Visual Feedback on Hover

**Steps:**

1. Hover over a schedule button (on desktop)

**Expected Result:**

- Button should lift slightly (translateY(-2px))
- Button should show a subtle shadow
- Transition should be smooth (0.2s ease)

### 13. Integration with Baby Store

**Steps:**

1. Trigger a schedule
2. Check the baby store state

**Expected Result:**

- The feeding entry should be added to the store's feedings array
- The schedule's usage_count should be incremented
- The schedule's last_used_at should be updated
- The changes should persist in the database

### 14. Switch Between Babies

**Steps:**

1. View schedules for Baby A
2. Switch to Baby B (who has different schedules)

**Expected Result:**

- The widget should update to show Baby B's schedules
- No schedules from Baby A should be visible
- The widget should hide if Baby B has no active schedules

### 15. Create Entry and Modify

**Steps:**

1. Trigger a schedule to create a feeding entry
2. Click on the newly created entry in the history list
3. Modify the entry (change time, amount, or notes)

**Expected Result:**

- The entry should be editable immediately after creation (Requirement 3.4)
- Changes should be saved successfully
- The modified entry should reflect the updates

## Notes

- All tests should be performed with the NotificationContainer component visible to see notifications
- Test with different feeding types (breast, formula, solid) to ensure all work correctly
- Test with schedules that have and don't have default amounts
- Verify that the widget integrates seamlessly with the existing HomePage layout
