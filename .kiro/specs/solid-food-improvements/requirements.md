# Requirements Document

## Introduction

This specification outlines improvements to the solid food system to simplify food management, eliminate categories and preparation modifiers, treat solid food events as feeding events, enable multiple foods per event, and track food consumption frequency. The goal is to create a streamlined, user-friendly solid food tracking system that integrates seamlessly with the existing feeding schedule and history.

## Requirements

### Requirement 1

**User Story:** As a parent, I want to record solid food events as feeding events, so that they appear in my baby's feeding history and recent feedings alongside other feeding types.

#### Acceptance Criteria

1. WHEN I record a solid food event THEN the system SHALL create a feeding record with type "solid"
2. WHEN I view the feeding history THEN solid food events SHALL appear chronologically with other feeding events
3. WHEN I view recent feedings THEN solid food events SHALL be displayed with appropriate icons and formatting
4. WHEN I edit a feeding record THEN solid food events SHALL be editable through the same interface as other feeding types
5. WHEN I delete a solid food event THEN it SHALL be removed from both the feeding history and solid food tracking

### Requirement 2

**User Story:** As a parent, I want to manage a simple list of food items without categories or preparation methods, so that I can quickly add and track foods without unnecessary complexity.

#### Acceptance Criteria

1. WHEN I add a new food item THEN the system SHALL store only the food name without category or preparation modifiers
2. WHEN I view my food list THEN it SHALL display food names in a simple, searchable format
3. WHEN I search for foods THEN the system SHALL match against food names only
4. WHEN I add a food item THEN the system SHALL prevent duplicate entries by checking existing food names
5. WHEN I type a food name THEN the system SHALL provide autocomplete suggestions from my existing food list

### Requirement 3

**User Story:** As a parent, I want to record multiple foods in a single solid food event, so that I can accurately track mixed meals and combination foods.

#### Acceptance Criteria

1. WHEN I create a solid food event THEN I SHALL be able to select multiple food items from my list
2. WHEN I record multiple foods THEN each food item SHALL be tracked individually for consumption frequency
3. WHEN I view a solid food event THEN it SHALL display all foods included in that event
4. WHEN I edit a solid food event THEN I SHALL be able to add or remove individual foods from the event
5. WHEN I delete a solid food event THEN the consumption count SHALL be decremented for all foods in that event

### Requirement 4

**User Story:** As a parent, I want to track how many times each food item has been eaten, so that I can monitor my baby's food exposure and preferences.

#### Acceptance Criteria

1. WHEN I record a solid food event THEN the system SHALL increment the consumption count for each food item included
2. WHEN I view my food list THEN each food item SHALL display its total consumption count
3. WHEN I view food statistics THEN I SHALL see which foods have been tried most frequently
4. WHEN I edit a solid food event THEN consumption counts SHALL be updated accordingly for added or removed foods
5. WHEN I delete a solid food event THEN consumption counts SHALL be decremented for all affected foods

### Requirement 5

**User Story:** As a parent, I want to add new food items to my personal food list, so that I can track foods that aren't in the default suggestions.

#### Acceptance Criteria

1. WHEN I type a food name that doesn't exist THEN the system SHALL offer to add it to my food list
2. WHEN I add a new food item THEN it SHALL be saved to my personal food list for future use
3. WHEN I add a new food item THEN the system SHALL validate that it's not a duplicate of an existing food
4. WHEN I view my food list THEN custom foods SHALL be displayed alongside any default suggestions
5. WHEN I search for foods THEN my custom foods SHALL appear in search results

### Requirement 6

**User Story:** As a parent, I want solid food events to include the same metadata as other feeding events, so that I can track timing, notes, and reactions consistently.

#### Acceptance Criteria

1. WHEN I record a solid food event THEN I SHALL be able to set the date and time
2. WHEN I record a solid food event THEN I SHALL be able to add notes about the feeding
3. WHEN I record a solid food event THEN I SHALL be able to record the baby's reaction (liked, disliked, neutral, allergic)
4. WHEN I view a solid food event THEN it SHALL display all metadata in a consistent format with other feeding events
5. WHEN solid foods are included in the feeding schedule THEN they SHALL appear with appropriate timing and context

### Requirement 7

**User Story:** As a parent, I want to manage my food list by editing or removing items, so that I can keep my food list organized and accurate.

#### Acceptance Criteria

1. WHEN I view my food list THEN I SHALL see options to edit or delete each food item
2. WHEN I edit a food name THEN all existing events SHALL be updated to reflect the new name
3. WHEN I delete a food item THEN the system SHALL warn me if it's used in existing events
4. WHEN I confirm deletion of a used food item THEN existing events SHALL either be updated or the food SHALL be marked as archived
5. WHEN I delete a food item THEN its consumption count SHALL be preserved for historical accuracy

### Requirement 8

**User Story:** As a parent, I want to see food consumption patterns and statistics, so that I can understand my baby's eating habits and food preferences.

#### Acceptance Criteria

1. WHEN I view food statistics THEN I SHALL see total number of unique foods tried
2. WHEN I view food statistics THEN I SHALL see total number of solid food events recorded
3. WHEN I view food statistics THEN I SHALL see most frequently eaten foods
4. WHEN I view food statistics THEN I SHALL see recently introduced foods
5. WHEN I view food statistics THEN I SHALL see foods grouped by reaction type (liked, disliked, etc.)
