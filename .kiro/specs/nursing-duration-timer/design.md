# Design Document

## Overview

The Nursing Duration Timer feature provides individual breast timers that can be independently controlled to track nursing duration for each breast. The simplified design focuses on dual-timer functionality where users can start, pause, and resume timers for left and right breasts independently, then save both durations as a single nursing session.

## Architecture

### Component Architecture
```
HomePage
├── NursingButton (enhanced)
└── NursingTimerModal (new)
    ├── DualBreastTimer (new)
    │   ├── BreastTimer (left)
    │   └── BreastTimer (right)
    ├── NotesInput (new)
    └── SaveActions (new)

HistoryList (enhanced)
└── NursingSessionDisplay (new)

BabyStore (enhanced)
├── saveNursingSession (enhanced)
└── getNursingAnalytics (enhanced)
```

### Data Flow
```
User clicks "Nursing" → Opens NursingTimerModal
User toggles breast timers → Individual timers start/pause/resume
User adds notes (optional) → Notes stored in component state
User clicks "Save" → Both durations + notes saved as single session
Modal closes → User returns to homepage
Session appears in history → NursingSessionDisplay shows durations
```

## Components and Interfaces

### 1. BreastTimer Component
**Purpose:** Individual timer for a single breast with toggle functionality

**Props:**
```typescript
interface BreastTimerProps {
  breast: 'left' | 'right'
  onDurationChange: (duration: number) => void
  disabled?: boolean
  size?: 'small' | 'medium' | 'large'
}
```

**State:**
```typescript
interface BreastTimerState {
  isActive: boolean
  isPaused: boolean
  startTime: Date | null
  pausedDuration: number // Total paused time in seconds
  currentDuration: number // Current elapsed time in seconds
}
```

**Features:**
- Large toggle button with breast icon
- Real-time duration display (MM:SS format)
- Visual state indicators (stopped/active/paused)
- Touch-friendly controls for mobile
- Automatic duration calculation and updates

### 2. DualBreastTimer Component
**Purpose:** Main component containing individual timers for each breast

**Props:**
```typescript
interface DualBreastTimerProps {
  babyId: string
  babyName: string
  onSave: (leftDuration: number, rightDuration: number, notes?: string) => void
  onCancel: () => void
}
```

**State:**
```typescript
interface DualBreastTimerState {
  leftDuration: number // Duration in seconds
  rightDuration: number // Duration in seconds
  notes: string
  isSaving: boolean
  hasStartedAnyTimer: boolean
}
```

**Features:**
- Side-by-side breast timer layout
- Coordinated timer management
- Save/Cancel action buttons
- Validation (at least one timer must have duration > 0)
- Notes input integration

### 3. NursingTimerModal Component
**Purpose:** Modal container for the dual breast timer interface

**Props:**
```typescript
interface NursingTimerModalProps {
  isOpen: boolean
  babyId: string
  babyName: string
  onClose: () => void
  onSave: (leftDuration: number, rightDuration: number, notes?: string) => void
}
```

**Features:**
- Full-screen modal on mobile, centered on desktop
- Keyboard shortcuts (Escape to close, Enter to save)
- Focus management and accessibility
- Backdrop click to close (with confirmation if timers active)
- Responsive layout for different screen sizes

### 4. NursingSessionDisplay Component
**Purpose:** Display nursing sessions in history with duration information

**Props:**
```typescript
interface NursingSessionDisplayProps {
  session: NursingSession
  onEdit?: () => void
  compact?: boolean
}
```

**Display Logic:**
```typescript
interface NursingSessionDisplayData {
  totalDuration: string // "18 minutes"
  leftDuration?: string // "8 minutes" (if > 0)
  rightDuration?: string // "10 minutes" (if > 0)
  breastUsed: 'left' | 'right' | 'both'
  breastIcon: string
  timeRange: string // "2:30 PM - 2:48 PM"
  notes?: string
}
```

## Data Models

