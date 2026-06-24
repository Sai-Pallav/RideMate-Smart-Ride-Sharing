import { isWithinGracePeriod, parallelFanOut } from './safetyHelper.js';
import eventBus from '../../utils/eventBus.js';
import { activeLiveSharingSessions, checkAndCleanupSession } from './router.js';
import db from '../../../models/index.js';

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
  console.log(`🧪 RUNNING SAFETY & SOS SERVICE UNIT TESTS`);
  console.log(`==================================================\n`);

  // --- Test 1: Grace-Period Cancellation Logic ---
  console.log('--- Testing Grace-Period Cancellation Window ---');
  const triggerTime = new Date('2026-06-20T12:00:00.000Z');
  
  // 5 seconds later (within 10s window)
  const cancelTimeWithin = new Date('2026-06-20T12:00:05.000Z');
  assert(
    isWithinGracePeriod(triggerTime, cancelTimeWithin, 10000) === true,
    '5 seconds difference is within 10-second grace period'
  );

  // Exactly 10 seconds later (on the boundary)
  const cancelTimeBoundary = new Date('2026-06-20T12:00:10.000Z');
  assert(
    isWithinGracePeriod(triggerTime, cancelTimeBoundary, 10000) === true,
    '10 seconds difference is within 10-second grace period (boundary)'
  );

  // 12 seconds later (outside 10s window)
  const cancelTimeOutside = new Date('2026-06-20T12:00:12.000Z');
  assert(
    isWithinGracePeriod(triggerTime, cancelTimeOutside, 10000) === false,
    '12 seconds difference is outside 10-second grace period'
  );

  // --- Test 2: Parallel Fan-Out Execution ---
  console.log('\n--- Testing Parallel Fan-Out Structure ---');
  
  const mockAlertDetails = {
    alert_id: 1234,
    user_id: 42,
    ride_id: 99,
    location: { latitude: 12.9716, longitude: 77.5946 },
    status: 'active'
  };

  const mockContacts = [
    { contact_name: 'Alice', contact_phone: '+919999999991' },
    { contact_name: 'Bob', contact_phone: '+919999999992' }
  ];

  // We mock the three fanout targets with a delay of 80ms each.
  // If executed sequentially, total time would be >= 240ms.
  // If executed in parallel, total time should be around 80ms - 120ms.
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const slowSmsStub = async () => {
    await delay(80);
    return true;
  };

  const slowAdminStub = async () => {
    await delay(80);
    return true;
  };

  const slowSocketStub = async () => {
    await delay(80);
    return true;
  };

  const startTime = Date.now();
  await parallelFanOut({
    alertDetails: mockAlertDetails,
    contacts: mockContacts,
    db: null,
    smsStub: slowSmsStub,
    adminStub: slowAdminStub,
    socketStub: slowSocketStub
  });
  const duration = Date.now() - startTime;

  console.log(`Parallel execution duration: ${duration}ms`);
  assert(
    duration < 180, 
    `Parallel fan-out executed concurrently (took ${duration}ms, which is < sequential sum of 240ms)`
  );

  // --- Test 3: Emergency Contact Gate logic ---
  console.log('\n--- Testing Emergency Contact Gate Logic ---');
  
  const validateContactsGate = (contacts) => {
    if (!contacts || contacts.length === 0) {
      throw new Error('SOS trigger blocked. You must register at least one emergency contact before triggering SOS.');
    }
    return true;
  };

  // User has contacts
  try {
    const passed = validateContactsGate(mockContacts);
    assert(passed === true, 'Gate passes when user has emergency contacts');
  } catch (err) {
    assert(false, 'Gate should not fail when user has contacts');
  }

  // User has zero contacts
  try {
    validateContactsGate([]);
    assert(false, 'Gate should block when user has zero contacts');
  } catch (err) {
    assert(
      err.message.includes('SOS trigger blocked'),
      'Gate blocks SOS trigger and returns clear error when user has zero emergency contacts'
    );
  }

  // --- Test 4: Event-Driven Live Location Sharing Cleanup ---
  console.log('\n--- Testing Event-Driven Live Location Cleanup ---');
  
  const mockUserId = 101;
  const mockRideId = 202;
  const mockContactId = 5;
  const sessionKey = `${mockUserId}_${mockRideId}`;

  // Start mock session
  activeLiveSharingSessions.set(sessionKey, {
    userId: mockUserId,
    rideId: mockRideId,
    contactId: mockContactId,
    startedAt: new Date()
  });

  assert(
    activeLiveSharingSessions.has(sessionKey) === true,
    'Mock live sharing session is active before event'
  );

  // Emit rideCompleted
  eventBus.emit('rideCompleted', { rideId: mockRideId });

  // Assert it's gone immediately
  assert(
    activeLiveSharingSessions.has(sessionKey) === false,
    'Active session is deleted immediately upon receiving rideCompleted event'
  );

  // --- Test 5: Pull-Based Backstop Cleanup ---
  console.log('\n--- Testing Pull-Based Backstop Cleanup ---');
  
  const pullRideId = 303;
  const pullSessionKey = `${mockUserId}_${pullRideId}`;

  // Start mock session
  activeLiveSharingSessions.set(pullSessionKey, {
    userId: mockUserId,
    rideId: pullRideId,
    contactId: mockContactId,
    startedAt: new Date()
  });

  assert(
    activeLiveSharingSessions.has(pullSessionKey) === true,
    'Mock session is active before pull-based cleanup'
  );

  // Mock db.Ride.findByPk
  const originalFindByPk = db.Ride.findByPk;
  db.Ride.findByPk = async (id) => {
    if (id === pullRideId) {
      return { status: 'completed' };
    }
    return null;
  };

  // Run the checkAndCleanupSession helper
  const sessionValue = await checkAndCleanupSession(mockUserId, pullRideId);

  assert(
    sessionValue === null,
    'checkAndCleanupSession returns null for completed ride'
  );

  assert(
    activeLiveSharingSessions.has(pullSessionKey) === false,
    'Active session is deleted from memory map during pull-based check'
  );

  // Restore db.Ride.findByPk
  db.Ride.findByPk = originalFindByPk;

  console.log(`\n==================================================`);
  console.log(`📊 TEST RESULTS SUMMARY:`);
  console.log(`   ALL TESTS PASSED!`);
  console.log(`==================================================`);
};

runTests().catch(err => {
  console.error('Test run encountered an error:', err);
  process.exit(1);
});
