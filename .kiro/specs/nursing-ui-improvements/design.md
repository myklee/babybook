# Design Document

## Overview

The Nursing UI Improvements feature enhances the nursing timer interface by implementing persistent session visibility, automatic time handling, simplified UI design, modal persistence, and dedicated editing workflows. This design focuses on improving user experience through better session management and cleaner interface design.

## Architecture

### Component Architecture
```
Enhanced Components:
├── HomePage (enhanced with persistent nursing indicator)
├── NursingTimerModal (simplified UI, persistence handling)
├── DualBreastTimer (automatic time handling, simplified controls)
├── BreastTimer (text-based labels, no icons)
└── NursingSessionDisplay (enhanced for active session display)

New Components:
├── PersistentNursingIndicator (shows active session on main page)
├── NursingEditModal (dedicated editing interface)
└── NursingSessionPersistence (background session management)

Store Enhancements:
├── Active Session Tracking
├── Session Persistence Layer
├── Automatic Time Management
└── Session Recovery System
```

### Data Flow Architecture
```
User Action → Session State → Persistence → UI Update
     ↓              ↓           ↓          ↓
Timer Events → Background → Local Storage → Visual Feedback
     ↓              ↓           ↓          ↓
Modal Close → Session Continue → Recovery → Indicator Display
```

## Components and Interfaces

### 1. PersistentNursingIndicator Component
**Purpose:** Display active nursing session progress on the main interface

**Props:**
```typescript
interface PersistentNursingIndicatorProps {
  babyId: string
  babyName: string
  activeSession: ActiveNursingSession | null
  onTap: () => void
}

interface ActiveNursingSession {
  id: string
  baby_id: string
  start_time: string
  current_breast: 'left' | 'right' | 'both'
  left_duration: number
  right_duration: number
  total_duration: number
  notes: string
  is_active: boolean
}
```

**Display Elements:**
- Floating indicator showing elapsed time
- Current breast being used
- Tap to reopen modal functionality
- Visual progress indication

### 2. Enhanced NursingTimerModal Component
**Purpose:** Simplified modal interface with persistence

**Key Changes:**
- Remove close button during active sessions
- Simplified text-based interface
- Automatic session persistence
- Background session continuation

**State Management:**
```typescript
interface NursingModalState {
  isActive: boolean
  canClose: boolean
  sessionData: ActiveNursingSession
  persistenceEnabled: boolean
}
```

### 3. Simplified DualBreastTimer Component
**Purpose:** Clean interface without icons and emojis

**UI Simplifications:**
- Replace nursing icon (🤱) with text label "Nursing Timer"
- Remove breast icons, use "Left Breast" and "Right Breast" text
- Clean typography-focused design
- Simplified button states with text labels

**Automatic Time Handling:**
```typescript
interface AutoTimeHandling {
  autoStartTime: boolean
  autoCalculateDuration: boolean
  autoSaveOnEnd: boolean
  requiresManualTimeEntry: false
}
```

### 4. NursingEditModal Component
**Purpose:** Dedicated interface for editing completed nursing sessions

**Props:**
```typescript
interface NursingEditModalProps {
  isOpen: boolean
  session: CompletedNursingSession
  onSave: (updatedSession: CompletedNursingSession) => void
  onCancel: () => void
}

interface CompletedNursingSession {
  id: string
  baby_id: string
  start_time: string
  end_time: string
  left_duration: number
  right_duration: number
  total_duration: number
  breast_used: 'left' | 'right' | 'both'
  notes: string
}
```

**Edit Controls:**
- Start time picker
- End time picker
- Duration display (calculated automatically)
- Breast selection radio buttons
- Notes text area
- Validation and error handling

### 5. Session Persistence System
**Purpose:** Maintain session state across app interactions

**Persistence Features:**
- Local storage backup
- Session recovery on app restart
- Background timer continuation
- Cross-tab synchronization

**Storage Schema:**
```typescript
interface PersistedNursingSession {
  id: string
  baby_id: string
  start_time: string
  current_breast: 'left' | 'right' | 'both'
  left_duration: number
  right_duration: number
  notes: string
  last_update: string
  device_id: string
  is_active: boolean
}
```

## User Interface Design

