// Automated Feeding Schedule types and interfaces

// Core feeding schedule interface matching the database schema
export interface FeedingSchedule {
  id: string;
  baby_id: string;
  user_id: string;
  name: string;
  feeding_type: "breast" | "formula" | "solid";
  default_amount?: number; // For formula only
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
  usage_count: number;
}

// Data for creating a new feeding schedule
export interface CreateFeedingScheduleData {
  baby_id: string;
  name: string;
  feeding_type: "breast" | "formula" | "solid";
  default_amount?: number;
  is_active?: boolean;
}

// Data for updating an existing feeding schedule
export interface UpdateFeedingScheduleData {
  name?: string;
  feeding_type?: "breast" | "formula" | "solid";
  default_amount?: number;
  is_active?: boolean;
}

// Schedule usage statistics
export interface ScheduleUsageStats {
  schedule_id: string;
  total_uses: number;
  last_used: string | null;
  success_rate: number;
  avg_time_between_uses: number; // in minutes
}

// Schedule trigger result
export interface ScheduleTriggerResult {
  success: boolean;
  feeding_id?: string;
  error?: string;
  schedule_id: string;
}

// Schedule validation result
export interface ScheduleValidationResult {
  isValid: boolean;
  errors: string[];
}

// Schedule filter options
export interface ScheduleFilterOptions {
  baby_id?: string;
  is_active?: boolean;
  feeding_type?: "breast" | "formula" | "solid";
}

// Schedule sort options
export type ScheduleSortBy = "name" | "created_at" | "last_used_at" | "usage_count";

export interface ScheduleSortOptions {
  sort_by: ScheduleSortBy;
  order: "asc" | "desc";
}

// Constants for validation
export const SCHEDULE_VALIDATION_RULES = {
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 50,
  AMOUNT_MIN: 1,
  AMOUNT_MAX: 500,
  MAX_SCHEDULES_PER_BABY: 10,
} as const;

// Error messages for validation
export const SCHEDULE_ERROR_MESSAGES = {
  NAME_REQUIRED: "Schedule name is required",
  NAME_TOO_SHORT: `Schedule name must be at least ${SCHEDULE_VALIDATION_RULES.NAME_MIN_LENGTH} character`,
  NAME_TOO_LONG: `Schedule name must be ${SCHEDULE_VALIDATION_RULES.NAME_MAX_LENGTH} characters or less`,
  NAME_EXISTS: "A schedule with this name already exists",
  INVALID_FEEDING_TYPE: "Please select a valid feeding type",
  AMOUNT_REQUIRED_FOR_FORMULA: "Default amount is required for formula schedules",
  AMOUNT_TOO_LOW: `Amount must be at least ${SCHEDULE_VALIDATION_RULES.AMOUNT_MIN}ml`,
  AMOUNT_TOO_HIGH: `Amount must be ${SCHEDULE_VALIDATION_RULES.AMOUNT_MAX}ml or less`,
  AMOUNT_NOT_ALLOWED: "Default amount is only allowed for formula schedules",
  MAX_SCHEDULES_REACHED: `Maximum of ${SCHEDULE_VALIDATION_RULES.MAX_SCHEDULES_PER_BABY} active schedules allowed per baby`,
  TRIGGER_FAILED: "Failed to create feeding entry. Please try again.",
  NETWORK_ERROR: "Network error. Changes will be saved when connection is restored.",
  SCHEDULE_NOT_FOUND: "Schedule not found",
  SCHEDULE_INACTIVE: "Cannot trigger inactive schedule",
} as const;

/**
 * Type guard to check if a feeding type is valid for schedules
 */
export function isValidScheduleFeedingType(type: string): type is "breast" | "formula" | "solid" {
  return ["breast", "formula", "solid"].includes(type);
}

/**
 * Type guard to check if a schedule requires a default amount
 */
export function requiresDefaultAmount(feedingType: "breast" | "formula" | "solid"): boolean {
  return feedingType === "formula";
}

/**
 * Type guard to check if a schedule allows a default amount
 */
export function allowsDefaultAmount(feedingType: "breast" | "formula" | "solid"): boolean {
  return feedingType === "formula";
}

