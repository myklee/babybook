# BabySettingsModal - Schedule Integration Manual Test Guide

## Overview

This document provides manual testing instructions for the schedule management integration into the BabySettingsModal component.

## Test Setup

1. Start the development server: `npm run dev`
2. Navigate to the application
3. Select a baby or create a new one
4. Open the baby settings modal (usually via a settings icon or menu)

## Test Cases

### TC1: Tab Navigation - Default State

**Steps:**

1. Open the BabySettingsModal
2. Observe the initial state

**Expected Results:**

- Modal displays with title "{Baby Name} Settings"
- Two tabs are visible: "Feeding Settings" and "Schedules"
- "Feeding Settings" tab is active by default
- Settings form is displayed with feeding interval, breast amount, formula amount, and solids checkbox
- ScheduleManager component is not visible

### TC2: Switch to Schedules Tab

**Steps:**

1. Open the BabySettingsModal
2. Click on the "Schedules" tab

**Expected Results:**

- "Schedules" tab becomes active (highlighted)
- Settings form disappears
- ScheduleManager component is displayed
- ScheduleManager shows the baby's name in its header
- Close button appears at the bottom of the modal

### TC3: Switch Back to Settings Tab

**Steps:**

1. Open the BabySettingsModal
2. Click on the "Schedules" tab
3. Click on the "Feeding Settings" tab

**Expected Results:**

- "Feeding Settings" tab becomes active
- ScheduleManager component disappears
- Settings form reappears with all previous values intact
- Close button at bottom disappears (form has its own Save/Cancel buttons)

### TC4: Schedule Management Functionality

**Steps:**

1. Open the BabySettingsModal
2. Click on the "Schedules" tab
3. Test schedule creation, editing, and deletion

**Expected Results:**

- All ScheduleManager functionality works correctly
- Can create new schedules
- Can edit existing schedules
- Can delete schedules
- Can toggle schedule active/inactive status
- All actions are properly scoped to the current baby

### TC5: Modal Closing from Schedules Tab

**Steps:**

1. Open the BabySettingsModal
2. Click on the "Schedules" tab
3. Click the "Close" button at the bottom

**Expected Results:**

- Modal closes completely
- No errors in console

### TC6: Modal Closing from Settings Tab

**Steps:**

1. Open the BabySettingsModal (Settings tab is default)
2. Click the "Cancel" button

**Expected Results:**

- Modal closes completely
- No changes are saved

### TC7: Overlay Click Behavior

**Steps:**

1. Open the BabySettingsModal
2. Click on the dark overlay outside the modal

**Expected Results:**

- Modal closes
- Works from both Settings and Schedules tabs

### TC8: Modal Width and Layout

**Steps:**

1. Open the BabySettingsModal
2. Switch between tabs
3. Observe the modal size

**Expected Results:**

- Modal is wider than standard modals (max-width: 900px)
- Modal adapts to content size
- On mobile devices, modal takes full width
- Content is properly scrollable if it exceeds viewport height

### TC9: Tab Animation

**Steps:**

1. Open the BabySettingsModal
2. Switch between tabs multiple times

**Expected Results:**

- Smooth fade-in animation when switching tabs
- No flickering or layout shifts
- Animation respects prefers-reduced-motion setting

### TC10: Mobile Responsiveness

**Steps:**

1. Open the BabySettingsModal on a mobile device or narrow viewport
2. Test tab navigation
3. Test schedule management

**Expected Results:**

- Tabs are properly sized for mobile
- Tab buttons are touch-friendly
- ScheduleManager is fully functional on mobile
- Close button is sticky at bottom on mobile
- No horizontal scrolling

### TC11: Props Passing to ScheduleManager

**Steps:**

1. Open the BabySettingsModal for a specific baby
2. Switch to Schedules tab
3. Create or view schedules

**Expected Results:**

- ScheduleManager displays correct baby name
- Schedules are filtered to the correct baby
- All schedule operations affect only the current baby

### TC12: Keyboard Navigation

**Steps:**

1. Open the BabySettingsModal
2. Use Tab key to navigate
3. Use Enter/Space to activate tabs

**Expected Results:**

- Can navigate between tabs using keyboard
- Tab buttons have visible focus indicators
- All interactive elements are keyboard accessible

## Integration Points to Verify

### Component Integration

- ✓ ScheduleManager component is properly imported
- ✓ Props (babyId, babyName) are correctly passed
- ✓ Component renders without errors

### State Management

- ✓ Tab state is maintained correctly
- ✓ Settings form state is preserved when switching tabs
- ✓ No state conflicts between tabs

### Styling

- ✓ Tab navigation styling is consistent with design system
- ✓ Modal width accommodates ScheduleManager content
- ✓ Responsive styles work on all screen sizes
- ✓ Theme variables are properly applied

### Accessibility

- ✓ Tab buttons have proper ARIA attributes
- ✓ Active tab is clearly indicated
- ✓ Keyboard navigation works correctly
- ✓ Screen reader announcements are appropriate

## Known Limitations

- None identified at this time

## Browser Compatibility

Test in the following browsers:

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

## Notes

- The integration maintains backward compatibility with existing settings functionality
- Schedule management is now accessible from the baby settings modal
- Users can easily switch between configuring settings and managing schedules
