// Main type exports for the application

// Database types
export type { Database } from "../lib/supabase";

// Feeding types
export type {
  Feeding,
  FeedingType,
  FeedingEvent,
  BaseFeedingEvent,
  BreastFeedingEvent,
  FormulaFeedingEvent,
  PopulatedFeedingEvent,
  CreateFeedingEventData,
  UpdateFeedingEventData,
  FeedingEventFilters,
  FeedingEventSortBy,
  FeedingEventSortOptions,
  FeedingEventQuery,
  FeedingStatistics,
  FeedingScheduleInfo
} from "./feeding";

export {
  isBreastFeedingEvent,
  isFormulaFeedingEvent,
  isNursingSession,
  hasVolume,
  hasDuration,
  getFeedingTypeDisplayName,
  getFeedingTypeIcon,
  formatFeedingAmount,
  formatFeedingDuration,
  getFeedingSummary,
  calculateTotalVolume,
  calculateTotalDuration,
  groupFeedingsByType,
  filterFeedingsByDateRange,
  sortFeedingsByTimestamp
} from "./feeding";

// Solid food types
export type {
  UserFoodItem,
  SolidFoodEvent,
  SolidFeedingEvent,
  FoodStats,
  CreateUserFoodItemData,
  UpdateUserFoodItemData,
  CreateSolidFoodEventData,
  UpdateSolidFoodEventData,
  FoodSearchResult,
  FoodConsumptionAnalytics,
  FoodItemValidation,
  SolidFoodEventValidation,
  FoodItemFilters,
  FoodItemSortBy,
  FoodItemSortOptions,
  FoodItemQuery,
  SolidFoodEventFilters,
  SolidFoodEventSortBy,
  SolidFoodEventSortOptions,
  SolidFoodEventQuery,
  FoodUsageInfo
} from "./solidFood";

export {
  validateFoodItem,
  validateSolidFoodEvent,
  formatFoodNames,
  calculateFoodStats,
  createSolidFeedingEvent
} from "./solidFood";

// Nursing types
export type {
  BreastType,
  NursingSession,
  ActiveNursingSession,
  CompletedNursingSession,
  BreastTimerState,
  CreateNursingSessionData,
  UpdateNursingSessionData,
  NursingAnalytics,
  NursingInsights,
  DateRange,
  NursingTimerState,
  NursingSessionValidation,
  NursingSessionFilters,
  NursingSessionSortBy,
  NursingSessionSortOptions,
  NursingSessionQuery,
  NursingSessionExport
} from "./nursing";

export {
  computeBreastUsed,
  validateDualTimerNursingSession,
  calculateTimerDuration,
  formatDuration,
  createInitialTimerState
} from "./nursing";

// Pumping types
export type {
  PumpingSession,
  CreatePumpingSessionData,
  UpdatePumpingSessionData,
  PumpingEvent,
  PumpingSessionValidation,
  PumpingSessionFilters,
  PumpingSessionSortBy,
  PumpingSessionSortOptions,
  PumpingSessionQuery,
  PumpingAnalytics
} from "./pumping";

export {
  validatePumpingSession,
  formatPumpingDuration,
  formatPumpingAmount,
  createPumpingEvent
} from "./pumping";

// Feeding schedule types
export type {
  ScheduleRelevantFeedingType,
  AllFeedingType,
  FeedingScheduleOptions,
  FeedingScheduleConfig,
  FeedingScheduleResult,
  FeedingFilterCriteria
} from "./feedingSchedule";

export {
  getFeedingTypesForSchedule,
  getScheduleRelevantFeedings,
  calculateNextFeedingTime
} from "./feedingSchedule";

// Type guards and validation
export {
  isSolidFeedingEvent,
  isUserFoodItem,
  isSolidFoodEvent,
  hasSolidFoodEventStructure,
  validateUserFoodItemRow,
  validateSolidFoodEventRow,
  convertUserFoodItemRow,
  convertSolidFoodEventRow,
  validateSolidFeedingRecord,
  areAllUserFoodItems,
  areAllSolidFoodEvents
} from "./typeGuards";