### 1. Persistent Nursing Indicator (Main Page)
```
┌─────────────────────────────────────┐
│  👶 Emma                            │
│                                     │
│  ┌─────────────────────────────────┐ │
│  │ 🟢 Nursing in Progress         │ │
│  │ Left Breast • 15:32            │ │
│  │ Tap to view details            │ │
│  └─────────────────────────────────┘ │
│                                     │
│  [Sleep] [Breast] [Formula] [Solid] │
└─────────────────────────────────────┘
```

### 2. Simplified Nursing Timer Modal
```
┌─────────────────────────────────────┐
│  Nursing Timer - Emma               │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────┐   ┌─────────────┐  │
│  │ Left Breast │   │Right Breast │  │
│  │   05:30     │   │   00:00     │  │
│  │   [Pause]   │   │   [Start]   │  │
│  └─────────────┘   └─────────────┘  │
│                                     │
│  Total Duration: 05:30              │
│                                     │
│  Notes: ________________________    │
│                                     │
│  [End Session]                      │
└─────────────────────────────────────┘
```

### 3. Nursing Edit Modal
```
┌─────────────────────────────────────┐
│  Edit Nursing Session               │
├─────────────────────────────────────┤
│  Start Time: [2:30 PM] [Today ▼]    │
│  End Time:   [2:48 PM] [Today ▼]    │
│  Duration:   18 minutes (calculated) │
│                                     │
│  Breast Used:                       │
│  ○ Left  ● Right  ○ Both           │
│                                     │
│  Notes: ________________________    │
│         ________________________    │
│                                     │
│  [Cancel]              [Save]       │
└─────────────────────────────────────┘
```

## Data Models

### Enhanced Nursing Session Models
```typescript
interface NursingSession {
  id: string
  baby_id: string
  start_time: string
  end_time: string | null
  left_duration: number
  right_duration: number
  total_duration: number
  breast_used: 'left' | 'right' | 'both'
  notes: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface NursingSessionEdit {
  session_id: string
  field_changed: string
  old_value: any
  new_value: any
  edited_at: string
  edited_by: string
}
```

### Session Persistence Models
```typescript
interface SessionPersistenceState {
  active_sessions: Map<string, PersistedNursingSession>
  recovery_data: SessionRecoveryData[]
  last_sync: string
  device_id: string
}

interface SessionRecoveryData {
  session_id: string
  recovery_method: 'local_storage' | 'background_timer' | 'user_input'
  data_integrity: 'complete' | 'partial' | 'corrupted'
  recovered_at: string
}
```

## Implementation Strategy

### 1. Persistent Session Indicator
**Location:** HomePage.vue
**Implementation:**
- Add computed property for active nursing sessions
- Create floating indicator component
- Implement tap-to-reopen functionality
- Add visual progress animations

**Code Structure:**
```typescript
// In HomePage.vue
const activeNursingSession = computed(() => {
  return store.getActiveNursingSession(selectedBaby.value?.id)
})

const showNursingIndicator = computed(() => {
  return activeNursingSession.value && !showNursingTimerModal.value
})
```

### 2. Automatic Time Handling
**Location:** DualBreastTimer.vue, BreastTimer.vue
**Implementation:**
- Remove manual time entry requirements
- Auto-capture start time on timer start
- Auto-calculate duration on timer stop
- Simplify save process to only require breast selection and notes

**Code Changes:**
```typescript
// Remove time input fields
// Auto-start timing
function startTimer() {
  const startTime = new Date().toISOString()
  backgroundTimer.start()
  // No manual time entry required
}

// Auto-save with calculated duration
function saveSession() {
  const session = {
    start_time: backgroundTimer.startTime,
    end_time: new Date().toISOString(),
    left_duration: leftTimer.duration,
    right_duration: rightTimer.duration,
    notes: notes.value
  }
  // Save automatically without time confirmation
}
```

### 3. UI Simplification
**Location:** All nursing components
**Implementation:**
- Replace all icons with text labels
- Remove emoji usage
- Implement clean typography
- Use descriptive button text

**Style Changes:**
```css
/* Remove icon-based styling */
.nursing-icon {
  display: none;
}

/* Text-based labels */
.timer-label {
  font-weight: 600;
  font-size: 1rem;
  color: #374151;
}

/* Clean button styling */
.timer-button {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
}
```

