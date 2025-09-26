import type { Database } from "../lib/supabase";
import type { UserFoodItem, SolidFeedingEvent } from "./solidFood";
import type { NursingSession } from "./nursing";
import type { PumpingSession } from "./pumping";

// Base feeding type from database
export type Feeding = Database["public"]["Tables"]["feedings"]["Row"];

// All possible feeding types
export type FeedingType = "breast" | "formula" | "solid" | "nursing";

// Base feeding interface with common properties
export interface BaseFeedingEvent {
  id: string;
  baby_id: string;
  user_id: string;
  timestamp: string;
  notes: string | null;
  created_at: string;
}

// Breast feeding event
export interface BreastFeedingEvent extends BaseFeedingEvent {
  type: "breast";
  amount: number; // ml
  start_time: string | null;
  end_time: string | null;
  breast_used: "left" | "right" | "both" | null;
  left_duration: number;
  right_duration: number;
  total_duration: number;
}

// Formula feeding event
export interface FormulaFeedingEvent extends BaseFeedingEvent {
  type: "formula";
  amount: number; // ml
  start_time: null;
  end_time: null;
  breast_used: null;
  left_duration: 0;
  right_duration: 0;
  total_duration: 0;
}

// Union type for all feeding events
export type FeedingEvent = 
  | BreastFeedingEvent 
  | FormulaFeedingEvent 
  | SolidFeedingEvent 
  | NursingSession;

// Feeding event creation data
export interface CreateFeedingEventData {
  baby_id: string;
  type: FeedingType;
  timestamp?: Date;
  amount?: number | null;
  notes?: string;
  // Nursing-specific fields
  start_time?: Date;
  end_time?: Date;
  breast_used?: "left" | "right" | "both" | null;
  left_duration?: number;
  right_duration?: number;
  total_duration?: number;
  // Solid food-specific fields
  food_item_ids?: string[];
  reaction?: "liked" | "disliked" | "neutral" | "allergic_reaction" | null;
}

// Feeding event update data
export interface UpdateFeedingEventData {
  timestamp?: Date;
  amount?: number | null;
  notes?: string;
  // Nursing-specific fields
  start_time?: Date;
  end_time?: Date;
  breast_used?: "left" | "right" | "both" | null;
  left_duration?: number;
  right_duration?: number;
  total_duration?: number;
  // Solid food-specific fields
  food_item_ids?: string[];
  reaction?: "liked" | "disliked" | "neutral" | "allergic_reaction" | null;
}

// Feeding event with populated relationships
export interface PopulatedFeedingEvent extends Feeding {
  // For solid food events
  foods?: UserFoodItem[];
  // For pumping sessions (if we want to include them in feeding timeline)
  pumping_session?: PumpingSession;
}

// Feeding event filters for queries
export interface FeedingEventFilters {
  baby_id?: string;
  user_id?: string;
  types?: FeedingType[];
  date_range?: {
    start: Date;
    end: Date;
  };
  min_amount?: number;
  max_amount?: number;
  has_notes?: boolean;
}

// Feeding event sort options
export type FeedingEventSortBy = 
  | "timestamp" 
  | "type"
  | "amount"
  | "created_at";

export interface FeedingEventSortOptions {
  sort_by: FeedingEventSortBy;
  order: "asc" | "desc";
}

// Utility type for feeding event queries
export interface FeedingEventQuery {
  filters?: FeedingEventFilters;
  sort?: FeedingEventSortOptions;
  limit?: number;
  offset?: number;
}

// Feeding statistics
export interface FeedingStatistics {
  baby_id: string;
  date_range: {
    start: string;
    end: string;
  };
  total_events: number;
  events_by_type: Record<FeedingType, number>;
  total_volume_ml: number; // For breast and formula only
  average_volume_ml: number; // For breast and formula only
  daily_totals: Array<{
    date: string;
    events: number;
    volume_ml: number;
    events_by_type: Record<FeedingType, number>;
  }>;
  feeding_patterns: {
    most_common_type: FeedingType;
    average_interval_hours: number;
    peak_hours: Array<{
      hour: number;
      event_count: number;
    }>;
  };
}

// Feeding schedule information
export interface FeedingScheduleInfo {
  baby_id: string;
  next_feeding_time: Date | null;
  last_feeding: FeedingEvent | null;
  feeding_interval_hours: number;
  include_solids: boolean;
  relevant_feeding_types: FeedingType[];
}

/**
 * Type guard to check if a feeding is a breast feeding event
 */
export function isBreastFeedingEvent(feeding: Feeding): feeding is BreastFeedingEvent {
  return feeding.type === "breast";
}

/**
 * Type guard to check if a feeding is a formula feeding event
 */