/**
 * Gets the display name for a schedule feeding type
 */
export function getScheduleFeedingTypeDisplayName(type: "breast" | "formula" | "solid"): string {
  switch (type) {
    case "breast":
      return "Breast";
    case "formula":
      return "Formula";
    case "solid":
      return "Solid Food";
    default:
      return "Unknown";
  }
}

/**
 * Gets the icon name for a schedule feeding type
 */
export function getScheduleFeedingTypeIcon(type: "breast" | "formula" | "solid"): string {
  switch (type) {
    case "breast":
      return "droplets";
    case "formula":
      return "flask-conical";
    case "solid":
      return "spoon";
    default:
      return "circle";
  }
}

/**
 * Formats the schedule display text
 */
export function formatScheduleDisplay(schedule: FeedingSchedule): string {
  const typeName = getScheduleFeedingTypeDisplayName(schedule.feeding_type);
  if (schedule.feeding_type === "formula" && schedule.default_amount) {
    return `${schedule.name} (${typeName} - ${schedule.default_amount}ml)`;
  }
  return `${schedule.name} (${typeName})`;
}

/**
 * Formats the last used time for display
 */
export function formatLastUsed(lastUsedAt: string | null | undefined): string {
  if (!lastUsedAt) return "Never used";
  
  const lastUsed = new Date(lastUsedAt);
  const now = new Date();
  const diffMs = now.getTime() - lastUsed.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return lastUsed.toLocaleDateString();
  }
}

/**
 * Calculates usage statistics for a schedule
 */
export function calculateUsageStats(schedule: FeedingSchedule): ScheduleUsageStats {
  const createdAt = new Date(schedule.created_at);
  
  let avgTimeBetweenUses = 0;
  if (schedule.usage_count > 1 && schedule.last_used_at) {
    const totalTimeMs = new Date(schedule.last_used_at).getTime() - createdAt.getTime();
    avgTimeBetweenUses = Math.floor(totalTimeMs / (schedule.usage_count - 1) / (1000 * 60)); // in minutes
  }
  
  return {
    schedule_id: schedule.id,
    total_uses: schedule.usage_count,
    last_used: schedule.last_used_at || null,
    success_rate: 100, // Assuming all triggers are successful for now
    avg_time_between_uses: avgTimeBetweenUses,
  };
}

/**
 * Sorts schedules by the specified criteria
 */
export function sortSchedules(
  schedules: FeedingSchedule[],
  sortBy: ScheduleSortBy = "name",
  order: "asc" | "desc" = "asc"
): FeedingSchedule[] {
  return [...schedules].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "created_at":
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case "last_used_at":
        const aLastUsed = a.last_used_at ? new Date(a.last_used_at).getTime() : 0;
        const bLastUsed = b.last_used_at ? new Date(b.last_used_at).getTime() : 0;
        comparison = aLastUsed - bLastUsed;
        break;
      case "usage_count":
        comparison = a.usage_count - b.usage_count;
        break;
    }
    
    return order === "desc" ? -comparison : comparison;
  });
}

/**
 * Filters schedules based on the provided criteria
 */
export function filterSchedules(
  schedules: FeedingSchedule[],
  filters: ScheduleFilterOptions
): FeedingSchedule[] {
  return schedules.filter(schedule => {
    if (filters.baby_id && schedule.baby_id !== filters.baby_id) return false;
    if (filters.is_active !== undefined && schedule.is_active !== filters.is_active) return false;
    if (filters.feeding_type && schedule.feeding_type !== filters.feeding_type) return false;
    return true;
  });
}

/**
 * Gets active schedules for a baby
 */
export function getActiveSchedules(schedules: FeedingSchedule[], babyId: string): FeedingSchedule[] {
  return filterSchedules(schedules, { baby_id: babyId, is_active: true });
}

/**
 * Gets schedules by feeding type
 */
export function getSchedulesByType(
  schedules: FeedingSchedule[],
  feedingType: "breast" | "formula" | "solid"
): FeedingSchedule[] {
  return filterSchedules(schedules, { feeding_type: feedingType });
}