import type { Database } from "../lib/supabase";

// Base feeding type from database
type Feeding = Database["public"]["Tables"]["feedings"]["Row"];

// Breast selection type
export type BreastType = "left" | "right" | "both";

// Nursing session interface extending the base feeding type
export interface NursingSession extends Feeding {
  type: "nursing";
  start_time: string; // ISO timestamp - required for nursing
  end_time: string | null; // ISO timestamp or null if active
  breast_used: BreastType; // Required for nursing sessions
  amount: null; // Always null for nursing sessions
  left_duration: number; // Duration in seconds for left breast
  right_duration: number; // Duration in seconds for right breast
  total_duration: number; // Computed total duration (left + right)
}

// Active nursing session (computed properties)
export interface ActiveNursingSession extends NursingSession {
  end_time: null; // Always null for active sessions
  is_active: true;
  duration_minutes: number; // Real-time calculated duration
  elapsed_display: string; // Formatted duration for display (e.g., "15:32")
}

// Completed nursing session (computed properties)
export interface CompletedNursingSession extends NursingSession {
  end_time: string; // Always present for completed sessions
  is_active: false;
  duration_minutes: number; // Final calculated duration
  duration_display: string; // Formatted duration for display (e.g., "18 minutes")
}

// Breast timer state for individual timer management
export interface BreastTimerState {
  isActive: boolean;
  isPaused: boolean;
  startTime: Date | null;
  pausedDuration: number; // Total paused time in seconds
  currentDuration: number; // Current elapsed time in seconds
  lastPauseStart: Date | null; // When the timer was last paused
}

// Nursing session creation data (enhanced for dual-timer)
export interface CreateNursingSessionData {
  baby_id: string;
  left_duration: number; // Duration in seconds for left breast
  right_duration: number; // Duration in seconds for right breast
  breast_used?: BreastType; // Computed from durations if not provided
  notes?: string;
  start_time?: Date; // Optional, defaults to now
}

// Nursing session update data (enhanced for dual-timer)
export interface UpdateNursingSessionData {
  notes?: string;
  breast_used?: BreastType;
  end_time?: Date;
  left_duration?: number; // Duration in seconds for left breast
  right_duration?: number; // Duration in seconds for right breast
}

// Nursing analytics data (enhanced for dual-timer)
export interface NursingAnalytics {
  baby_id: string;
  date_range: {
    start: string;
    end: string;
  };
  total_sessions: number;
  total_duration_minutes: number;
  average_duration_minutes: number;
  breast_usage: {
    left: number;
    right: number;
    both: number;
    left_percentage: number;
    right_percentage: number;
    both_percentage: number;
    left_total_duration_minutes?: number; // Total time spent on left breast
    right_total_duration_minutes?: number; // Total time spent on right breast
  };
  daily_totals: Array<{
    date: string;
    sessions: number;
    duration_minutes: number;
    left_duration_minutes?: number; // Daily left breast duration
    right_duration_minutes?: number; // Daily right breast duration
  }>;
  session_patterns: {
    most_common_duration: number;
    longest_session: number;
    shortest_session: number;
    peak_hours: Array<{
      hour: number;
      session_count: number;
    }>;
    average_left_duration?: number; // Average duration for left breast sessions
    average_right_duration?: number; // Average duration for right breast sessions
  };
}

// Nursing insights and suggestions
export interface NursingInsights {
  baby_id: string;
  generated_at: string;
  insights: Array<{
    type: "pattern" | "suggestion" | "milestone" | "concern";
    title: string;
    description: string;
    data?: any;
    priority: "low" | "medium" | "high";
  }>;
}

// Date range for analytics
export interface DateRange {
  start: Date;
  end: Date;
}

// Nursing timer state
export interface NursingTimerState {
  baby_id: string;
  session_id: string | null;
  is_active: boolean;
  start_time: Date | null;
  breast_used: BreastType | null;
  elapsed_seconds: number;
  notes: string;
}

