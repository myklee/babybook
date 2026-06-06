// Validation functions for feeding schedule data
import type {
  FeedingSchedule,
  CreateFeedingScheduleData,
  UpdateFeedingScheduleData,
  ScheduleValidationResult,
} from "../types/feedingScheduleAutomation";
import {
  SCHEDULE_VALIDATION_RULES,
  SCHEDULE_ERROR_MESSAGES,
  isValidScheduleFeedingType,
  requiresDefaultAmount,
  allowsDefaultAmount,
} from "../types/feedingScheduleAutomation";

/**
 * Validates schedule name
 */
export function validateScheduleName(name: string, existingNames: string[] = []): string[] {
  const errors: string[] = [];
  
  if (!name || name.trim().length === 0) {
    errors.push(SCHEDULE_ERROR_MESSAGES.NAME_REQUIRED);
    return errors;
  }
  
  const trimmedName = name.trim();
  
  if (trimmedName.length < SCHEDULE_VALIDATION_RULES.NAME_MIN_LENGTH) {
    errors.push(SCHEDULE_ERROR_MESSAGES.NAME_TOO_SHORT);
  }
  
  if (trimmedName.length > SCHEDULE_VALIDATION_RULES.NAME_MAX_LENGTH) {
    errors.push(SCHEDULE_ERROR_MESSAGES.NAME_TOO_LONG);
  }
  
  if (existingNames.includes(trimmedName)) {
    errors.push(SCHEDULE_ERROR_MESSAGES.NAME_EXISTS);
  }
  
  return errors;
}

/**
 * Validates feeding type
 */
export function validateFeedingType(feedingType: string): string[] {
  const errors: string[] = [];
  
  if (!isValidScheduleFeedingType(feedingType)) {
    errors.push(SCHEDULE_ERROR_MESSAGES.INVALID_FEEDING_TYPE);
  }
  
  return errors;
}

/**
 * Validates default amount
 */
export function validateDefaultAmount(
  amount: number | undefined,
  feedingType: "breast" | "formula" | "solid"
): string[] {
  const errors: string[] = [];
  
  // Check if amount is required for this feeding type
  if (requiresDefaultAmount(feedingType) && (amount === undefined || amount === null)) {
    errors.push(SCHEDULE_ERROR_MESSAGES.AMOUNT_REQUIRED_FOR_FORMULA);
    return errors;
  }
  
  // Check if amount is not allowed for this feeding type
  if (!allowsDefaultAmount(feedingType) && amount !== undefined && amount !== null) {
    errors.push(SCHEDULE_ERROR_MESSAGES.AMOUNT_NOT_ALLOWED);
    return errors;
  }
  
  // Validate amount value if provided
  if (amount !== undefined && amount !== null) {
    if (amount < SCHEDULE_VALIDATION_RULES.AMOUNT_MIN) {
      errors.push(SCHEDULE_ERROR_MESSAGES.AMOUNT_TOO_LOW);
    }
    
    if (amount > SCHEDULE_VALIDATION_RULES.AMOUNT_MAX) {
      errors.push(SCHEDULE_ERROR_MESSAGES.AMOUNT_TOO_HIGH);
    }
  }
  
  return errors;
}

/**
 * Validates schedule creation data
 */
