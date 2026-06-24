import { validateStateTransition, isBookingExpired, isLateCancellation } from './stateMachine.js';

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failedCount++;
  }
}

console.log('==================================================');
console.log('🧪 RUNNING LIFECYCLE & STATE MACHINE UNIT TESTS');
console.log('==================================================\n');

// 1. Test state transitions
assert(validateStateTransition('scheduled', 'ongoing') === true, 'Transition: scheduled -> ongoing (Start Ride)');
assert(validateStateTransition('scheduled', 'cancelled') === true, 'Transition: scheduled -> cancelled (Cancel before start)');
assert(validateStateTransition('ongoing', 'completed') === true, 'Transition: ongoing -> completed (Mutual completion)');
assert(validateStateTransition('ongoing', 'cancelled') === true, 'Transition: ongoing -> cancelled (Emergency mid-ride)');
assert(validateStateTransition('scheduled', 'completed') === false, 'Transition: scheduled -> completed (Invalid - cannot skip ongoing)');
assert(validateStateTransition('completed', 'ongoing') === false, 'Transition: completed -> ongoing (Invalid - terminal state)');

// 2. Test booking expiry (30 min threshold)
const testDate = '2026-06-25';
const testTime = '08:30:00';

// Case A: Query is 2 hours before departure (Not expired)
const nowFar = new Date('2026-06-25T06:30:00');
assert(isBookingExpired(testDate, testTime, nowFar) === false, 'Expiry Check: 2 hours before departure should NOT be expired');

// Case B: Query is 20 minutes before departure (Expired)
const nowClose = new Date('2026-06-25T08:10:00');
assert(isBookingExpired(testDate, testTime, nowClose) === true, 'Expiry Check: 20 minutes before departure should BE expired');

// Case C: Query is after departure (Expired)
const nowPast = new Date('2026-06-25T09:00:00');
assert(isBookingExpired(testDate, testTime, nowPast) === true, 'Expiry Check: After departure should BE expired');

// 3. Test late cancellations (2 hour threshold)
// Case A: Cancelled 4 hours before departure (Standard cancellation)
const cancelNowFar = new Date('2026-06-25T04:30:00');
assert(isLateCancellation(testDate, testTime, cancelNowFar) === false, 'Late Cancel Check: 4 hours before departure is NOT late');

// Case B: Cancelled 1 hour before departure (Late cancellation)
const cancelNowClose = new Date('2026-06-25T07:30:00');
assert(isLateCancellation(testDate, testTime, cancelNowClose) === true, 'Late Cancel Check: 1 hour before departure IS late');

console.log('\n==================================================');
console.log(`📊 TEST RESULTS SUMMARY:`);
console.log(`   PASSED: ${passedCount}`);
console.log(`   FAILED: ${failedCount}`);
console.log('==================================================');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