// Nursing session validation result
export interface NursingSessionValidation {
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

// Nursing session filters for queries
export interface NursingSessionFilters {
  baby_id?: string;
  date_range?: DateRange;
  breast_used?: BreastType;
  min_duration?: number;
  max_duration?: number;
  is_active?: boolean;
}

// Nursing session sort options
export type NursingSessionSortBy = 
  | "start_time" 
  | "duration" 
  | "breast_used" 
  | "created_at";

export interface NursingSessionSortOptions {
  sort_by: NursingSessionSortBy;
  order: "asc" | "desc";
}

// Utility type for nursing session queries
export interface NursingSessionQuery {
  filters?: NursingSessionFilters;
  sort?: NursingSessionSortOptions;
  limit?: number;
  offset?: number;
}

// Nursing session export data
export interface NursingSessionExport {
  sessions: CompletedNursingSession[];
  analytics: NursingAnalytics;
  export_date: string;
  baby_name: string;
  date_range: DateRange;
}

// Utility functions for dual-timer nursing sessions

/**
 * Determines breast usage based on left and right durations
 */
export function computeBreastUsed(leftDuration: number, rightDuration: number): BreastType {
  if (leftDuration > 0 && rightDuration > 0) {
    return 'both';
  } else if (leftDuration > 0) {
    return 'left';
  } else if (rightDuration > 0) {
    return 'right';
  } else {
    throw new Error('At least one breast duration must be greater than 0');
  }
}

/**
 * Validates dual-timer nursing session data (enhanced for automatic timing)
 */
export function validateDualTimerNursingSession(
  leftDuration: number,
  rightDuration: number,
  startTime?: Date
): NursingSessionValidation {
  const errors: Array<{ field: string; message: string }> = [];
  const warnings: Array<{ field: string; message: string }> = [];

  // Required: At least one breast must have duration
  if (leftDuration === 0 && rightDuration === 0) {
    errors.push({
      field: 'duration',
      message: 'At least one breast timer must have a duration greater than 0'
    });
  }

  // Validate duration values are non-negative
  if (leftDuration < 0) {
    errors.push({
      field: 'left_duration',
      message: 'Left breast duration cannot be negative'
    });
  }

  if (rightDuration < 0) {
    errors.push({
      field: 'right_duration',
      message: 'Right breast duration cannot be negative'
    });
  }

  // Validate start time if provided (automatic timing validation)
  if (startTime) {
    const now = new Date();
    const totalDuration = leftDuration + rightDuration;
    const calculatedEndTime = new Date(startTime.getTime() + (totalDuration * 1000));
    
    // Error: Start time cannot be in the future
    if (startTime > now) {
      errors.push({
        field: 'start_time',
        message: 'Session start time cannot be in the future'
      });
    }
    
    // Error: Calculated end time cannot be in the future
    if (calculatedEndTime > now) {
      errors.push({
        field: 'timing',
        message: 'Session duration extends beyond current time'
      });
    }
    
    // Warning: Session started more than 24 hours ago
    const hoursAgo = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    if (hoursAgo > 24) {
      warnings.push({
        field: 'start_time',
        message: 'Session started more than 24 hours ago'
      });
    }
  }

  // Warning: Individual breast duration over 60 minutes (3600 seconds)
  if (leftDuration > 3600) {
    warnings.push({
      field: 'left_duration',
      message: 'Left breast duration is over 60 minutes'
    });
  }

  if (rightDuration > 3600) {
    warnings.push({
      field: 'right_duration',
      message: 'Right breast duration is over 60 minutes'
    });
  }

  // Warning: Total session over 2 hours (7200 seconds)
  const totalDuration = leftDuration + rightDuration;
  if (totalDuration > 7200) {
    warnings.push({
      field: 'total_duration',
      message: 'Total nursing session is over 2 hours'
    });
  }

  // Warning: Very short session (less than 30 seconds)
  if (totalDuration > 0 && totalDuration < 30) {
    warnings.push({
      field: 'total_duration',
      message: 'This is a very short nursing session'
    });
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Calculates current duration for a breast timer
 */
export function calculateTimerDuration(timer: BreastTimerState): number {
  if (!timer.startTime) return 0;
  
  const now = new Date();
  const elapsed = now.getTime() - timer.startTime.getTime();
  const totalPaused = timer.pausedDuration * 1000; // Convert to milliseconds
  const currentPause = timer.lastPauseStart && timer.isPaused
    ? now.getTime() - timer.lastPauseStart.getTime() 
    : 0;
  
  return Math.max(0, Math.floor((elapsed - totalPaused - currentPause) / 1000));
}

/**
 * Formats duration in seconds to MM:SS format
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Creates initial breast timer state
 */
export function createInitialTimerState(): BreastTimerState {
  return {
    isActive: false,
    isPaused: false,
    startTime: null,
    pausedDuration: 0,
    currentDuration: 0,
    lastPauseStart: null
  };
}