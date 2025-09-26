import type { Database } from "../lib/supabase";

// Base feeding type from database
type Feeding = Database["public"]["Tables"]["feedings"]["Row"];

// User food item interface for personal food list management
export interface UserFoodItem {
  id: string;
  user_id: string;
  name: string;
  times_consumed: number;
  first_tried_date: string | null;
  last_tried_date: string | null;
  created_at: string;
  updated_at: string;
}

// Solid food event interface for linking foods to feeding events
export interface SolidFoodEvent {
  id: string;
  feeding_id: string; // References feedings table
  food_item_id: string; // References user_food_items table
  created_at: string;
}

// Solid feeding event interface extending base Feeding type
export interface SolidFeedingEvent extends Feeding {
  type: "solid";
  amount: null; // Always null for solid food events
  foods: UserFoodItem[]; // Populated via joins with solid_food_events
}

// Food statistics interface for consumption analytics
export interface FoodStats {
  totalFoodsIntroduced: number;
  totalSolidFoodEvents: number;
  averageFoodsPerEvent: number;
  mostConsumedFoods: UserFoodItem[];
  recentlyIntroduced: UserFoodItem[];
  foodsByReaction: Record<string, UserFoodItem[]>;
}

// User food item creation data
export interface CreateUserFoodItemData {
  name: string;
  user_id: string;
}

// User food item update data
export interface UpdateUserFoodItemData {
  name?: string;
  times_consumed?: number;
  first_tried_date?: string | null;
  last_tried_date?: string | null;
}

// Solid food event creation data
export interface CreateSolidFoodEventData {
  baby_id: string;
  food_item_ids: string[];
  timestamp?: Date;
  notes?: string;
  reaction?: "liked" | "disliked" | "neutral" | "allergic_reaction" | null;
}

// Solid food event update data
export interface UpdateSolidFoodEventData {
  food_item_ids?: string[];
  timestamp?: Date;
  notes?: string;
  reaction?: "liked" | "disliked" | "neutral" | "allergic_reaction" | null;
}

// Food search and autocomplete data
export interface FoodSearchResult {
  id: string;
  name: string;
  times_consumed: number;
  last_tried_date: string | null;
  relevance_score: number; // For ranking search results
}

// Food consumption analytics data
export interface FoodConsumptionAnalytics {
  user_id: string;
  date_range: {
    start: string;
    end: string;
  };
  total_foods_tried: number;
  total_solid_events: number;
  average_foods_per_event: number;
  most_consumed_foods: Array<{
    food: UserFoodItem;
    consumption_count: number;
    percentage: number;
  }>;
  recently_introduced: UserFoodItem[];
  foods_by_reaction: {
    liked: UserFoodItem[];
    disliked: UserFoodItem[];
    neutral: UserFoodItem[];
    allergic_reaction: UserFoodItem[];
  };
  consumption_patterns: {
    peak_hours: Array<{
      hour: number;
      event_count: number;
    }>;
    daily_averages: Array<{
      date: string;
      events: number;
      unique_foods: number;
    }>;
  };
}

// Food item validation result
export interface FoodItemValidation {
  is_valid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

// Solid food event validation result
export interface SolidFoodEventValidation {
  is_valid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

// Food item filters for queries
export interface FoodItemFilters {
  user_id?: string;
  name_contains?: string;
  min_consumption?: number;
  max_consumption?: number;
  date_range?: {
    start: Date;
    end: Date;
  };
}

// Food item sort options
export type FoodItemSortBy = 
  | "name" 
  | "times_consumed" 
  | "first_tried_date"
  | "last_tried_date"
  | "created_at";

export interface FoodItemSortOptions {
  sort_by: FoodItemSortBy;
  order: "asc" | "desc";
}

// Utility type for food item queries
export interface FoodItemQuery {
  filters?: FoodItemFilters;
  sort?: FoodItemSortOptions;
  limit?: number;
  offset?: number;
}

// Solid food event filters for queries
export interface SolidFoodEventFilters {
  baby_id?: string;
  user_id?: string;
  food_item_ids?: string[];
  date_range?: {
    start: Date;
    end: Date;
  };
  reaction?: "liked" | "disliked" | "neutral" | "allergic_reaction" | null;
}

// Solid food event sort options
export type SolidFoodEventSortBy = 
  | "timestamp" 
  | "created_at"
  | "food_count";

export interface SolidFoodEventSortOptions {
  sort_by: SolidFoodEventSortBy;
  order: "asc" | "desc";
}

// Utility type for solid food event queries
export interface SolidFoodEventQuery {
  filters?: SolidFoodEventFilters;
  sort?: SolidFoodEventSortOptions;
  limit?: number;
  offset?: number;
}

// Food usage information for deletion warnings
export interface FoodUsageInfo {
  food_item: UserFoodItem;
  usage_count: number;
  first_used_date: string | null;
  last_used_date: string | null;
  recent_events: Array<{
    id: string;
    timestamp: string;
    baby_name?: string;
  }>;
}

/**
 * Validates food item data
 */
export function validateFoodItem(name: string): FoodItemValidation {
  const errors: Array<{ field: string; message: string }> = [];
  const warnings: Array<{ field: string; message: string }> = [];

  // Required: Name must be provided
  if (!name || name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Food name is required'
    });
  }

