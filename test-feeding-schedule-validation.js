
// Feeding Schedule Test Validation Script
// Run this in your browser console to test the functions

// Test 1: getFeedingTypesForSchedule
console.log('Testing getFeedingTypesForSchedule...')
const typesWithoutSolids = getFeedingTypesForSchedule(false)
const typesWithSolids = getFeedingTypesForSchedule(true)
console.log('Without solids:', typesWithoutSolids)
console.log('With solids:', typesWithSolids)
console.log('✅ Test 1 passed:', typesWithoutSolids.length === 3 && typesWithSolids.length === 4)

// Test 2: getScheduleRelevantFeedings
console.log('\nTesting getScheduleRelevantFeedings...')
const mockFeedings = [
  { type: 'breast', timestamp: new Date(Date.now() - 60*60*1000).toISOString() },
  { type: 'solid', timestamp: new Date(Date.now() - 30*60*1000).toISOString() },
  { type: 'formula', timestamp: new Date(Date.now() - 120*60*1000).toISOString() }
]
const relevantWithoutSolids = getScheduleRelevantFeedings(mockFeedings, false)
const relevantWithSolids = getScheduleRelevantFeedings(mockFeedings, true)
console.log('Without solids:', relevantWithoutSolids.length)
console.log('With solids:', relevantWithSolids.length)
console.log('✅ Test 2 passed:', relevantWithoutSolids.length === 2 && relevantWithSolids.length === 3)

// Test 3: calculateNextFeedingTime
console.log('\nTesting calculateNextFeedingTime...')
const nextTimeWithoutSolids = calculateNextFeedingTime(mockFeedings, 3, false)
const nextTimeWithSolids = calculateNextFeedingTime(mockFeedings, 3, true)
console.log('Next time without solids:', nextTimeWithoutSolids)
console.log('Next time with solids:', nextTimeWithSolids)
console.log('✅ Test 3 passed:', nextTimeWithoutSolids !== null && nextTimeWithSolids !== null)

console.log('\n🎉 All basic tests completed!')
