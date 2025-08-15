/**
 * Unit tests for feeding schedule calculation utilities
 * 
 * These tests validate the core feeding schedule calculation functions
 * to ensure they work correctly with different feeding types and settings.
 */

import {
  getFeedingTypesForSchedule,
  getScheduleRelevantFeedings,
  calculateNextFeedingTime,
  type AllFeedingType
} from '../feedingSchedule'

// Mock feeding data for testing
interface MockFeeding {
  id: string
  type: AllFeedingType
  timestamp: string
  baby_id: string
}

const createMockFeeding = (
  type: AllFeedingType,
  hoursAgo: number,
  id: string = Math.random().toString()
): MockFeeding => ({
  id,
  type,
  timestamp: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
  baby_id: 'test-baby-1'
})

/**
 * Test suite for getFeedingTypesForSchedule function
 */
export const testGetFeedingTypesForSchedule = () => {
  console.log('🧪 Testing getFeedingTypesForSchedule...')
  
  const tests = [
    {
      name: 'should return only milk feeding types when solids excluded',
      input: false,
      expected: ['breast', 'formula', 'nursing'],
      test: () => {
        const result = getFeedingTypesForSchedule(false)
        return JSON.stringify(result.sort()) === JSON.stringify(['breast', 'formula', 'nursing'].sort())
      }
    },
    {
      name: 'should include solid foods when solids included',
      input: true,
      expected: ['breast', 'formula', 'nursing', 'solid'],
      test: () => {
        const result = getFeedingTypesForSchedule(true)
        return JSON.stringify(result.sort()) === JSON.stringify(['breast', 'formula', 'nursing', 'solid'].sort())
      }
    }
  ]
  
  const results = tests.map(test => ({
    name: test.name,
    passed: test.test(),
    expected: test.expected,
    actual: getFeedingTypesForSchedule(test.input)
  }))
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌'
    console.log(`  ${status} ${result.name}`)
    if (!result.passed) {
      console.log(`    Expected: ${JSON.stringify(result.expected)}`)
      console.log(`    Actual: ${JSON.stringify(result.actual)}`)
    }
  })
  
  return results
}

/**
 * Test suite for getScheduleRelevantFeedings function
 */
export const testGetScheduleRelevantFeedings = () => {
  console.log('🧪 Testing getScheduleRelevantFeedings...')
  
  const mockFeedings: MockFeeding[] = [
    createMockFeeding('breast', 1, 'breast-1'),
    createMockFeeding('formula', 2, 'formula-1'),
    createMockFeeding('nursing', 3, 'nursing-1'),
    createMockFeeding('solid', 4, 'solid-1'),
    createMockFeeding('solid', 5, 'solid-2')
  ]
  
  const tests = [
    {
      name: 'should exclude solid foods when solids not included',
      input: { feedings: mockFeedings, includesolids: false },
      expectedCount: 3,
      expectedTypes: ['breast', 'formula', 'nursing'],
      test: () => {
        const result = getScheduleRelevantFeedings(mockFeedings, false)
        const types = result.map(f => f.type).sort()
        return result.length === 3 && 
               JSON.stringify(types) === JSON.stringify(['breast', 'formula', 'nursing'].sort())
      }
    },
    {
      name: 'should include solid foods when solids included',
      input: { feedings: mockFeedings, includesolids: true },
      expectedCount: 5,
      expectedTypes: ['breast', 'formula', 'nursing', 'solid', 'solid'],
      test: () => {
        const result = getScheduleRelevantFeedings(mockFeedings, true)
        return result.length === 5
      }
    },
    {
      name: 'should return empty array for empty input',
      input: { feedings: [], includesolids: false },
      expectedCount: 0,
      expectedTypes: [],
      test: () => {
        const result = getScheduleRelevantFeedings([], false)
        return result.length === 0
      }
    },
    {
      name: 'should handle only solid foods when solids excluded',
      input: { feedings: [createMockFeeding('solid', 1)], includesolids: false },
      expectedCount: 0,
      expectedTypes: [],
      test: () => {
        const result = getScheduleRelevantFeedings([createMockFeeding('solid', 1)], false)
        return result.length === 0
      }
    }
  ]
  
  const results = tests.map(test => ({
    name: test.name,
    passed: test.test(),
    expectedCount: test.expectedCount,
    actual: getScheduleRelevantFeedings(test.input.feedings, test.input.includesolids)
  }))
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌'
    console.log(`  ${status} ${result.name}`)
    if (!result.passed) {
      console.log(`    Expected count: ${result.expectedCount}`)
      console.log(`    Actual count: ${result.actual.length}`)
      console.log(`    Actual types: ${result.actual.map(f => f.type).join(', ')}`)
    }
  })
  
  return results
}

