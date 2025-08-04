// Pumping session interface
export interface PumpingSession {
  id: string;
  baby_id: string | null; // Optional - pumping sessions are account-level
  user_id: string;
  start_time: string; // ISO timestamp
  end_time: string; // ISO timestamp
  left_duration: number; // seconds
  right_duration: number; // seconds
  total_duration: number; // seconds (computed)
  left_amount: number | null; // ml pumped from left breast
  right_amount: number | null; // ml pumped from right breast
  total_amount: number; // ml total amount pumped (computed)
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Pumping session creation data
export interface CreatePumpingSessionData {
  baby_id?: string | null; // Optional - pumping sessions are account-level
  left_duration: number; // Duration in seconds for left breast
  right_duration: number; // Duration in seconds for right breast
  left_amount?: number | null; // Amount in ml for left breast
  right_amount?: number | null; // Amount in ml for right breast
  notes?: string;
  start_time?: Date; // Optional, defaults to calculated time based on duration
}

// Pumping session update data
export interface UpdatePumpingSessionData {
  left_duration?: number;
  right_duration?: number;
  total_duration?: number;
  left_amount?: number | null;
  right_amount?: number | null;
  total_amount?: number;
  notes?: string;
  start_time?: Date;
  end_time?: Date;
}

// Pumping event for timeline display
export interface PumpingEvent {
  id: string;
  baby_id: string | null; // Optional - pumping sessions are account-level
  start_time: string;
  end_time: string;
  total_duration: number;
  total_amount: number;
  left_duration: number;
  right_duration: number;
  left_amount: number | null;
  right_amount: number | null;
  notes: string | null;
  type: "pumping";
}

// Pumping session validation result
export interface PumpingSessionValidation {
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

// Pumping session filters for queries
export interface PumpingSessionFilters {
  baby_id?: string;
  date_range?: {
    start: Date;
    end: Date;
  };
  min_duration?: number;
  max_duration?: number;
  min_amount?: number;
  max_amount?: number;
}

// Pumping session sort options
export type PumpingSessionSortBy = 
  | "start_time" 
  | "total_duration" 
  | "total_amount"
  | "created_at";

export interface PumpingSessionSortOptions {
  sort_by: PumpingSessionSortBy;
  order: "asc" | "desc";
}

// Utility type for pumping session queries
export interface PumpingSessionQuery {
  filters?: PumpingSessionFilters;
  sort?: PumpingSessionSortOptions;
  limit?: number;
  offset?: number;
}

// Pumping analytics data
export interface PumpingAnalytics {
  baby_id: string;
  date_range: {
    start: string;
    end: string;
  };
  total_sessions: number;
  total_duration_minutes: number;
  total_amount_ml: number;
  average_duration_minutes: number;
  average_amount_ml: number;
  breast_usage: {
    left_sessions: number;
    right_sessions: number;
    both_sessions: number;
    left_total_amount: number;
    right_total_amount: number;
    left_average_amount: number;
    right_average_amount: number;
  };
  daily_totals: Array<{
    date: string;
    sessions: number;
    duration_minutes: number;
    amount_ml: number;
  }>;
  session_patterns: {
    most_common_duration: number;
    longest_session: number;
    shortest_session: number;
    highest_amount: number;
    lowest_amount: number;
    peak_hours: Array<{
      hour: number;
      session_count: number;
    }>;
  };
}

/**
 * Validates pumping session data
 */
export function validatePumpingSession(
  leftDuration: number,
  rightDuration: number,
  leftAmount?: number | null,
  rightAmount?: number | null,
  startTime?: Date
): PumpingSessionValidation {
  const errors: Array<{ field: string; message: string }> = [];
  const warnings: Array<{ field: string; message: string }> = [];

  // Required: At least one breast must have duration
  if (leftDuration === 0 && rightDuration === 0) {
    errors.push({
      field: 'duration',
      message: 'At least one breast must have a duration greater than 0'
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

  // Validate amounts are non-negative if provided
  if (leftAmount !== null && leftAmount !== undefined && leftAmount < 0) {
    errors.push({
      field: 'left_amount',
      message: 'Left breast amount cannot be negative'
    });
  }

  if (rightAmount !== null && rightAmount !== undefined && rightAmount < 0) {
    errors.push({
      field: 'right_amount',
      message: 'Right breast amount cannot be negative'
    });
  }

  // Validate start time if provided
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
      message: 'Total pumping session is over 2 hours'
    });
  }

  // Warning: Very short session (less than 30 seconds)
  if (totalDuration > 0 && totalDuration < 30) {
    warnings.push({
      field: 'total_duration',
      message: 'This is a very short pumping session'
    });
  }

  // Warning: High amount for single session (over 300ml total)
  const totalAmount = (leftAmount || 0) + (rightAmount || 0);
  if (totalAmount > 300) {
    warnings.push({
      field: 'total_amount',
      message: 'This is a very high amount for a single pumping session'
    });
  }

  // Warning: Duration without amount recorded
  if (totalDuration > 0 && totalAmount === 0) {
    warnings.push({
      field: 'amount',
      message: 'Consider recording the amount pumped for better tracking'
    });
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Formats duration in seconds to MM:SS format
 */
export function formatPumpingDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Formats amount with unit
 */
export function formatPumpingAmount(amount: number | null): string {
  if (amount === null || amount === 0) return '0ml';
  return `${amount}ml`;
}

/**
 * Creates a pumping event from a pumping session for timeline display
 */
export function createPumpingEvent(session: PumpingSession): PumpingEvent {
  return {
    id: session.id,
    baby_id: session.baby_id,
    start_time: session.start_time,
    end_time: session.end_time,
    total_duration: session.total_duration,
    total_amount: session.total_amount,
    left_duration: session.left_duration,
    right_duration: session.right_duration,
    left_amount: session.left_amount,
    right_amount: session.right_amount,
    notes: session.notes,
    type: "pumping"
  };
}