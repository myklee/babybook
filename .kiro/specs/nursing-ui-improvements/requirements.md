# Requirements Document

## Introduction

The Nursing UI Improvements feature focuses on enhancing the user experience of the nursing timer interface by improving session visibility, simplifying the modal design, ensuring persistence, and creating dedicated editing workflows. These improvements aim to make nursing tracking more intuitive and reliable for parents.

## Requirements

### Requirement 1

**User Story:** As a nursing parent, I want to see nursing session progress even when the modal is closed, so that I can monitor the active session without keeping the modal open.

#### Acceptance Criteria

1. WHEN a nursing session is active THEN the system SHALL display a persistent indicator on the main interface showing session progress
2. WHEN the nursing modal is closed during an active session THEN the session SHALL continue running and remain visible
3. WHEN viewing the main interface with an active nursing session THEN the system SHALL show elapsed time, current breast, and session status
4. WHEN tapping the nursing progress indicator THEN the system SHALL reopen the nursing modal with current session state
5. WHEN an active nursing session reaches significant milestones THEN the system SHALL provide visual feedback without requiring modal interaction

### Requirement 2

**User Story:** As a nursing parent, I want to save nursing sessions without requiring manual time entry, so that I can quickly log sessions without complex time management.

#### Acceptance Criteria

1. WHEN ending a nursing session THEN the system SHALL automatically calculate and save the duration without requiring time input
2. WHEN starting a nursing session THEN the system SHALL use the current time as the start time automatically
3. WHEN switching breasts during a session THEN the system SHALL automatically track timing for each breast without manual input
4. WHEN saving a nursing session THEN the system SHALL only require breast selection and optional notes
5. WHEN a nursing session is interrupted THEN the system SHALL preserve the session data and allow resumption without time re-entry

### Requirement 3

**User Story:** As a nursing parent, I want a simplified nursing modal interface without icons and emojis, so that I can focus on essential information and actions without visual clutter.

#### Acceptance Criteria

1. WHEN opening the nursing modal THEN the interface SHALL use text labels instead of icons and emojis
2. WHEN selecting breast options THEN the system SHALL use clear text buttons (e.g., "Left", "Right", "Both") instead of visual symbols
3. WHEN viewing session controls THEN the interface SHALL use descriptive text for all actions and states
4. WHEN displaying session information THEN the system SHALL use clean typography and minimal visual elements
5. WHEN interacting with timer controls THEN all buttons and controls SHALL have clear text labels without decorative elements

### Requirement 4

**User Story:** As a nursing parent, I want the nursing modal to maintain persistence when nursing is active, so that my session data is never lost due to modal closure or app interruption.

#### Acceptance Criteria

1. WHEN closing the nursing modal during an active session THEN the session state SHALL be preserved in the background
2. WHEN reopening the nursing modal with an active session THEN the system SHALL restore the exact session state including timing and breast selection
3. WHEN the app is backgrounded during nursing THEN the active session SHALL continue and be recoverable when the app is reopened
4. WHEN the app crashes during nursing THEN the system SHALL recover the active session on restart with accurate timing
5. WHEN switching between app screens during nursing THEN the session state SHALL remain intact and accessible

### Requirement 5

**User Story:** As a nursing parent, I want a dedicated modal for editing nursing sessions, so that I can modify past sessions with appropriate controls and validation separate from the active timer interface.

#### Acceptance Criteria

1. WHEN editing a completed nursing session THEN the system SHALL open a dedicated editing modal distinct from the timer modal
2. WHEN in the nursing edit modal THEN the system SHALL provide controls for modifying start time, end time, duration, breast selection, and notes
3. WHEN editing nursing session timing THEN the system SHALL validate that times are logical and provide helpful error messages
4. WHEN saving nursing session edits THEN the system SHALL update the session data and refresh all related displays
5. WHEN canceling nursing session edits THEN the system SHALL discard changes and return to the previous state without affecting the original session
6. WHEN in the nursing edit modal THEN the system SHALL provide a delete option with confirmation to permanently remove the session