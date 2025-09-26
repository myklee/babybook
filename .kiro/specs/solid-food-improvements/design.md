# Design Document

## Overview

The solid food improvements will transform the current category-based solid food system into a streamlined, event-driven approach that treats solid foods as first-class feeding events. The design eliminates food categories and preparation modifiers, enables multiple foods per event, and integrates solid food events directly into the feeding timeline and history.

## Architecture

### Current System Analysis

The existing solid food system has these characteristics:

- Separate `solid_foods` table tracking individual food items with categories
- Food categories (western_traditional, chinese, japanese, indian, korean)
- Times tried counter per food item
- Optional integration with feeding schedule via `include_solids_in_schedule` setting
- Separate UI components for solid food management

### New System Architecture

The improved system will:

- Maintain the existing `feedings` table as the primary event store
- Create a new `user_food_items` table for personal food lists
- Create a new `solid_food_events` table to link feeding events with multiple foods
- Eliminate food categories entirely
- Integrate solid food events seamlessly into the feeding timeline

## Components and Interfaces

### Data Models

#### User Food Items

```typescript
interface UserFoodItem {
  id: string;
  user_id: string;
  name: string;
  times_consumed: number;
  first_tried_date: string;
  last_tried_date: string;
  created_at: string;
  updated_at: string;
}
```

#### Solid Food Events

```typescript
interface SolidFoodEvent {
  id: string;
  feeding_id: string; // References feedings table
  food_item_id: string; // References user_food_items table
  created_at: string;
}
```

#### Enhanced Feeding Record

The existing `feedings` table will be used for solid food events with:

- `type: "solid"`
- `amount: null` (not applicable for solid foods)
- Standard feeding metadata (timestamp, notes, baby_id, user_id)

### Database Schema Changes

#### New Tables

**user_food_items**

```sql
CREATE TABLE user_food_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  times_consumed INTEGER DEFAULT 0,
  first_tried_date TIMESTAMP WITH TIME ZONE,
  last_tried_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);
```

**solid_food_events**

```sql
CREATE TABLE solid_food_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feeding_id UUID NOT NULL REFERENCES feedings(id) ON DELETE CASCADE,
  food_item_id UUID NOT NULL REFERENCES user_food_items(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(feeding_id, food_item_id)
);
```

#### Migration Strategy

1. **Data Migration**: Convert existing `solid_foods` records to new structure

   - Create `user_food_items` from unique food names per user
   - Create feeding records for each solid food event
   - Create `solid_food_events` linking records
   - Preserve consumption counts and dates

2. **Backward Compatibility**: Maintain existing `solid_foods` table during transition
   - Mark as deprecated
   - Provide migration utilities
   - Remove after successful migration

### Component Architecture

#### Core Components

**SolidFoodEventModal**

- Replaces existing SolidFoodModal
- Multi-food selection interface
- Integrated with feeding event creation
- Real-time food search and autocomplete

**FoodItemManager**

- Personal food list management
- Add/edit/delete food items
- Consumption statistics
- Search and filtering

**Enhanced Timeline/History**

- Unified feeding event display
- Solid food events with multiple food indicators
- Consistent editing interface

#### Data Flow

1. **Recording Solid Food Event**

   ```
   User selects foods → Create feeding record → Create solid_food_events → Update consumption counts
   ```

2. **Viewing History**

   ```
   Load feedings → Join with solid_food_events → Join with user_food_items → Display unified timeline
   ```

3. **Managing Food Items**
   ```
   User adds food → Check duplicates → Create user_food_item → Available for future events
   ```

## Data Models

### Store Integration

#### Enhanced Baby Store Methods

```typescript
// Food item management
async function addUserFoodItem(name: string): Promise<UserFoodItem>;
async function getUserFoodItems(): Promise<UserFoodItem[]>;
async function updateUserFoodItem(
  id: string,
  updates: Partial<UserFoodItem>
): Promise<UserFoodItem>;
async function deleteUserFoodItem(id: string): Promise<void>;

// Solid food event management
async function createSolidFoodEvent(
  babyId: string,
  foodItemIds: string[],
  timestamp: Date,
  notes?: string,
  reaction?: string
): Promise<Feeding>;

async function updateSolidFoodEvent(
  feedingId: string,
  foodItemIds: string[],
  updates: Partial<Feeding>
): Promise<Feeding>;

async function deleteSolidFoodEvent(feedingId: string): Promise<void>;

// Statistics and analytics
function getFoodConsumptionStats(userId: string): FoodStats;
function getMostConsumedFoods(userId: string, limit: number): UserFoodItem[];
function getRecentlyIntroducedFoods(
  userId: string,
  days: number
): UserFoodItem[];
```

#### Data Relationships

```typescript
interface SolidFeedingEvent extends Feeding {
  type: "solid";
  foods: UserFoodItem[]; // Populated via joins
}

interface FoodStats {
  totalFoodsIntroduced: number;
  totalSolidFoodEvents: number;
  averageFoodsPerEvent: number;
  mostConsumedFoods: UserFoodItem[];
  recentlyIntroduced: UserFoodItem[];
  foodsByReaction: Record<string, UserFoodItem[]>;
}
```

## Error Handling

### Validation Rules

1. **Food Item Creation**

   - Name must be non-empty and trimmed
   - No duplicate names per user (case-insensitive)
   - Maximum name length: 100 characters

2. **Solid Food Event Creation**

   - Must include at least one food item
   - All food items must belong to the user
   - Timestamp must be valid date
   - Baby must belong to the user

3. **Data Integrity**
   - Consumption counts must remain consistent
   - Orphaned records must be prevented
   - Concurrent updates must be handled

### Error Recovery

1. **Failed Event Creation**

   - Rollback feeding record creation
   - Rollback consumption count updates
   - Provide user-friendly error messages

2. **Data Inconsistencies**
   - Background jobs to reconcile consumption counts
   - Audit logs for data changes
   - Manual reconciliation tools for administrators

## Testing Strategy

### Unit Tests

1. **Store Methods**

   - Food item CRUD operations
   - Solid food event creation/editing
   - Consumption count calculations
   - Data validation

2. **Component Logic**
   - Multi-food selection
   - Search and filtering
   - Form validation
   - Event handling

### Integration Tests

1. **Database Operations**

   - Transaction integrity
   - Constraint enforcement
   - Migration accuracy
   - Performance under load

2. **User Workflows**
   - End-to-end event creation
   - Food list management
   - History viewing and editing
   - Statistics accuracy

### Migration Testing

1. **Data Migration**

   - Verify all existing data is preserved
   - Validate consumption counts
   - Test edge cases (empty data, duplicates)
   - Performance with large datasets

2. **Rollback Procedures**
   - Test migration rollback
   - Verify data integrity after rollback
   - Document recovery procedures

## Implementation Phases

### Phase 1: Database Schema and Migration

- Create new tables
- Implement migration scripts
- Test data migration with sample data
- Create rollback procedures

### Phase 2: Core Store Methods

- Implement food item management
- Implement solid food event creation
- Update existing methods for compatibility
- Add comprehensive error handling

### Phase 3: UI Components

- Create new SolidFoodEventModal
- Implement FoodItemManager
- Update Timeline/History components
- Ensure responsive design

### Phase 4: Integration and Testing

- Integrate with feeding schedule
- Update statistics and analytics
- Comprehensive testing
- Performance optimization

### Phase 5: Migration and Cleanup

- Execute production migration
- Monitor system performance
- Remove deprecated code
- Update documentation
