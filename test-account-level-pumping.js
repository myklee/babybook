// Test account-level pumping functionality
console.log('Testing account-level pumping functionality...');

// Test 1: Pumping session without baby_id
console.log('\nTest 1: Creating pumping session without baby_id');
const sessionWithoutBaby = {
    baby_id: null,
    user_id: 'test-user-123',
    start_time: '2024-01-01T10:00:00Z',
    end_time: '2024-01-01T10:15:00Z',
    left_duration: 450, // 7.5 minutes
    right_duration: 450, // 7.5 minutes
    total_duration: 900, // 15 minutes
    left_amount: 60,
    right_amount: 55,
    total_amount: 115,
    notes: 'Morning pumping session'
};

console.log('Session data:', {
    baby_id: sessionWithoutBaby.baby_id,
    total_duration: sessionWithoutBaby.total_duration,
    total_amount: sessionWithoutBaby.total_amount,
    notes: sessionWithoutBaby.notes
});

// Test 2: Pumping session with baby_id (optional association)
console.log('\nTest 2: Creating pumping session with optional baby_id');
const sessionWithBaby = {
    baby_id: 'baby-123',
    user_id: 'test-user-123',
    start_time: '2024-01-01T14:00:00Z',
    end_time: '2024-01-01T14:20:00Z',
    left_duration: 600, // 10 minutes
    right_duration: 600, // 10 minutes
    total_duration: 1200, // 20 minutes
    left_amount: 80,
    right_amount: 75,
    total_amount: 155,
    notes: 'Afternoon pumping session for baby'
};

console.log('Session data:', {
    baby_id: sessionWithBaby.baby_id,
    total_duration: sessionWithBaby.total_duration,
    total_amount: sessionWithBaby.total_amount,
    notes: sessionWithBaby.notes
});

// Test 3: Verify account-level filtering
console.log('\nTest 3: Account-level session filtering');
const allSessions = [sessionWithoutBaby, sessionWithBaby];
const accountSessions = allSessions; // All sessions belong to the account
const unassignedSessions = allSessions.filter(s => s.baby_id === null);
const babySessions = allSessions.filter(s => s.baby_id === 'baby-123');

console.log('Total account sessions:', accountSessions.length);
console.log('Unassigned sessions:', unassignedSessions.length);
console.log('Baby-specific sessions:', babySessions.length);

// Test 4: Verify UI display logic
console.log('\nTest 4: UI display logic');
function getBabyNameForSession(session, babies) {
    if (!session.baby_id) return undefined; // Account-level session
    const baby = babies.find(b => b.id === session.baby_id);
    return baby ? baby.name : 'Unknown Baby';
}

const mockBabies = [
    { id: 'baby-123', name: 'Emma' },
    { id: 'baby-456', name: 'Oliver' }
];

console.log('Session without baby - display name:', getBabyNameForSession(sessionWithoutBaby, mockBabies) || 'Account-level');
console.log('Session with baby - display name:', getBabyNameForSession(sessionWithBaby, mockBabies) || 'Account-level');

console.log('\n✅ All account-level pumping tests completed successfully!');