export function isFormulaFeedingEvent(feeding: Feeding): feeding is FormulaFeedingEvent {
  return feeding.type === "formula";
}

/**
 * Type guard to check if a feeding is a nursing session
 */
export function isNursingSession(feeding: Feeding): feeding is NursingSession {
  return feeding.type === "nursing";
}

/**
 * Type guard to check if a feeding has volume (breast or formula)
 */
export function hasVolume(feeding: FeedingEvent): feeding is BreastFeedingEvent | FormulaFeedingEvent {
  return feeding.type === "breast" || feeding.type === "formula";
}

/**
 * Type guard to check if a feeding has duration (breast or nursing)
 */
export function hasDuration(feeding: FeedingEvent): feeding is BreastFeedingEvent | NursingSession {
  return feeding.type === "breast" || feeding.type === "nursing";
}

/**
 * Gets the display name for a feeding type
 */
export function getFeedingTypeDisplayName(type: FeedingType): string {
  switch (type) {
    case "breast":
      return "Breast";
    case "formula":
      return "Formula";
    case "solid":
      return "Solid Food";
    case "nursing":
      return "Nursing";
    default:
      return "Unknown";
  }
}

/**
 * Gets the icon name for a feeding type
 */
export function getFeedingTypeIcon(type: FeedingType): string {
  switch (type) {
    case "breast":
      return "droplets";
    case "formula":
      return "flask-conical";
    case "solid":
      return "spoon";
    case "nursing":
      return "droplets";
    default:
      return "circle";
  }
}

/**
 * Formats feeding amount for display
 */
export function formatFeedingAmount(feeding: FeedingEvent): string {
  if (hasVolume(feeding) && feeding.amount) {
    return `${feeding.amount}ml`;
  }
  return "";
}

/**
 * Formats feeding duration for display
 */
export function formatFeedingDuration(feeding: FeedingEvent): string {
  if (hasDuration(feeding) && feeding.total_duration > 0) {
    const minutes = Math.floor(feeding.total_duration / 60);
    const seconds = feeding.total_duration % 60;
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }
  return "";
}

/**
 * Gets a summary description for a feeding event
 */
export function getFeedingSummary(feeding: PopulatedFeedingEvent): string {
  switch (feeding.type) {
    case "breast":
    case "formula":
      const amount = formatFeedingAmount(feeding as FeedingEvent);
      const duration = formatFeedingDuration(feeding as FeedingEvent);
      return [amount, duration].filter(Boolean).join(" • ");
    
    case "nursing":
      return formatFeedingDuration(feeding as FeedingEvent);
    
    case "solid":
      if (feeding.foods && feeding.foods.length > 0) {
        if (feeding.foods.length === 1) {
          return feeding.foods[0].name;
        } else if (feeding.foods.length <= 3) {
          return feeding.foods.map(f => f.name).join(", ");
        } else {
          return `${feeding.foods.slice(0, 2).map(f => f.name).join(", ")} and ${feeding.foods.length - 2} more`;
        }
      }
      return "Solid food";
    
    default:
      return "Feeding";
  }
}

/**
 * Calculates total volume for feedings with amounts
 */
export function calculateTotalVolume(feedings: FeedingEvent[]): number {
  return feedings
    .filter(hasVolume)
    .reduce((total, feeding) => total + (feeding.amount || 0), 0);
}

/**
 * Calculates total duration for feedings with durations
 */
export function calculateTotalDuration(feedings: FeedingEvent[]): number {
  return feedings
    .filter(hasDuration)
    .reduce((total, feeding) => total + feeding.total_duration, 0);
}

/**
 * Groups feedings by type
 */
export function groupFeedingsByType(feedings: FeedingEvent[]): Record<FeedingType, FeedingEvent[]> {
  const groups: Record<FeedingType, FeedingEvent[]> = {
    breast: [],
    formula: [],
    solid: [],
    nursing: []
  };

  feedings.forEach(feeding => {
    groups[feeding.type].push(feeding);
  });

  return groups;
}

/**
 * Filters feedings by date range
 */
export function filterFeedingsByDateRange(
  feedings: FeedingEvent[], 
  startDate: Date, 
  endDate: Date
): FeedingEvent[] {
  return feedings.filter(feeding => {
    const feedingDate = new Date(feeding.timestamp);
    return feedingDate >= startDate && feedingDate <= endDate;
  });
}

/**
 * Sorts feedings by timestamp
 */
export function sortFeedingsByTimestamp(
  feedings: FeedingEvent[], 
  order: "asc" | "desc" = "desc"
): FeedingEvent[] {
  return [...feedings].sort((a, b) => {
    const aTime = new Date(a.timestamp).getTime();
    const bTime = new Date(b.timestamp).getTime();
    return order === "desc" ? bTime - aTime : aTime - bTime;
  });
}