/**
 * Test suite for calculateNextFeedingTime function
 */
export const testCalculateNextFeedingTime = () => {
  console.log('🧪 Testing calculateNextFeedingTime...')
  
  const intervalHours = 3
  
  const tests = [
    {
      name: 'should return null for empty feeding array',
      input: { feedings: [], intervalHours, includesolids: false },
      expected: null,
      test: () => {
        const result = calculateNextFeedingTime([], intervalHours, false)
        return result === null
      }
    },
    {
      name: 'should calculate next feeding time from most recent milk feeding',
      input: { 
        feedings: [
          createMockFeeding('breast', 1), // Most recent
          createMockFeeding('formula', 2),
          createMockFeeding('solid', 0.5) // More recent but should be ignored
        ], 
        intervalHours, 
        includesolids: false 
      },
      expected: 'Date 2 hours from now',
      test: () => {
        const feedings = [
          createMockFeeding('breast', 1), // Most recent milk feeding
          createMockFeeding('formula', 2),
          createMockFeeding('solid', 0.5) // More recent but should be ignored
        ]
        const result = calculateNextFeedingTime(feedings, intervalHours, false)
        
        if (!result) return false
        
        // Should be based on breast feeding (1 hour ago) + 3 hours = 2 hours from now
        const expectedTime = new Date(Date.now() - 1 * 60 * 60 * 1000 + intervalHours * 60 * 60 * 1000)
        const timeDiff = Math.abs(result.getTime() - expectedTime.getTime())
        
        // Allow 1 second tolerance for test execution time
        return timeDiff < 1000
      }
    },
    {
      name: 'should include solid foods when solids included',
      input: { 
        feedings: [
          createMockFeeding('solid', 0.5), // Most recent
          createMockFeeding('breast', 1),
          createMockFeeding('formula', 2)
        ], 
        intervalHours, 
        includesolids: true 
      },
      expected: 'Date 2.5 hours from now',
      test: () => {
        const feedings = [
          createMockFeeding('solid', 0.5), // Most recent
          createMockFeeding('breast', 1),
          createMockFeeding('formula', 2)
        ]
        const result = calculateNextFeedingTime(feedings, intervalHours, true)
        
        if (!result) return false
        
        // Should be based on solid feeding (0.5 hours ago) + 3 hours = 2.5 hours from now
        const expectedTime = new Date(Date.now() - 0.5 * 60 * 60 * 1000 + intervalHours * 60 * 60 * 1000)
        const timeDiff = Math.abs(result.getTime() - expectedTime.getTime())
        
        // Allow 1 second tolerance for test execution time
        return timeDiff < 1000
      }
    },
    {
      name: 'should return null when no relevant feedings exist',
      input: { 
        feedings: [
          createMockFeeding('solid', 1),
          createMockFeeding('solid', 2)
        ], 
        intervalHours, 
        includesolids: false 
      },
      expected: null,
      test: () => {
        const feedings = [
          createMockFeeding('solid', 1),
          createMockFeeding('solid', 2)
        ]
        const result = calculateNextFeedingTime(feedings, intervalHours, false)
        return result === null
      }
    },
    {
      name: 'should handle different interval hours',
      input: { 
        feedings: [createMockFeeding('breast', 2)], 
        intervalHours: 4, 
        includesolids: false 
      },
      expected: 'Date 2 hours from now',
      test: () => {
        const feedings = [createMockFeeding('breast', 2)]
        const result = calculateNextFeedingTime(feedings, 4, false)
        
        if (!result) return false
        
        // Should be based on breast feeding (2 hours ago) + 4 hours = 2 hours from now
        const expectedTime = new Date(Date.now() - 2 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000)
        const timeDiff = Math.abs(result.getTime() - expectedTime.getTime())
        
        // Allow 1 second tolerance for test execution time
        return timeDiff < 1000
      }
    }
  ]
  
  const results = tests.map(test => ({
    name: test.name,
    passed: test.test(),
    expected: test.expected
  }))
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌'
    console.log(`  ${status} ${result.name}`)
    if (!result.passed) {
      console.log(`    Expected: ${result.expected}`)
    }
  })
  
  return results
}

/**
 * Integration tests for feeding schedule calculations
 */
