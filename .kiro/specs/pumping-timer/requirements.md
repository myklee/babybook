# Pumping Timer Requirements

## Introduction

This feature adds breast milk pumping functionality to the baby tracking app. Users need to track pumping sessions with timing controls similar to nursing, but with the addition of recording the amount of milk pumped from each breast. This helps parents track milk production and manage their pumping schedule.

## Requirements

### Requirement 1

**User Story:** As a breastfeeding parent, I want to track my pumping sessions with timing controls, so that I can monitor how long I pump and optimize my pumping schedule.

#### Acceptance Criteria

1. WHEN I access the pumping feature THEN I SHALL see a modal with dual breast timer controls similar to nursing
2. WHEN I start a pumping timer THEN the system SHALL track the duration for left and/or right breast independently
3. WHEN I stop a timer THEN the system SHALL record the final duration for that breast
4. WHEN I complete a pumping session THEN the system SHALL save the session to a dedicated pumping sessions data store with start time, end time, and individual breast durations

### Requirement 2

**User Story:** As a breastfeeding parent, I want to record the amount of milk pumped from each breast, so that I can track my milk production and supply.

#### Acceptance Criteria

1. WHEN I complete pumping from a breast THEN I SHALL be able to enter the amount pumped in ml
2. WHEN I enter pumping amounts THEN the system SHALL accept numeric values for left and right breast separately
3. WHEN I save a pumping session THEN the system SHALL store both duration and amount for each breast used
4. WHEN viewing pumping history THEN I SHALL see both duration and amount information for each session

### Requirement 3

**User Story:** As a breastfeeding parent, I want to add optional notes to my pumping sessions, so that I can record relevant details about the session.

#### Acceptance Criteria

1. WHEN I access pumping session options THEN notes SHALL be hidden under a "More Options" collapsible section
2. WHEN I expand "More Options" THEN I SHALL see a notes textarea field
3. WHEN I add notes THEN the system SHALL save them with the pumping session
4. WHEN viewing pumping history THEN notes SHALL be displayed if present

### Requirement 4

**User Story:** As a breastfeeding parent, I want pumping sessions to be stored separately from feeding data but visible in my activity timeline, so that I can track milk production independently while maintaining a complete activity overview.

#### Acceptance Criteria

1. WHEN I complete a pumping session THEN it SHALL be stored in a separate pumping sessions table/collection
2. WHEN viewing baby history timeline THEN pumping sessions SHALL appear as distinct markers separate from feeding events
3. WHEN I click on a pumping event THEN I SHALL see session details including duration and amounts
4. WHEN viewing activity summaries THEN pumping sessions SHALL be displayed separately from feeding data
5. WHEN accessing pumping history THEN I SHALL see a dedicated view of all pumping sessions

### Requirement 5

**User Story:** As a breastfeeding parent, I want to access the pumping feature from the main action buttons, so that I can quickly start a pumping session.

#### Acceptance Criteria

1. WHEN I view the homepage action grid THEN I SHALL see a "Pump" button
2. WHEN I click the "Pump" button THEN the pumping timer modal SHALL open
3. WHEN I view the baby history page THEN I SHALL see a "Pump" button in the action buttons
4. WHEN the pumping modal is open THEN it SHALL have consistent styling with other modals

### Requirement 6

**User Story:** As a breastfeeding parent, I want to edit or delete pumping sessions, so that I can correct mistakes or remove incorrect entries.

#### Acceptance Criteria

1. WHEN I click on a pumping session in the history THEN I SHALL be able to edit the session details
2. WHEN editing a pumping session THEN I SHALL be able to modify duration, amounts, and notes
3. WHEN editing a pumping session THEN I SHALL be able to delete the entire session
4. WHEN I save changes THEN the updated pumping session SHALL be reflected in all views