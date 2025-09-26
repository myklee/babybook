import type { Database } from "../lib/supabase";
import type { 
  SolidFeedingEvent, 
  UserFoodItem, 
  SolidFoodEvent,
  FoodItemValidation,
  SolidFoodEventValidation 
} from "./solidFood";

// Base types from database
type Feeding = Database["public"]["Tables"]["feedings"]["Row"];
type UserFoodItemRow = Database["public"]["Tables"]["user_food_items"]["Row"];
type SolidFoodEventRow = Database["public"]["Tables"]["solid_food_events"]["Row"];

/**
 * Type guard to check if a feeding is a solid food event
 */
export function isSolidFeedingEvent(feeding: Feeding): feeding is SolidFeedingEvent {
  return feeding.type === "solid";
}

/**
 * Type guard to check if an object is a valid UserFoodItem
 */
export function isUserFoodItem(obj: any): obj is UserFoodItem {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.user_id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.times_consumed === 'number' &&
    (obj.first_tried_date === null || typeof obj.first_tried_date === 'string') &&
    (obj.last_tried_date === null || typeof obj.last_tried_date === 'string') &&
    typeof obj.created_at === 'string' &&
    typeof obj.updated_at === 'string'
  );
}

/**
 * Type guard to check if an object is a valid SolidFoodEvent
 */
export function isSolidFoodEvent(obj: any): obj is SolidFoodEvent {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.feeding_id === 'string' &&
    typeof obj.food_item_id === 'string' &&
    typeof obj.created_at === 'string'
  );
}

/**
 * Type guard to check if a feeding has the solid food event structure
 */
export function hasSolidFoodEventStructure(feeding: any): feeding is SolidFeedingEvent {
  return (
    isSolidFeedingEvent(feeding) &&
    Array.isArray(feeding.foods) &&
    feeding.foods.every(isUserFoodItem)
  );
}

/**
 * Validates that a database row matches UserFoodItem structure
 */
