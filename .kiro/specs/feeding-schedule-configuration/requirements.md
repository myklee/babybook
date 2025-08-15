# Feeding Schedule Configuration - Requirements Document

## Introduction

Currently, the application tracks feeding schedules using a feeding_interval_hours setting per baby, but solid food feedings are treated the same as milk feedings (breast/formula/nursing) for schedule calculations. This feature will add a per-baby configuration option to exclude solid foods from feeding schedule calculations by default, while allowing parents to include them if desired.

## Requirements

### Requirement 1

**User Story:** As a parent, I want solid foods to not count towards my baby's feeding schedule by default, so that the feeding reminders and intervals only consider milk feedings (breast, formula, nursing).

#### Acceptance Criteria

1. WHEN I view feeding schedule calculations THEN solid food feedings SHALL be excluded by default
2. WHEN I add a solid food feeding THEN it SHALL NOT affect the next feeding reminder time
3. WHEN I view feeding history and analytics THEN solid foods SHALL be tracked separately from milk feeding schedules
4. WHEN I have a new baby THEN the solid foods exclusion SHALL be enabled by default

### Requirement 2

**User Story:** As a parent, I want the option to include solid foods in my baby's feeding schedule, so that I can customize the tracking based on my baby's feeding patterns and my preferences.

#### Acceptance Criteria

1. WHEN I access baby settings THEN I SHALL see an option to include solid foods in feeding schedule
2. WHEN I enable "include solid foods in schedule" THEN solid food feedings SHALL count towards feeding intervals
3. WHEN I change this setting THEN it SHALL apply to future feeding schedule calculations immediately
4. WHEN I disable this setting THEN existing solid food feedings SHALL be excluded from schedule calculations going forward

### Requirement 3

**User Story:** As a parent, I want feeding schedule calculations to be accurate based on my settings, so that feeding reminders and intervals reflect my baby's actual milk feeding needs.

#### Acceptance Criteria

1. WHEN solid foods are excluded from schedule THEN feeding intervals SHALL only consider breast, formula, and nursing feedings
2. WHEN solid foods are included in schedule THEN all feeding types SHALL be considered for interval calculations
3. WHEN I change the setting THEN the next feeding time SHALL be recalculated immediately
4. WHEN I view feeding statistics THEN they SHALL reflect the current schedule configuration setting
