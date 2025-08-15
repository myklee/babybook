import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  withRetry, 
  normalizeError, 
  validateBabySettings,
  ErrorCodes,
  FeedingScheduleError,
  createErrorContext
} from '../errorHandling'

// Mock the notifications composable
vi.mock('../composables/useNotifications', () => ({
  useNotifications: () => ({
    showError: vi.fn(),
    showWarning: vi.fn(),
    showSuccess: vi.fn(),
    showInfo: vi.fn()
  })
}))

describe('errorHandling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockFn = vi.fn().mockResolvedValue('success')
      
      const result = await withRetry(mockFn)
      
      expect(result).toBe('success')
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should retry on network errors', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue('success')
      
      const result = await withRetry(mockFn, { maxAttempts: 2, delay: 10 })
      
      expect(result).toBe('success')
      expect(mockFn).toHaveBeenCalledTimes(2)
    })

    it('should not retry on auth errors', async () => {
      const authError = { code: 'PGRST301', message: 'JWT expired' }
      const mockFn = vi.fn().mockRejectedValue(authError)
      
      await expect(withRetry(mockFn, { maxAttempts: 3 })).rejects.toEqual(authError)
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should respect maxAttempts', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('network error'))
      
      await expect(withRetry(mockFn, { maxAttempts: 2, delay: 10 })).rejects.toThrow('network error')
      expect(mockFn).toHaveBeenCalledTimes(2)
    })
  })

  describe('normalizeError', () => {
    it('should normalize database errors', () => {
      const dbError = { code: 'PGRST116', message: 'No rows found' }
      const context = createErrorContext('test', 'baby-123')
      
      const normalized = normalizeError(dbError, context)
      
      expect(normalized).toBeInstanceOf(FeedingScheduleError)
      expect(normalized.code).toBe(ErrorCodes.SETTINGS_NOT_FOUND)
      expect(normalized.context).toEqual(context)
    })

    it('should normalize auth errors', () => {
      const authError = { code: 'PGRST301', message: 'JWT expired' }
      
      const normalized = normalizeError(authError)
      
      expect(normalized.code).toBe(ErrorCodes.AUTH_ERROR)
      expect(normalized.message).toBe('Authentication expired. Please sign in again.')
    })

    it('should normalize network errors', () => {
      const networkError = new Error('fetch failed')
      
      const normalized = normalizeError(networkError)
      
      expect(normalized.code).toBe(ErrorCodes.NETWORK_ERROR)
      expect(normalized.message).toBe('Network connection error. Please check your internet connection.')
    })

    it('should handle unknown errors', () => {
      const unknownError = new Error('something weird happened')
      
      const normalized = normalizeError(unknownError)
      
      expect(normalized.code).toBe(ErrorCodes.UNKNOWN_ERROR)
      expect(normalized.message).toBe('something weird happened')
    })
  })

  describe('validateBabySettings', () => {
    it('should validate correct settings', () => {
      const settings = {
        feeding_interval_hours: 3,
        default_breast_amount: 120,
        default_formula_amount: 150,
        include_solids_in_schedule: true
      }
      
      const result = validateBabySettings(settings)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid feeding interval', () => {
      const settings = {
        feeding_interval_hours: 25 // Too high
      }
      
      const result = validateBabySettings(settings)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Feeding interval must be between 0.5 and 24 hours')
    })

    it('should reject negative amounts', () => {
      const settings = {
        default_breast_amount: -10,
        default_formula_amount: -5
      }
      
      const result = validateBabySettings(settings)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Default breast amount must be a positive number')
      expect(result.errors).toContain('Default formula amount must be a positive number')
    })

    it('should reject invalid boolean values', () => {
      const settings = {
        include_solids_in_schedule: 'yes' as any // Should be boolean
      }
      
      const result = validateBabySettings(settings)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Include solids setting must be true or false')
    })
  })

  describe('createErrorContext', () => {
    it('should create error context with all fields', () => {
      const context = createErrorContext('updateSettings', 'baby-123', 'user-456')
      
      expect(context.operation).toBe('updateSettings')
      expect(context.babyId).toBe('baby-123')
      expect(context.userId).toBe('user-456')
      expect(context.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should create context with optional fields', () => {
      const context = createErrorContext('loadData')
      
      expect(context.operation).toBe('loadData')
      expect(context.babyId).toBeUndefined()
      expect(context.userId).toBeUndefined()
      expect(context.timestamp).toBeDefined()
    })
  })
})