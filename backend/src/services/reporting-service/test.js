import { 
  validateSelfReport, 
  shouldMerge, 
  getMergedDetail, 
  findActiveSosAlert 
} from './reportingHelper.js';

// Simple assertion helper
const assert = (condition, message) => {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
  } else {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
};

const runTests = async () => {
  console.log(`==================================================`);
  console.log(`🧪 RUNNING USER REPORTING MODULE UNIT TESTS`);
  console.log(`==================================================\n`);

  // --- Test 1: Self-Report Block ---
  console.log('--- Testing Self-Report Block ---');
  
  // Reporting someone else should pass
  try {
    const passed = validateSelfReport(1, 2);
    assert(passed === true, 'Filing a report against another user passes successfully');
  } catch (err) {
    assert(false, 'Filing a report against another user should not fail');
  }

  // Self-report should throw an error
  try {
    validateSelfReport(5, 5);
    assert(false, 'Self-reporting should be blocked');
  } catch (err) {
    assert(
      err.message.includes('Self-reporting is blocked'),
      'Filing a report against yourself is blocked with a clear error message'
    );
  }

  // --- Test 2: Deduplication / Merge Decision Logic ---
  console.log('\n--- Testing Deduplication / Merge Decision Logic ---');

  const existingReport = {
    report_id: 101,
    reporter_id: 1,
    reported_user_id: 2,
    ride_id: 50,
    booking_id: null,
    category: 'unsafe_driving',
    detail: 'Driver was speeding.',
    status: 'received',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
  };

  const newQueryParams = {
    reporter_id: 1,
    reported_user_id: 2,
    ride_id: 50,
    booking_id: null,
    category: 'unsafe_driving'
  };

  // Case A: Duplicate within 24-hour window -> should merge
  assert(
    shouldMerge(existingReport, newQueryParams) === true,
    'Duplicate report filed within 2 hours window is flagged for merge'
  );

  // Case B: Resolved report -> should NOT merge
  const resolvedReport = { ...existingReport, status: 'resolved' };
  assert(
    shouldMerge(resolvedReport, newQueryParams) === false,
    'Resolved reports are not merged'
  );

  // Case C: Outside 24-hour window (e.g. 26 hours ago) -> should NOT merge
  const oldReport = { 
    ...existingReport, 
    created_at: new Date(Date.now() - 26 * 60 * 60 * 1000) 
  };
  assert(
    shouldMerge(oldReport, newQueryParams) === false,
    'Duplicate report filed 26 hours later is not merged'
  );

  // Case D: Different category -> should NOT merge
  const diffCategoryParams = { ...newQueryParams, category: 'misbehavior' };
  assert(
    shouldMerge(existingReport, diffCategoryParams) === false,
    'Report with different category is not merged'
  );

  // Case E: Details formatting merge check
  const originalDetail = 'Driver was speeding.';
  const additionalDetail = 'Also weaving in and out of traffic.';
  const mockTimestamp = new Date('2026-06-20T12:00:00.000Z');
  
  const expectedMergedText = `Driver was speeding.\n\n[Additional Detail added at 2026-06-20T12:00:00.000Z]: Also weaving in and out of traffic.`;
  const actualMergedText = getMergedDetail(originalDetail, additionalDetail, mockTimestamp);
  
  assert(
    actualMergedText === expectedMergedText,
    'Detail text merging formats correctly with timestamps'
  );

  // --- Test 3: Urgent SOS Alert Linking Logic ---
  console.log('\n--- Testing Urgent SOS Alert Linking Decision Logic ---');

  const mockActiveAlerts = [
    { alert_id: 991, ride_id: 50, status: 'active' },
    { alert_id: 992, ride_id: 60, status: 'resolved' }
  ];

  // Case A: Urgent report with active alert on the same ride -> should link
  const linkedAlert = findActiveSosAlert({ rideId: 50, activeAlerts: mockActiveAlerts });
  assert(
    linkedAlert !== null && linkedAlert.alert_id === 991,
    'Urgent report correctly resolves active SOS alert on same ride'
  );

  // Case B: Urgent report with resolved alert on same ride -> should NOT link
  const nonLinkedAlert = findActiveSosAlert({ rideId: 60, activeAlerts: mockActiveAlerts });
  assert(
    nonLinkedAlert === null,
    'Urgent report does not link to resolved SOS alerts'
  );

  // Case C: Urgent report with no alerts on ride -> should NOT link
  const noAlertLink = findActiveSosAlert({ rideId: 70, activeAlerts: mockActiveAlerts });
  assert(
    noAlertLink === null,
    'Urgent report does not link if no alerts exist for the ride'
  );

  console.log(`\n==================================================`);
  console.log(`📊 TEST RESULTS SUMMARY:`);
  console.log(`   ALL TESTS PASSED!`);
  console.log(`==================================================`);
};

runTests().catch(err => {
  console.error('Test run encountered an error:', err);
  process.exit(1);
});
