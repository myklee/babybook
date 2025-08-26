# Baby Archiving - Design Document

## Overview

This feature replaces the destructive "delete baby" functionality with a non-destructive "archive baby" system. Archived babies are hidden from active use but all their data is preserved for future access or restoration.

## Architecture

### Database Changes

**Add archived status to babies table:**

```sql
ALTER TABLE babies ADD COLUMN archived BOOLEAN DEFAULT FALSE;
```

### Data Model

**Baby Model Updates:**

- Add `archived: boolean` field (default: false)
- Archived babies are excluded from normal queries
- All related data (feedings, diapers, etc.) remains untouched

## Components and Interfaces

### Modified Components

**EditBabyModal.vue:**

- Replace "Delete Baby" button with "Mark as Grown Up" button
- Update confirmation dialog text to be more positive
- Explain that data will be preserved

**BabyStore.ts:**

- Replace `deleteBaby()` with `archiveBaby()`
- Update `getBabies()` to exclude archived babies by default
- Add `getArchivedBabies()` for future use

### UI Changes

**Button Text Changes:**

- "Delete Baby" → "Mark as Grown Up"
- "Are you sure you want to delete?" → "Mark [Baby Name] as grown up?"

**Confirmation Dialog:**

- Positive messaging about preserving memories
- Clear explanation that baby will be removed from active tracking
- Option to cancel if user changes their mind

## Data Models

### Updated Baby Interface

```typescript
interface Baby {
  id: string;
  name: string;
  birthdate?: string;
  image_url?: string;
  user_id: string;
  archived: boolean; // NEW FIELD
  created_at: string;
  updated_at: string;
}
```

## Error Handling

### Archive Operation

- Handle database errors gracefully
- Show success message on successful archive
- Redirect to home page after archiving
- Maintain data integrity during archive process

## Testing Strategy

### Unit Tests

- Test `archiveBaby()` function
- Test baby filtering (active vs archived)
- Test UI button text changes

### Integration Tests

- Test complete archive workflow
- Verify data preservation
- Test home page baby list updates
- Verify no data loss occurs

### User Acceptance Tests

- Parent can archive a baby successfully
- Archived baby disappears from active lists
- All baby data remains accessible in database
- Positive user experience with "grown up" messaging