export function validateUserFoodItemRow(row: UserFoodItemRow): FoodItemValidation {
  const errors: Array<{ field: string; message: string }> = [];
  const warnings: Array<{ field: string; message: string }> = [];

  // Validate required fields
  if (!row.id || typeof row.id !== 'string') {
    errors.push({ field: 'id', message: 'Invalid or missing ID' });
  }

  if (!row.user_id || typeof row.user_id !== 'string') {
    errors.push({ field: 'user_id', message: 'Invalid or missing user ID' });
  }

  if (!row.name || typeof row.name !== 'string' || row.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Invalid or missing food name' });
  }

  if (typeof row.times_consumed !== 'number' || row.times_consumed < 0) {
    errors.push({ field: 'times_consumed', message: 'Invalid consumption count' });
  }

  // Validate optional date fields
  if (row.first_tried_date !== null && typeof row.first_tried_date !== 'string') {
    errors.push({ field: 'first_tried_date', message: 'Invalid first tried date format' });
  }

  if (row.last_tried_date !== null && typeof row.last_tried_date !== 'string') {
    errors.push({ field: 'last_tried_date', message: 'Invalid last tried date format' });
  }

  // Validate timestamps
  if (!row.created_at || typeof row.created_at !== 'string') {
    errors.push({ field: 'created_at', message: 'Invalid or missing created timestamp' });
  }

  if (!row.updated_at || typeof row.updated_at !== 'string') {
    errors.push({ field: 'updated_at', message: 'Invalid or missing updated timestamp' });
  }

  // Warnings for data consistency
  if (row.times_consumed > 0 && !row.first_tried_date) {
    warnings.push({ 
      field: 'first_tried_date', 
      message: 'Food has been consumed but no first tried date recorded' 
    });
  }

  if (row.times_consumed > 0 && !row.last_tried_date) {
    warnings.push({ 
      field: 'last_tried_date', 
      message: 'Food has been consumed but no last tried date recorded' 
    });
  }

  if (row.first_tried_date && row.last_tried_date) {
    const firstDate = new Date(row.first_tried_date);
    const lastDate = new Date(row.last_tried_date);
    if (firstDate > lastDate) {
      errors.push({ 
        field: 'dates', 
        message: 'First tried date cannot be after last tried date' 
      });
    }
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates that a database row matches SolidFoodEvent structure
 */
export function validateSolidFoodEventRow(row: SolidFoodEventRow): SolidFoodEventValidation {
  const errors: Array<{ field: string; message: string }> = [];
  const warnings: Array<{ field: string; message: string }> = [];

  // Validate required fields
  if (!row.id || typeof row.id !== 'string') {
    errors.push({ field: 'id', message: 'Invalid or missing ID' });
  }

  if (!row.feeding_id || typeof row.feeding_id !== 'string') {
    errors.push({ field: 'feeding_id', message: 'Invalid or missing feeding ID' });
  }

  if (!row.food_item_id || typeof row.food_item_id !== 'string') {
    errors.push({ field: 'food_item_id', message: 'Invalid or missing food item ID' });
  }

  if (!row.created_at || typeof row.created_at !== 'string') {
    errors.push({ field: 'created_at', message: 'Invalid or missing created timestamp' });
  }

  // Validate UUID format for IDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (row.id && !uuidRegex.test(row.id)) {
    errors.push({ field: 'id', message: 'ID is not a valid UUID format' });
  }

  if (row.feeding_id && !uuidRegex.test(row.feeding_id)) {
    errors.push({ field: 'feeding_id', message: 'Feeding ID is not a valid UUID format' });
  }

  if (row.food_item_id && !uuidRegex.test(row.food_item_id)) {
    errors.push({ field: 'food_item_id', message: 'Food item ID is not a valid UUID format' });
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Converts a database UserFoodItem row to the application UserFoodItem type
 */
export function convertUserFoodItemRow(row: UserFoodItemRow): UserFoodItem {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    times_consumed: row.times_consumed,
    first_tried_date: row.first_tried_date,
    last_tried_date: row.last_tried_date,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

/**
 * Converts a database SolidFoodEvent row to the application SolidFoodEvent type
 */
export function convertSolidFoodEventRow(row: SolidFoodEventRow): SolidFoodEvent {
  return {
    id: row.id,
    feeding_id: row.feeding_id,
    food_item_id: row.food_item_id,
    created_at: row.created_at
  };
}

/**
 * Validates that a feeding record is properly structured for solid food events
 */
export function validateSolidFeedingRecord(feeding: Feeding): SolidFoodEventValidation {
  const errors: Array<{ field: string; message: string }> = [];
  const warnings: Array<{ field: string; message: string }> = [];

  // Must be solid type
  if (feeding.type !== "solid") {
    errors.push({ 
      field: 'type', 
      message: 'Feeding type must be "solid" for solid food events' 
    });
  }

  // Amount should be null for solid foods
  if (feeding.amount !== null) {
    warnings.push({ 
      field: 'amount', 
      message: 'Amount should be null for solid food events' 
    });
  }

  // Breast-related fields should be null for solid foods
  if (feeding.breast_used !== null) {
    warnings.push({ 
      field: 'breast_used', 
      message: 'Breast used should be null for solid food events' 
    });
  }

  if (feeding.left_duration !== 0) {
    warnings.push({ 
      field: 'left_duration', 
      message: 'Left duration should be 0 for solid food events' 
    });
  }

  if (feeding.right_duration !== 0) {
    warnings.push({ 
      field: 'right_duration', 
      message: 'Right duration should be 0 for solid food events' 
    });
  }

  if (feeding.total_duration !== 0) {
    warnings.push({ 
      field: 'total_duration', 
      message: 'Total duration should be 0 for solid food events' 
    });
  }

  // Start and end times should be null for solid foods
  if (feeding.start_time !== null) {
    warnings.push({ 
      field: 'start_time', 
      message: 'Start time should be null for solid food events' 
    });
  }

  if (feeding.end_time !== null) {
    warnings.push({ 
      field: 'end_time', 
      message: 'End time should be null for solid food events' 
    });
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Type predicate to check if an array contains only UserFoodItems
 */
export function areAllUserFoodItems(items: any[]): items is UserFoodItem[] {
  return items.every(isUserFoodItem);
}

/**
 * Type predicate to check if an array contains only SolidFoodEvents
 */
export function areAllSolidFoodEvents(events: any[]): events is SolidFoodEvent[] {
  return events.every(isSolidFoodEvent);
}