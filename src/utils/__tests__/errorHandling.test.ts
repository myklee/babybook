// Simple test structure without vitest dependency
import { 
  withRetry, 
  normalizeError, 
  validateBabySettings,
  ErrorCodes,
  FeedingScheduleError,
  createErrorContext
} from '../errorHandling'

// Simple mock functions
const mockFn = (returnValue?: any, shouldReject = false) => {
  let callCount = 0
  return {
    fn: () => {
      callCount++
      if (shouldReject) {
        return Promise.reject(returnValue || new Error('mock error'))
      }
      return Promise.resolve(returnValue || 'success')
    },
    getCallCount: () => callCount
  }
}

// Simple test functions for error handling utilities
export const testErrorHandling = async () => {
  console.log('🧪 Testing Error Handling Utilities...')
  
  const tests = [
    {
      name: 'withRetry should succeed on first attempt',
      test: async () => {
        const mock = mockFn('success')
        const result = await withRetry(mock.fn)
        return result === 'success' && mock.getCallCount() === 1
      }
    },
    {
      name: 'normalizeError should handle database errors',
      test: () => {
        const dbError = { code: 'PGRST116', message: 'No rows found' }
        const context = createErrorContext('test', 'baby-123')
        const normalized = normalizeError(dbError, context)
        return normalized instanceof FeedingScheduleError && 
               normalized.code === ErrorCodes.SETTINGS_NOT_FOUND
      }
    },
    {
      name: 'validateBabySettings should validate correct settings',
      test: () => {
        const settings = {
          feeding_interval_hours: 3,
          default_breast_amount: 120,
          default_formula_amount: 150,
          include_solids_in_schedule: true
        }
        const result = validateBabySettings(settings)
        return result.isValid === true && result.errors.length === 0
      }
    },
    {
      name: 'validateBabySettings should reject invalid settings',
      test: () => {
        const settings = {
          feeding_interval_hours: 25 // Too high
        }
        const result = validateBabySettings(settings)
        return result.isValid === false && result.errors.length > 0
      }
    },
    {
      name: 'createErrorContext should create proper context',
      test: () => {
        const context = createErrorContext('updateSettings', 'baby-123', 'user-456')
        return context.operation === 'updateSettings' &&
               context.babyId === 'baby-123' &&
               context.userId === 'user-456' &&
               typeof context.timestamp === 'string'
      }
    }
  ]
  
  let passed = 0
  const total = tests.length
  
  for (const test of tests) {
    try {
      const result = await test.test()
      if (result) {
        console.log(`  ✅ ${test.name}`)
        passed++
      } else {
        console.log(`  ❌ ${test.name}`)
      }
    } catch (error) {
      console.log(`  ❌ ${test.name} - Error: ${error}`)
    }
  }
  
  console.log(`\n📊 Error Handling Tests: ${passed}/${total} passed`)
  return { passed, total }
}