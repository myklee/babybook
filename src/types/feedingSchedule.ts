// Feeding schedule configuration types and interfaces
import type { FeedingType } from "./feeding";

// Feeding types that are relevant for schedule calculations by default
export type ScheduleRelevantFeedingType = "breast" | "formula" | "nursing";

// All feeding types including solids (using the main FeedingType)
export type AllFeedingType = FeedingType;

// Feeding schedule calculation options
export interface FeedingScheduleOptions {
  baby_id: string;
  include_solids: boolean;
  interval_hours: number;
}

// Configuration for feeding schedule calculations
export interface FeedingScheduleConfig {
  includesolids: boolean;
  intervalHours: number;
}

// Result of feeding schedule calculation
export interface FeedingScheduleResult {
  nextFeedingTime: Date | null;
  lastRelevantFeeding: Date | null;
  relevantFeedingTypes: AllFeedingType[];
}

// Feeding filter criteria
export interface FeedingFilterCriteria {
  babyId: string;
  includesolids: boolean;
  fromDate?: Date;
  toDate?: Date;
}

// Utility functions for feeding schedule calculations

/**
 * Get the feeding types that should be considered for schedule calculations
 * @param includesolids Whether to include solid foods in schedule calculations
 * @returns Array of feeding types to consider for scheduling
 */
export const getFeedingTypesForSchedule = (
  includesolids: boolean
): AllFeedingType[] => {
  const baseFeedingTypes: ScheduleRelevantFeedingType[] = [
    "breast",
    "formula", 
    "nursing",
  ];
  return includesolids ? [...baseFeedingTypes, "solid"] : baseFeedingTypes;
};

/**
 * Filter feedings to only include those relevant for schedule calculations
 * @param feedings Array of all feedings
 * @param includesolids Whether to include solid foods in schedule calculations
 * @returns Filtered array of schedule-relevant feedings
 */
export const getScheduleRelevantFeedings = <T extends { type: AllFeedingType }>(
  feedings: T[],
  includesolids: boolean
): T[] => {
  const relevantTypes = getFeedingTypesForSchedule(includesolids);
  return feedings.filter((feeding) => relevantTypes.includes(feeding.type));
};

/**
 * Calculate the next feeding time based on the last relevant feeding and interval
 * @param lastFeedings Array of feedings sorted by timestamp (most recent first)
 * @param intervalHours Feeding interval in hours
 * @param includesolids Whether to include solid foods in schedule calculations
 * @returns Next feeding time or null if no relevant feedings found
 */
export const calculateNextFeedingTime = <T extends { type: AllFeedingType; timestamp: string }>(
  lastFeedings: T[],
  intervalHours: number,
  includesolids: boolean
): Date | null => {
  const relevantFeedings = getScheduleRelevantFeedings(lastFeedings, includesolids);

  if (relevantFeedings.length === 0) return null;

  // Get the most recent schedule-relevant feeding
  const lastRelevantFeeding = relevantFeedings[0]; // Assuming sorted by timestamp desc
  const lastFeedingTime = new Date(lastRelevantFeeding.timestamp);

  // Add interval hours
  return new Date(lastFeedingTime.getTime() + intervalHours * 60 * 60 * 1000);
};