export function validateCreateScheduleData(
  data: CreateFeedingScheduleData,
  existingSchedules: FeedingSchedule[] = []
): ScheduleValidationResult {
  const errors: string[] = [];
  
  // Check maximum schedules limit
  const activeSchedulesCount = existingSchedules.filter(
    s => s.baby_id === data.baby_id && s.is_active
  ).length;
  
  if (activeSchedulesCount >= SCHEDULE_VALIDATION_RULES.MAX_SCHEDULES_PER_BABY) {
    errors.push(SCHEDULE_ERROR_MESSAGES.MAX_SCHEDULES_REACHED);
  }
  
  // Get existing schedule names for this baby
  const existingNames = existingSchedules
    .filter(s => s.baby_id === data.baby_id)
    .map(s => s.name);
  
  // Validate individual fields
  errors.push(...validateScheduleName(data.name, existingNames));
  errors.push(...validateFeedingType(data.feeding_type));
  errors.push(...validateDefaultAmount(data.default_amount, data.feeding_type));
  
  // Validate baby_id
  if (!data.baby_id || data.baby_id.trim().length === 0) {
    errors.push("Baby ID is required");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates schedule update data
 */
export function validateUpdateScheduleData(
  data: UpdateFeedingScheduleData,
  currentSchedule: FeedingSchedule,
  existingSchedules: FeedingSchedule[] = []
): ScheduleValidationResult {
  const errors: string[] = [];
  
  // Get existing schedule names for this baby (excluding current schedule)
  const existingNames = existingSchedules
    .filter(s => s.baby_id === currentSchedule.baby_id && s.id !== currentSchedule.id)
    .map(s => s.name);
  
  // Validate fields that are being updated
  if (data.name !== undefined) {
    errors.push(...validateScheduleName(data.name, existingNames));
  }
  
  if (data.feeding_type !== undefined) {
    errors.push(...validateFeedingType(data.feeding_type));
  }
  
  // For default amount validation, use the new feeding type if provided, otherwise use current
  const feedingTypeForValidation = data.feeding_type || currentSchedule.feeding_type;
  if (data.default_amount !== undefined || data.feeding_type !== undefined) {
    const amountToValidate = data.default_amount !== undefined 
      ? data.default_amount 
      : currentSchedule.default_amount;
    errors.push(...validateDefaultAmount(amountToValidate, feedingTypeForValidation));
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates if a schedule can be triggered
 */
export function validateScheduleTrigger(schedule: FeedingSchedule): ScheduleValidationResult {
  const errors: string[] = [];
  
  if (!schedule.is_active) {
    errors.push(SCHEDULE_ERROR_MESSAGES.SCHEDULE_INACTIVE);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitizes schedule name by trimming whitespace
 */
export function sanitizeScheduleName(name: string): string {
  return name.trim();
}

/**
 * Sanitizes create schedule data
 */
export function sanitizeCreateScheduleData(data: CreateFeedingScheduleData): CreateFeedingScheduleData {
  return {
    ...data,
    name: sanitizeScheduleName(data.name),
    baby_id: data.baby_id.trim(),
  };
}

/**
 * Sanitizes update schedule data
 */
export function sanitizeUpdateScheduleData(data: UpdateFeedingScheduleData): UpdateFeedingScheduleData {
  const sanitized: UpdateFeedingScheduleData = { ...data };
  
  if (sanitized.name !== undefined) {
    sanitized.name = sanitizeScheduleName(sanitized.name);
  }
  
  return sanitized;
}

/**
 * Validates and sanitizes create schedule data
 */
export function validateAndSanitizeCreateData(
  data: CreateFeedingScheduleData,
  existingSchedules: FeedingSchedule[] = []
): { data: CreateFeedingScheduleData; validation: ScheduleValidationResult } {
  const sanitizedData = sanitizeCreateScheduleData(data);
  const validation = validateCreateScheduleData(sanitizedData, existingSchedules);
  
  return {
    data: sanitizedData,
    validation,
  };
}

/**
 * Validates and sanitizes update schedule data
 */
export function validateAndSanitizeUpdateData(
  data: UpdateFeedingScheduleData,
  currentSchedule: FeedingSchedule,
  existingSchedules: FeedingSchedule[] = []
): { data: UpdateFeedingScheduleData; validation: ScheduleValidationResult } {
  const sanitizedData = sanitizeUpdateScheduleData(data);
  const validation = validateUpdateScheduleData(sanitizedData, currentSchedule, existingSchedules);
  
  return {
    data: sanitizedData,
    validation,
  };
}

/**
 * Gets validation error message for display
 */
export function getValidationErrorMessage(errors: string[]): string {
  if (errors.length === 0) return "";
  if (errors.length === 1) return errors[0];
  return `Multiple errors: ${errors.join(", ")}`;
}

/**
 * Checks if a schedule name is unique for a baby
 */
export function isScheduleNameUnique(
  name: string,
  babyId: string,
  existingSchedules: FeedingSchedule[],
  excludeScheduleId?: string
): boolean {
  const trimmedName = name.trim();
  return !existingSchedules.some(
    s => s.baby_id === babyId && 
         s.name === trimmedName && 
         s.id !== excludeScheduleId
  );
}

/**
 * Gets the maximum number of active schedules allowed per baby
 */
export function getMaxSchedulesPerBaby(): number {
  return SCHEDULE_VALIDATION_RULES.MAX_SCHEDULES_PER_BABY;
}

/**
 * Checks if a baby can have more active schedules
 */
export function canAddMoreSchedules(babyId: string, existingSchedules: FeedingSchedule[]): boolean {
  const activeCount = existingSchedules.filter(
    s => s.baby_id === babyId && s.is_active
  ).length;
  return activeCount < SCHEDULE_VALIDATION_RULES.MAX_SCHEDULES_PER_BABY;
}

/**
 * Gets the count of active schedules for a baby
 */
export function getActiveScheduleCount(babyId: string, existingSchedules: FeedingSchedule[]): number {
  return existingSchedules.filter(
    s => s.baby_id === babyId && s.is_active
  ).length;
}