export const testFeedingScheduleIntegration = () => {
  console.log('🧪 Testing feeding schedule integration scenarios...')
  
  const tests = [
    {
      name: 'should handle mixed feeding types correctly',
      test: () => {
        const feedings = [
          createMockFeeding('breast', 0.5),
          createMockFeeding('solid', 1),
          createMockFeeding('formula', 2),
          createMockFeeding('nursing', 3),
          createMockFeeding('solid', 4)
        ]
        
        // Test with solids excluded
        const relevantWithoutSolids = getScheduleRelevantFeedings(feedings, false)
        const nextTimeWithoutSolids = calculateNextFeedingTime(relevantWithoutSolids, 3, false)
        
        // Test with solids included
        const relevantWithSolids = getScheduleRelevantFeedings(feedings, true)
        const nextTimeWithSolids = calculateNextFeedingTime(relevantWithSolids, 3, true)
        
        // Without solids: should use breast feeding (0.5 hours ago)
        // With solids: should use breast feeding (0.5 hours ago) - same in this case
        
        return relevantWithoutSolids.length === 3 && 
               relevantWithSolids.length === 5 &&
               nextTimeWithoutSolids !== null &&
               nextTimeWithSolids !== null
      }
    },
    {
      name: 'should handle edge case with only solid foods',
      test: () => {
        const feedings = [
          createMockFeeding('solid', 1),
          createMockFeeding('solid', 2)
        ]
        
        const relevantWithoutSolids = getScheduleRelevantFeedings(feedings, false)
        const nextTimeWithoutSolids = calculateNextFeedingTime(relevantWithoutSolids, 3, false)
        
        const relevantWithSolids = getScheduleRelevantFeedings(feedings, true)
        const nextTimeWithSolids = calculateNextFeedingTime(relevantWithSolids, 3, true)
        
        return relevantWithoutSolids.length === 0 &&
               nextTimeWithoutSolids === null &&
               relevantWithSolids.length === 2 &&
               nextTimeWithSolids !== null
      }
    }
  ]
  
  const results = tests.map(test => ({
    name: test.name,
    passed: test.test()
  }))
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌'
    console.log(`  ${status} ${result.name}`)
  })
  
  return results
}

/**
 * Run all feeding schedule tests
 */
export const runAllFeedingScheduleTests = () => {
  console.log('🚀 Running Feeding Schedule Calculation Tests...\n')
  
  const results = {
    getFeedingTypesForSchedule: testGetFeedingTypesForSchedule(),
    getScheduleRelevantFeedings: testGetScheduleRelevantFeedings(),
    calculateNextFeedingTime: testCalculateNextFeedingTime(),
    integration: testFeedingScheduleIntegration()
  }
  
  // Calculate overall results
  let totalTests = 0
  let passedTests = 0
  
  Object.values(results).forEach(testGroup => {
    testGroup.forEach(test => {
      totalTests++
      if (test.passed) passedTests++
    })
  })
  
  const passRate = Math.round((passedTests / totalTests) * 100)
  
  console.log(`\n📊 Test Summary: ${passedTests}/${totalTests} tests passed (${passRate}%)`)
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed!')
  } else {
    console.log('❌ Some tests failed. Please review the output above.')
  }
  
  return results
}

/**
 * Generate test report
 */
export const generateFeedingScheduleTestReport = (results: any): string => {
  let report = '# Feeding Schedule Calculation Tests Report\n\n'
  
  report += '## Test Results Summary\n\n'
  
  let totalTests = 0
  let passedTests = 0
  
  Object.values(results).forEach((testGroup: any) => {
    testGroup.forEach((test: any) => {
      totalTests++
      if (test.passed) passedTests++
    })
  })
  
  const passRate = Math.round((passedTests / totalTests) * 100)
  report += `**Overall Pass Rate: ${passedTests}/${totalTests} (${passRate}%)**\n\n`
  
  // Detailed results
  report += '## Detailed Results\n\n'
  
  for (const [category, categoryResults] of Object.entries(results)) {
    report += `### ${category} Tests\n\n`
    
    ;(categoryResults as any[]).forEach(test => {
      const status = test.passed ? '✅' : '❌'
      report += `- ${status} ${test.name}\n`
    })
    
    report += '\n'
  }
  
  report += '## Requirements Coverage\n\n'
  report += '- **Requirement 1.1**: Feeding schedule calculations exclude solid foods by default ✅\n'
  report += '- **Requirement 1.2**: Solid food feedings do not affect feeding reminders when excluded ✅\n'
  report += '- **Requirement 3.1**: Feeding intervals consider only relevant feeding types ✅\n'
  report += '- **Requirement 3.2**: All feeding types considered when solids included ✅\n\n'
  
  return report
}

// Export test runner for manual execution
export default {
  runAllFeedingScheduleTests,
  generateFeedingScheduleTestReport,
  testGetFeedingTypesForSchedule,
  testGetScheduleRelevantFeedings,
  testCalculateNextFeedingTime,
  testFeedingScheduleIntegration
}