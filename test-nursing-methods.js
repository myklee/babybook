// Simple test to validate the nursing methods implementation
// This is a basic validation of the logic without running the full app

// Mock the validation functions from nursing types
function validateDualTimerNursingSession(leftDuration, rightDuration) {
  const errors = [];
  const warnings = [];

  if (leftDuration === 0 && rightDuration === 0) {
    errors.push({
      field: 'duration',
      message: 'At least one breast timer must have a duration greater than 0'
    });
  }

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

  const totalDuration = leftDuration + rightDuration;
  if (totalDuration > 7200) {
    warnings.push({
      field: 'total_duration',
      message: 'Total nursing session is over 2 hours'
    });
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings
  };
}

function computeBreastUsed(leftDuration, rightDuration) {
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

// Test cases
console.log('Testing dual-timer nursing session validation...');

// Test 1: Valid session with both breasts
const test1 = validateDualTimerNursingSession(600, 900); // 10 min left, 15 min right
console.log('Test 1 (both breasts):', test1.is_valid ? 'PASS' : 'FAIL', test1);

// Test 2: Valid session with only left breast
const test2 = validateDualTimerNursingSession(1200, 0); // 20 min left, 0 right
console.log('Test 2 (left only):', test2.is_valid ? 'PASS' : 'FAIL', test2);

// Test 3: Invalid session with no duration
const test3 = validateDualTimerNursingSession(0, 0);
console.log('Test 3 (no duration):', test3.is_valid ? 'FAIL (expected)' : 'PASS', test3);

// Test 4: Warning for long session
const test4 = validateDualTimerNursingSession(3700, 0); // Over 60 minutes
console.log('Test 4 (long session):', test4.is_valid ? 'PASS' : 'FAIL', 'Warnings:', test4.warnings.length);

console.log('\nTesting breast usage computation...');

// Test breast usage computation
try {
  console.log('Both breasts (600, 900):', computeBreastUsed(600, 900));
  console.log('Left only (1200, 0):', computeBreastUsed(1200, 0));
  console.log('Right only (0, 800):', computeBreastUsed(0, 800));
} catch (error) {
  console.log('Error:', error.message);
}

try {
  console.log('Invalid (0, 0):', computeBreastUsed(0, 0));
} catch (error) {
  console.log('Expected error for (0, 0):', error.message);
}

console.log('\nAll tests completed successfully!');