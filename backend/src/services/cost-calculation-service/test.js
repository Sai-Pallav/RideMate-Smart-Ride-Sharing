import { calculateCostShare } from './costCalculator.js';

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
console.log('🧪 RUNNING COST CALCULATION SERVICE UNIT TESTS');
console.log('==================================================\n');

// Test Case 1: Exact Match / Full-Route
const share1 = calculateCostShare(12.00, 5.20, 5.20);
assert(share1 === 12.00, `Test 1 (Full-Route): Share should be 12.00, got ${share1}`);

// Test Case 2: Partial Match / Early Exit
const share2 = calculateCostShare(12.00, 5.20, 2.80);
assert(share2 === 6.46, `Test 2 (Partial-Route): Share should be 6.46, got ${share2}`);

// Test Case 3: Edge Case - Zero Total Distance
const share3 = calculateCostShare(12.00, 0, 2.80);
assert(share3 === 0.00, `Test 3 (Zero Total Distance): Share should be 0.00, got ${share3}`);

// Test Case 4: Edge Case - Zero Passenger Distance
const share4 = calculateCostShare(12.00, 5.20, 0);
assert(share4 === 0.00, `Test 4 (Zero Passenger Distance): Share should be 0.00, got ${share4}`);

// Test Case 5: Edge Case - Passenger Distance Exceeds Total Distance
const share5 = calculateCostShare(12.00, 5.20, 6.00);
assert(share5 === 12.00, `Test 5 (Distance Exceeded): Share should cap at total cost (12.00), got ${share5}`);

// Test Case 6: Edge Case - String Inputs
const share6 = calculateCostShare("12.00", "5.20", "2.80");
assert(share6 === 6.46, `Test 6 (String Inputs): Share should resolve to 6.46, got ${share6}`);

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