### 4. Modal Persistence
**Location:** NursingTimerModal.vue
**Implementation:**
- Prevent modal close during active sessions
- Implement background session continuation
- Add session recovery on modal reopen
- Handle app backgrounding gracefully

**Persistence Logic:**
```typescript
// Prevent close during active session
const canCloseModal = computed(() => {
  return !hasActiveSession.value || userConfirmedClose.value
})

// Background session continuation
function handleModalClose() {
  if (hasActiveSession.value) {
    // Continue session in background
    persistSession()
    // Show persistent indicator
    showPersistentIndicator.value = true
  }
}
```

### 5. Dedicated Edit Modal
**Location:** New NursingEditModal.vue component
**Implementation:**
- Create separate modal for editing
- Implement time picker controls
- Add validation for logical time ranges
- Handle session update logic

**Component Structure:**
```vue
<template>
  <div class="nursing-edit-modal">
    <div class="edit-form">
      <TimePicker v-model="editSession.start_time" label="Start Time" />
      <TimePicker v-model="editSession.end_time" label="End Time" />
      <BreastSelector v-model="editSession.breast_used" />
      <textarea v-model="editSession.notes" placeholder="Notes" />
    </div>
    <div class="edit-actions">
      <button @click="handleCancel">Cancel</button>
      <button @click="handleSave" :disabled="!isValid">Save</button>
    </div>
  </div>
</template>
```

## Error Handling and Validation

### 1. Session Persistence Errors
- Handle local storage failures
- Implement fallback persistence methods
- Provide user feedback for recovery issues
- Maintain data integrity during failures

### 2. Time Validation
- Ensure end time is after start time
- Validate reasonable session durations
- Handle timezone changes
- Prevent future timestamps

### 3. Modal State Errors
- Handle modal close conflicts
- Recover from corrupted session state
- Provide clear error messages
- Implement graceful degradation

## Performance Considerations

### 1. Background Timer Efficiency
- Optimize timer update frequency
- Minimize battery usage during background operation
- Implement efficient persistence writes
- Use requestAnimationFrame for UI updates

### 2. Session Storage Optimization
- Compress session data for storage
- Implement efficient serialization
- Use incremental updates
- Clean up old session data

### 3. UI Responsiveness
- Debounce user interactions
- Optimize re-render cycles
- Use virtual scrolling for history
- Implement lazy loading for components

## Accessibility Improvements

### 1. Screen Reader Support
- Add comprehensive ARIA labels
- Implement proper focus management
- Provide audio feedback for timer states
- Support keyboard navigation

### 2. Visual Accessibility
- Ensure sufficient color contrast
- Support high contrast mode
- Implement scalable text
- Provide visual state indicators

### 3. Motor Accessibility
- Large touch targets (minimum 44px)
- Support for alternative input methods
- Reduce required precision
- Implement voice control compatibility

## Testing Strategy

### 1. Session Persistence Testing
- Test app backgrounding scenarios
- Verify session recovery accuracy
- Test cross-device synchronization
- Validate data integrity

### 2. UI Simplification Testing
- Verify text-only interface clarity
- Test accessibility compliance
- Validate user comprehension
- Test with various screen sizes

### 3. Edit Modal Testing
- Test time validation logic
- Verify data update accuracy
- Test error handling scenarios
- Validate user workflow

### 4. Integration Testing
- Test modal-to-indicator transitions
- Verify persistent state management
- Test background timer accuracy
- Validate cross-component communication

## Migration Strategy

### 1. Gradual UI Simplification
- Phase out icons progressively
- Maintain backward compatibility
- Gather user feedback
- Implement feature flags

### 2. Session Persistence Rollout
- Start with local persistence
- Add background continuation
- Implement cross-device sync
- Monitor performance impact

### 3. Edit Modal Introduction
- Create alongside existing edit
- Migrate users gradually
- Deprecate old edit interface
- Provide migration assistance

## Security Considerations

### 1. Session Data Protection
- Encrypt sensitive session data
- Secure local storage access
- Implement data validation
- Prevent session hijacking

### 2. Edit Validation
- Validate all user inputs
- Prevent malicious data injection
- Implement proper sanitization
- Audit edit operations

### 3. Persistence Security
- Secure background operations
- Validate recovered data
- Implement access controls
- Monitor for tampering