  // Validate name length
  const trimmedName = name.trim();
  if (trimmedName.length > 100) {
    errors.push({
      field: 'name',
      message: 'Food name cannot exceed 100 characters'
    });
  }

  if (trimmedName.length < 2) {
    errors.push({
      field: 'name',
      message: 'Food name must be at least 2 characters long'
    });
  }

  // Warning: Very long name
  if (trimmedName.length > 50) {
    warnings.push({
      field: 'name',
      message: 'Consider using a shorter, more concise food name'
    });
  }

  // Warning: Name contains special characters
  if (!/^[a-zA-Z0-9\s\-'&().,]+$/.test(trimmedName)) {
    warnings.push({
      field: 'name',
      message: 'Food name contains unusual characters'
    });
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates solid food event data
 */
export function validateSolidFoodEvent(
  foodItemIds: string[],
  timestamp?: Date
): SolidFoodEventValidation {
  const errors: Array<{ field: string; message: string }> = [];
  const warnings: Array<{ field: string; message: string }> = [];

  // Required: At least one food item must be selected
  if (!foodItemIds || foodItemIds.length === 0) {
    errors.push({
      field: 'food_items',
      message: 'At least one food item must be selected'
    });
  }

  // Validate food item IDs are valid UUIDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  foodItemIds.forEach((id, index) => {
    if (!uuidRegex.test(id)) {
      errors.push({
        field: `food_items[${index}]`,
        message: 'Invalid food item ID format'
      });
    }
  });

  // Check for duplicate food items
  const uniqueIds = new Set(foodItemIds);
  if (uniqueIds.size !== foodItemIds.length) {
    errors.push({
      field: 'food_items',
      message: 'Duplicate food items are not allowed in the same event'
    });
  }

  // Validate timestamp if provided
  if (timestamp) {
    const now = new Date();
    
    // Error: Timestamp cannot be in the future
    if (timestamp > now) {
      errors.push({
        field: 'timestamp',
        message: 'Event timestamp cannot be in the future'
      });
    }
    
    // Warning: Event more than 7 days ago
    const daysAgo = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
    if (daysAgo > 7) {
      warnings.push({
        field: 'timestamp',
        message: 'Event is more than 7 days ago'
      });
    }
  }

  // Warning: Many foods in single event
  if (foodItemIds.length > 10) {
    warnings.push({
      field: 'food_items',
      message: 'This event contains many foods - consider splitting into multiple events'
    });
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Formats food names for display
 */
export function formatFoodNames(foods: UserFoodItem[], maxDisplay: number = 3): string {
  if (foods.length === 0) return 'No foods';
  
  if (foods.length <= maxDisplay) {
    return foods.map(f => f.name).join(', ');
  }
  
  const displayed = foods.slice(0, maxDisplay).map(f => f.name).join(', ');
  const remaining = foods.length - maxDisplay;
  return `${displayed} and ${remaining} more`;
}

/**
 * Calculates food consumption statistics
 */
export function calculateFoodStats(
  foods: UserFoodItem[],
  events: SolidFeedingEvent[]
): FoodStats {
  const totalFoodsIntroduced = foods.length;
  const totalSolidFoodEvents = events.length;
  const averageFoodsPerEvent = events.length > 0 
    ? events.reduce((sum, event) => sum + event.foods.length, 0) / events.length 
    : 0;

  // Sort foods by consumption count
  const mostConsumedFoods = [...foods]
    .sort((a, b) => b.times_consumed - a.times_consumed)
    .slice(0, 10);

  // Get recently introduced foods (within last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentlyIntroduced = foods
    .filter(food => food.first_tried_date && new Date(food.first_tried_date) >= thirtyDaysAgo)
    .sort((a, b) => new Date(b.first_tried_date!).getTime() - new Date(a.first_tried_date!).getTime())
    .slice(0, 10);

  // Group foods by reaction (this would need to be populated from feeding events with reactions)
  const foodsByReaction: Record<string, UserFoodItem[]> = {
    liked: [],
    disliked: [],
    neutral: [],
    allergic_reaction: []
  };

  return {
    totalFoodsIntroduced,
    totalSolidFoodEvents,
    averageFoodsPerEvent,
    mostConsumedFoods,
    recentlyIntroduced,
    foodsByReaction
  };
}

/**
 * Creates a solid feeding event from feeding data and foods
 */
export function createSolidFeedingEvent(
  feeding: Feeding,
  foods: UserFoodItem[]
): SolidFeedingEvent {
  return {
    ...feeding,
    type: "solid",
    amount: null,
    foods
  };
}

/**
 * Type guard to check if a feeding is a solid food event
 */
export function isSolidFeedingEvent(feeding: Feeding): feeding is SolidFeedingEvent {
  return feeding.type === "solid";
}