### Enhanced Nursing Session Model
```typescript
interface NursingSession extends Feeding {
  type: 'nursing'
  left_duration: number // Duration in seconds
  right_duration: number // Duration in seconds
  total_duration: number // Computed: left + right (or max if overlapping)
  breast_used: 'left' | 'right' | 'both' // Computed based on durations
  start_time: string // Computed from save time - total_duration
  end_time: string // Save timestamp
  amount: null // Always null for nursing
}
```

### Timer State Management
```typescript
interface TimerState {
  isRunning: boolean
  startTime: Date | null
  pausedTime: number // Total paused duration in ms
  lastPauseStart: Date | null
}

interface DualTimerSession {
  leftTimer: TimerState
  rightTimer: TimerState
  notes: string
  sessionStarted: Date
}
```

### Database Schema Updates
```sql
-- Add duration columns for individual breast timing
ALTER TABLE feedings 
ADD COLUMN left_duration INTEGER DEFAULT 0,
ADD COLUMN right_duration INTEGER DEFAULT 0;

-- Update constraint to ensure nursing sessions have duration data
ALTER TABLE feedings 
ADD CONSTRAINT nursing_sessions_have_duration 
CHECK (
  (type = 'nursing' AND (left_duration > 0 OR right_duration > 0)) OR 
  (type != 'nursing')
);

-- Add computed column for total duration
ALTER TABLE feedings 
ADD COLUMN total_duration INTEGER GENERATED ALWAYS AS (
  CASE 
    WHEN type = 'nursing' THEN left_duration + right_duration
    ELSE NULL
  END
) STORED;

-- Update breast_used logic to be computed from durations
CREATE OR REPLACE FUNCTION compute_breast_used(left_dur INTEGER, right_dur INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF left_dur > 0 AND right_dur > 0 THEN
    RETURN 'both';
  ELSIF left_dur > 0 THEN
    RETURN 'left';
  ELSIF right_dur > 0 THEN
    RETURN 'right';
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

## User Interface Design

### 1. Nursing Timer Modal Layout
```
┌─────────────────────────────────────┐
│  🤱 Nursing Timer - Emma            │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────┐ ┌─────────────┐    │
│  │ Left Breast │ │Right Breast │    │
│  │     🤱      │ │     🤱      │    │
│  │   05:32     │ │   00:00     │    │
│  │  [PAUSE]    │ │  [START]    │    │
│  └─────────────┘ └─────────────┘    │
│                                     │
│  Notes: ________________________    │
│         ________________________    │
│                                     │
│         [Cancel]    [Save]          │
└─────────────────────────────────────┘
```

### 2. History Display Enhancement
```
🤱 Nursing - 18 minutes (Both)     [Edit]
Left: 8 min, Right: 10 min
2:30 PM - 2:48 PM
"Baby fed well, switched sides once"
```

### 3. Mobile Optimized Layout
```
┌─────────────────────┐
│ 🤱 Nursing - Emma   │
├─────────────────────┤
│                     │
│   ┌─────────────┐   │
│   │ Left Breast │   │
│   │     🤱      │   │
│   │   05:32     │   │
│   │  [PAUSE]    │   │
│   └─────────────┘   │
│                     │
│   ┌─────────────┐   │
│   │Right Breast │   │
│   │     🤱      │   │
│   │   00:00     │   │
│   │  [START]    │   │
│   └─────────────┘   │
│                     │
│ Notes: ____________ │
│                     │
│ [Cancel]   [Save]   │
└─────────────────────┘
```

## State Management

### Timer State Flow
```
Initial State: Both timers stopped (00:00)
↓
User taps Left timer → Left timer starts, shows elapsed time
↓
User taps Left timer again → Left timer pauses, shows paused time
↓
User taps Right timer → Right timer starts while Left is paused
↓
User taps Left timer → Left timer resumes from paused time
↓
User taps Save → Both durations saved to database
```

### Duration Calculation Logic
```typescript
function calculateDuration(timer: TimerState): number {
  if (!timer.startTime) return 0;
  
  const now = new Date();
  const elapsed = now.getTime() - timer.startTime.getTime();
  const totalPaused = timer.pausedTime;
  const currentPause = timer.lastPauseStart 
    ? now.getTime() - timer.lastPauseStart.getTime() 
    : 0;
  
  return Math.max(0, elapsed - totalPaused - currentPause);
}
```

## Error Handling

### Validation Rules
1. **Save Validation**: At least one timer must have duration > 0
2. **Duration Limits**: Warn if individual timer exceeds 60 minutes
3. **Total Session**: Alert if total session exceeds 2 hours
4. **Data Integrity**: Validate durations are positive integers

### Error Scenarios
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

function validateNursingSession(
  leftDuration: number, 
  rightDuration: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required: At least one breast must have duration
  if (leftDuration === 0 && rightDuration === 0) {
    errors.push("Please start at least one timer before saving");
  }
  
  // Warning: Individual breast duration over 60 minutes
  if (leftDuration > 3600) {
    warnings.push("Left breast duration is over 60 minutes");
  }
  if (rightDuration > 3600) {
    warnings.push("Right breast duration is over 60 minutes");
  }
  
  // Warning: Total session over 2 hours
  if ((leftDuration + rightDuration) > 7200) {
    warnings.push("Total nursing session is over 2 hours");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
```

