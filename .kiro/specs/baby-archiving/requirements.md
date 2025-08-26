# Baby Archiving - Requirements Document

## Introduction

Currently, the application allows users to delete babies, which permanently removes all associated data including feedings, diaper changes, sleep sessions, and other tracking information. This feature will replace baby deletion with an archiving system that preserves all data while removing babies from active tracking.

## Requirements

### Requirement 1

**User Story:** As a parent, I want to archive my baby instead of deleting them, so that all their precious data and memories are preserved even when they no longer need active tracking.

#### Acceptance Criteria

1. WHEN I try to delete a baby THEN I SHALL see an "Archive" or "Grown Up" option instead of delete
2. WHEN I archive a baby THEN all their data SHALL be preserved in the database
3. WHEN I archive a baby THEN they SHALL be removed from the active baby list on the home page
4. WHEN I archive a baby THEN they SHALL no longer appear in baby selection dropdowns

### Requirement 2

**User Story:** As a parent, I want archived babies to be clearly distinguished from active babies, so that I understand the difference between current tracking and historical records.

#### Acceptance Criteria

1. WHEN I archive a baby THEN the action SHALL be labeled as "Mark as Grown Up" or similar positive terminology
2. WHEN I confirm archiving THEN I SHALL see a confirmation message explaining that data will be preserved
3. WHEN a baby is archived THEN their status SHALL be stored in the database
4. WHEN I view the baby edit modal THEN the delete button SHALL be replaced with an archive button

### Requirement 3

**User Story:** As a parent, I want the option to restore archived babies in the future, so that I can reactivate tracking if needed (though this will be implemented later).

#### Acceptance Criteria

1. WHEN I archive a baby THEN their record SHALL include an archived status field
2. WHEN a baby is archived THEN all related data SHALL remain intact and queryable
3. WHEN the system queries for active babies THEN archived babies SHALL be excluded by default
4. WHEN future features are added THEN archived babies SHALL be restorable without data loss
