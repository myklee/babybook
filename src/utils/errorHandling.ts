import { useNotifications } from '../composables/useNotifications'

export interface RetryOptions {
  maxAttempts?: number
  delay?: number
  backoffMultiplier?: number
  shouldRetry?: (error: any, attempt: number) => boolean
}

export interface ErrorContext {
  operation: string
  babyId?: string
  userId?: string
  timestamp: string
}

export class FeedingScheduleError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: ErrorContext,
    public originalError?: any
  ) {
    super(message)
    this.name = 'FeedingScheduleError'
  }
}

export enum ErrorCodes {
  SETTINGS_NOT_FOUND = 'SETTINGS_NOT_FOUND',
  UPDATE_FAILED = 'UPDATE_FAILED',
  INVALID_BABY_ID = 'INVALID_BABY_ID',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoffMultiplier = 2,
    shouldRetry = (error, attempt) => {
      // Default retry logic: retry on network errors, not on auth/validation errors
      if (attempt >= maxAttempts) return false
      
      const errorMessage = error?.message?.toLowerCase() || ''
      const errorCode = error?.code || ''
      
      // Don't retry auth errors
      if (errorCode === 'PGRST301' || errorMessage.includes('jwt expired') || 
          errorMessage.includes('auth session missing') || errorMessage.includes('unauthorized')) {
        return false
      }
      
      // Don't retry validation errors
      if (errorCode.startsWith('23') || errorMessage.includes('validation')) {
        return false
      }
      
      // Retry network errors, timeouts, and server errors
      return errorMessage.includes('network') || 
             errorMessage.includes('timeout') || 
             errorMessage.includes('fetch') ||
             errorCode.startsWith('5') ||
             errorMessage.includes('connection')
    }
  } = options

  let lastError: any
  let currentDelay = delay

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      if (!shouldRetry(error, attempt)) {
        throw error
      }
      
      if (attempt < maxAttempts) {
        console.warn(`Attempt ${attempt} failed, retrying in ${currentDelay}ms:`, error)
        await new Promise(resolve => setTimeout(resolve, currentDelay))
        currentDelay *= backoffMultiplier
      }
    }
  }

  throw lastError
}

/**
 * Normalize errors into a consistent format
 */
export function normalizeError(error: any, context?: ErrorContext): FeedingScheduleError {
  if (error instanceof FeedingScheduleError) {
    return error
  }

  let code = ErrorCodes.UNKNOWN_ERROR
  let message = 'An unexpected error occurred'

  if (error?.code) {
    switch (error.code) {
      case 'PGRST116':
        code = ErrorCodes.SETTINGS_NOT_FOUND
        message = 'Baby settings not found'
        break
      case 'PGRST301':
        code = ErrorCodes.AUTH_ERROR
        message = 'Authentication expired. Please sign in again.'
        break
      case '23505':
        code = ErrorCodes.VALIDATION_ERROR
        message = 'Duplicate entry detected'
        break
      case '23503':
        code = ErrorCodes.INVALID_BABY_ID
        message = 'Invalid baby reference'
        break
      default:
        if (error.code.startsWith('23')) {
          code = ErrorCodes.VALIDATION_ERROR
          message = 'Data validation failed'
        } else if (error.code.startsWith('5')) {
          code = ErrorCodes.NETWORK_ERROR
          message = 'Server error occurred'
        }
    }
  } else if (error?.message) {
    const errorMessage = error.message.toLowerCase()
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('timeout')) {
      code = ErrorCodes.NETWORK_ERROR
      message = 'Network connection error. Please check your internet connection.'
    } else if (errorMessage.includes('auth') || errorMessage.includes('unauthorized')) {
      code = ErrorCodes.AUTH_ERROR
      message = 'Authentication error. Please sign in again.'
    } else if (errorMessage.includes('not found')) {
      code = ErrorCodes.SETTINGS_NOT_FOUND
      message = 'Settings not found'
    } else {
      message = error.message
    }
  }

  return new FeedingScheduleError(message, code, context, error)
}

/**
 * Handle errors with user-friendly notifications
 */
export function handleError(error: any, context?: ErrorContext): FeedingScheduleError {
  const normalizedError = normalizeError(error, context)
  const { showError, showWarning } = useNotifications()

  console.error('Error occurred:', {
    error: normalizedError,
    context,
    originalError: error
  })

  // Show appropriate user notification based on error type
  switch (normalizedError.code) {
    case ErrorCodes.NETWORK_ERROR:
      showError(
        'Connection Error',
        'Please check your internet connection and try again.',
        { persistent: false, duration: 6000 }
      )
      break
      
    case ErrorCodes.AUTH_ERROR:
      showError(
        'Authentication Error',
        'Your session has expired. Please sign in again.',
        { persistent: true }
      )
      break
      
    case ErrorCodes.SETTINGS_NOT_FOUND:
      showWarning(
        'Settings Missing',
        'Default settings will be created automatically.',
        { duration: 4000 }
      )
      break
      
    case ErrorCodes.VALIDATION_ERROR:
      showError(
        'Invalid Data',
        'Please check your input and try again.',
        { duration: 5000 }
      )
      break
      
    default:
      showError(
        'Error',
        normalizedError.message || 'Something went wrong. Please try again.',
        { duration: 5000 }
      )
  }

  return normalizedError
}

/**
 * Create error context for better debugging
 */
export function createErrorContext(
  operation: string,
  babyId?: string,
  userId?: string
): ErrorContext {
  return {
    operation,
    babyId,
    userId,
    timestamp: new Date().toISOString()
  }
}

/**
 * Validate baby settings input
 */
export function validateBabySettings(updates: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (updates.feeding_interval_hours !== undefined) {
    if (typeof updates.feeding_interval_hours !== 'number' || 
        updates.feeding_interval_hours < 0.5 || 
        updates.feeding_interval_hours > 24) {
      errors.push('Feeding interval must be between 0.5 and 24 hours')
    }
  }

  if (updates.default_breast_amount !== undefined) {
    if (typeof updates.default_breast_amount !== 'number' || 
        updates.default_breast_amount < 0) {
      errors.push('Default breast amount must be a positive number')
    }
  }

  if (updates.default_formula_amount !== undefined) {
    if (typeof updates.default_formula_amount !== 'number' || 
        updates.default_formula_amount < 0) {
      errors.push('Default formula amount must be a positive number')
    }
  }

  if (updates.include_solids_in_schedule !== undefined) {
    if (typeof updates.include_solids_in_schedule !== 'boolean') {
      errors.push('Include solids setting must be true or false')
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}