## Performance Considerations

### Timer Optimization
- Use `requestAnimationFrame` for smooth timer updates
- Update display only when seconds change (not every frame)
- Pause timer updates when modal is not visible
- Clean up intervals on component unmount

### Memory Management
- Clear timer intervals on component destruction
- Avoid memory leaks with proper cleanup
- Minimize re-renders with proper memoization

### Battery Optimization
- Reduce update frequency when app is backgrounded
- Use efficient timer implementation
- Avoid unnecessary DOM updates

## Accessibility

### Screen Reader Support
```typescript
// Timer button ARIA labels
const getTimerAriaLabel = (breast: 'left' | 'right', state: TimerState) => {
  const breastName = breast === 'left' ? 'Left breast' : 'Right breast';
  const duration = formatDuration(state.currentDuration);
  
  if (!state.isRunning && state.currentDuration === 0) {
    return `${breastName} timer, not started. Tap to start.`;
  } else if (state.isRunning) {
    return `${breastName} timer, running for ${duration}. Tap to pause.`;
  } else {
    return `${breastName} timer, paused at ${duration}. Tap to resume.`;
  }
};
```

### Keyboard Navigation
- Tab order: Left timer → Right timer → Notes → Cancel → Save
- Space/Enter to toggle timers
- Escape to close modal (with confirmation if active)

### Visual Accessibility
- High contrast mode support
- Large touch targets (minimum 44px)
- Clear visual state indicators
- Color-blind friendly design

## Testing Strategy

### Unit Tests
- Timer state management and calculations
- Duration formatting and display
- Validation logic
- Component prop handling

### Integration Tests
- Full nursing session flow
- Modal open/close behavior
- Data persistence and retrieval
- Error handling scenarios

### User Experience Tests
- Mobile usability testing
- One-handed operation
- Timer accuracy validation
- Accessibility compliance

## Migration Strategy

### Data Migration
```sql
-- Migrate existing nursing sessions to new format
UPDATE feedings 
SET 
  left_duration = CASE 
    WHEN breast_used = 'left' THEN EXTRACT(EPOCH FROM (end_time - start_time))
    WHEN breast_used = 'both' THEN EXTRACT(EPOCH FROM (end_time - start_time)) / 2
    ELSE 0
  END,
  right_duration = CASE 
    WHEN breast_used = 'right' THEN EXTRACT(EPOCH FROM (end_time - start_time))
    WHEN breast_used = 'both' THEN EXTRACT(EPOCH FROM (end_time - start_time)) / 2
    ELSE 0
  END
WHERE type = 'nursing' AND start_time IS NOT NULL AND end_time IS NOT NULL;
```

### Rollout Plan
1. **Phase 1**: Deploy new components alongside existing ones
2. **Phase 2**: Update nursing button to use new modal
3. **Phase 3**: Migrate existing data and update displays
4. **Phase 4**: Remove old nursing timer components
5. **Phase 5**: Monitor and optimize ba