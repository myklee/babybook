# Pumping Timer Design Document

## Overview

The pumping timer feature adds breast milk pumping session tracking to the baby tracking app. This feature allows parents to time their pumping sessions, record the amount of milk pumped from each breast, and maintain a separate history of pumping activities. The design leverages existing timer components while introducing new data structures and UI components specific to pumping.

## Architecture

### Data Layer
- **New Database Table**: `pumping_sessions` table to store pumping data separately from feeding data
- **Store Integration**: New pumping-related methods in the existing baby store
- **Type Definitions**: New TypeScript interfaces for pumping session data

### Component Layer
- **PumpingTimerModal**: Main modal component with dual breast timers and amount inputs
- **PumpingEditModal**: Modal for editing existing pumping sessions
- **Timeline Integration**: Updates to Timeline component to display pumping markers
- **History Integration**: Updates to history components to show pumping sessions

### UI Integration
- **Action Button**: New "Pump" button in the main action grid
- **History Display**: Pumping sessions appear in timeline and history views
- **Separate Data Views**: Pumping data displayed distinctly from feeding data

## Components and Interfaces

### PumpingTimerModal Component

**Purpose**: Primary interface for recording new pumping sessions with timing and amount tracking.

**Key Features**:
- Dual breast timer controls (reusing DualBreastTimer component)
- Amount input fields for each breast (ml)
- More Options section with notes field
- Save/Cancel actions

**Props**:
```typescript
interface Props {
  isOpen: boolean
  babyId: string
  babyName: string
}
```

**Emits**:
```typescript
interface Emits {
  (e: 'close'): void
  (e: 'save', session: PumpingSession): void
}
```

### PumpingEditModal Component

**Purpose**: Interface for editing existing pumping sessions.

**Key Features**:
- Pre-populated form fields with existing session data
- Editable duration, amounts, and notes
- Delete functionality with confirmation
- Save changes/Cancel actions

**Props**:
```typescript
interface Props {
  isOpen: boolean
  session: PumpingSession
  babyName: string
}
```

### Timeline Component Updates

**New Features**:
- Support for pumping session markers
- Distinct visual styling for pumping events (different color/icon)
- Click handlers for pumping session details

**New Props**:
```typescript
interface Props {
  // ... existing props
  pumpingEvents?: PumpingEvent[]
}
```

## Data Models

### PumpingSession Interface

```typescript
interface PumpingSession {
  id: string
  baby_id: string
  user_id: string
  start_time: string // ISO timestamp
  end_time: string // ISO timestamp
  left_duration: number // seconds
  right_duration: number // seconds
  total_duration: number // seconds
  left_amount: number | null // ml pumped from left breast
  right_amount: number | null // ml pumped from right breast
  total_amount: number // ml total amount pumped
  notes: string | null
  created_at: string
  updated_at: string
}
```

### Database Schema

**Table**: `pumping_sessions`

```sql
CREATE TABLE pumping_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  left_duration INTEGER NOT NULL DEFAULT 0, -- seconds
  right_duration INTEGER NOT NULL DEFAULT 0, -- seconds
  total_duration INTEGER NOT NULL DEFAULT 0, -- seconds
  left_amount INTEGER, -- ml
  right_amount INTEGER, -- ml
  total_amount INTEGER NOT NULL DEFAULT 0, -- ml
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Store Methods

**New Methods to Add**:

```typescript
// Create new pumping session
async function addPumpingSession(
  babyId: string,
  leftDuration: number,
  rightDuration: number,
  leftAmount: number | null,
  rightAmount: number | null,
  notes?: string,
  startTime?: Date
): Promise<PumpingSession>

// Get pumping sessions for a baby
function getBabyPumpingSessions(babyId: string): PumpingSession[]

// Update existing pumping session
async function updatePumpingSession(
  id: string,
  updates: Partial<PumpingSession>
): Promise<PumpingSession>

// Delete pumping session
async function deletePumpingSession(id: string): Promise<void>

// Get pumping sessions for timeline date
function getPumpingSessionsForDate(babyId: string, date: Date): PumpingEvent[]
```

## Error Handling

### Validation Rules
- **Duration Validation**: At least one breast must have duration > 0
- **Amount Validation**: Amounts must be non-negative numbers if provided
- **Time Validation**: End time must be after start time
- **Required Fields**: baby_id, user_id, start_time, end_time are required

### Error Scenarios
- **Network Errors**: Display user-friendly messages for save/load failures
- **Validation Errors**: Show inline validation messages for invalid inputs
- **Concurrent Edits**: Handle cases where session is modified by another device
- **Data Corruption**: Graceful handling of malformed session data

## Testing Strategy

### Unit Tests
- **Timer Logic**: Test dual breast timer functionality
- **Amount Calculations**: Test total amount calculations
- **Data Validation**: Test input validation rules
- **Store Methods**: Test CRUD operations for pumping sessions

### Integration Tests
- **Modal Interactions**: Test complete pumping session creation flow
- **Timeline Integration**: Test pumping events display in timeline
- **History Integration**: Test pumping sessions in history views
- **Edit/Delete Flow**: Test session modification workflows

### User Acceptance Tests
- **Complete Pumping Session**: User can create, time, and save a pumping session
- **Edit Session**: User can modify existing pumping session details
- **View History**: User can view pumping sessions in timeline and history
- **Data Persistence**: Pumping sessions persist across app restarts

## UI/UX Considerations

### Visual Design
- **Pump Button**: Distinct icon and color for pumping action (breast pump icon)
- **Timeline Markers**: Different color/shape for pumping events (purple/pump icon)
- **Amount Display**: Clear visual distinction between duration and amount data
- **Responsive Design**: Modal works well on mobile and desktop

### User Experience
- **Quick Access**: Pump button prominently placed in action grid
- **Intuitive Timing**: Timer controls work similarly to nursing timer
- **Clear Data Entry**: Amount inputs are clearly labeled and validated
- **Consistent Patterns**: Follows existing modal and form patterns

### Accessibility
- **Screen Reader Support**: Proper ARIA labels for timer controls and amount inputs
- **Keyboard Navigation**: Full keyboard accessibility for all modal interactions
- **Color Contrast**: Sufficient contrast for all text and interactive elements
- **Focus Management**: Proper focus handling when modal opens/closes

## Performance Considerations

### Data Loading
- **Lazy Loading**: Pumping sessions loaded on-demand
- **Caching**: Recent pumping sessions cached in store
- **Pagination**: Large pumping history paginated for performance

### Real-time Updates
- **Timer Performance**: Efficient timer updates without excessive re-renders
- **State Management**: Optimized state updates for duration tracking
- **Memory Usage**: Proper cleanup of timer intervals and event listeners

## Security Considerations

### Data Protection
- **User Isolation**: Pumping sessions only accessible to owning user
- **Baby Association**: Sessions properly associated with correct baby
- **Input Sanitization**: All user inputs properly sanitized before storage

### Privacy
- **Data Encryption**: Sensitive pumping data encrypted at rest
- **Access Control**: Proper authentication required for all operations
- **Audit Trail**: Track creation and modification of pumping sessions