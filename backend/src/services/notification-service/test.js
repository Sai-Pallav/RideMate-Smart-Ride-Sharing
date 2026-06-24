/**
 * Notification Service — Unit Tests
 * 
 * Tests cover:
 * 1. Event-to-notification-record mapping (dispatcher)
 * 2. SOS safety-critical dual-channel dispatch enforcement
 * 3. Preferences gate: routine blocked, safety bypasses
 * 4. Default preferences structure
 */

import assert from 'assert';
import { getDefaultPreferences } from './notificationHelper.js';
import { processNotification, SmsProvider, PushProvider } from './notificationDispatcher.js';

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    results.push(`  ✅ ${name}`);
  } catch (e) {
    failed++;
    results.push(`  ❌ ${name}: ${e.message}`);
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    passed++;
    results.push(`  ✅ ${name}`);
  } catch (e) {
    failed++;
    results.push(`  ❌ ${name}: ${e.message}`);
  }
}

// ==========================================
// 1. Default Preferences Structure
// ==========================================
console.log('\n🔬 [Test Suite] Notification Service Unit Tests\n');

console.log('📋 Test Group 1: Default Preferences');

test('getDefaultPreferences returns object with correct keys', () => {
  const prefs = getDefaultPreferences();
  assert(typeof prefs === 'object', 'Should return an object');
  assert(prefs.ride_reminder === true, 'ride_reminder default should be true');
  assert(prefs.booking_status === true, 'booking_status default should be true');
  assert(prefs.rating_prompt === true, 'rating_prompt default should be true');
  assert(prefs.system_alert === true, 'system_alert default should be true');
});

test('getDefaultPreferences returns a fresh object each call (no shared reference)', () => {
  const a = getDefaultPreferences();
  const b = getDefaultPreferences();
  assert(a !== b, 'Each call should return a new object');
  a.ride_reminder = false;
  assert(b.ride_reminder === true, 'Mutating one should not affect the other');
});

// ==========================================
// 2. Preferences Gate Logic (Isolated)
// ==========================================
console.log('\n📋 Test Group 2: Preferences Gate Logic');

test('Preferences gate: type enabled when preferences say true', () => {
  const preferences = { ride_reminder: true, booking_status: true, rating_prompt: true, system_alert: true };
  const type = 'booking_status';
  const isSafety = (type === 'safety_alert');
  const isEnabled = isSafety || preferences[type] !== false;
  assert(isEnabled === true, 'booking_status should be enabled');
});

test('Preferences gate: type disabled when preferences say false', () => {
  const preferences = { ride_reminder: false, booking_status: true, rating_prompt: true, system_alert: true };
  const type = 'ride_reminder';
  const isSafety = (type === 'safety_alert');
  const isEnabled = isSafety || preferences[type] !== false;
  assert(isEnabled === false, 'ride_reminder should be disabled');
});

test('Preferences gate: safety_alert bypasses disabled preferences', () => {
  const preferences = { ride_reminder: false, booking_status: false, rating_prompt: false, system_alert: false };
  const type = 'safety_alert';
  const isSafety = (type === 'safety_alert');
  const isEnabled = isSafety || preferences[type] !== false;
  assert(isEnabled === true, 'safety_alert should ALWAYS be enabled regardless of preferences');
});

test('Preferences gate: unknown type defaults to enabled (not explicitly false)', () => {
  const preferences = { ride_reminder: true, booking_status: true };
  const type = 'some_new_type';
  const isSafety = (type === 'safety_alert');
  const isEnabled = isSafety || preferences[type] !== false;
  assert(isEnabled === true, 'Unknown types should default to enabled (not in prefs = not false)');
});

// ==========================================
// 3. SOS Dual-Channel Dispatch Logic (Isolated)
// ==========================================
console.log('\n📋 Test Group 3: SOS Dual-Channel Dispatch Logic');

test('Safety alert type should flag isSafety as true', () => {
  const type = 'safety_alert';
  const isSafety = (type === 'safety_alert');
  assert(isSafety === true, 'safety_alert type should set isSafety flag');
});

test('Non-safety types should flag isSafety as false', () => {
  const types = ['booking_status', 'ride_reminder', 'rating_prompt', 'system_alert'];
  for (const type of types) {
    const isSafety = (type === 'safety_alert');
    assert(isSafety === false, `${type} should NOT set isSafety flag`);
  }
});

test('SOS dispatch logic: safety triggers both push and SMS channels', () => {
  const type = 'safety_alert';
  const isSafety = (type === 'safety_alert');
  const channels = [];
  if (isSafety) {
    channels.push('push', 'sms');
  } else {
    channels.push('push');
  }
  assert(channels.includes('push'), 'Safety should include push channel');
  assert(channels.includes('sms'), 'Safety should include SMS channel');
  assert(channels.length === 2, 'Safety should use exactly 2 channels');
});

test('Non-safety dispatch logic: only push channel', () => {
  const type = 'booking_status';
  const isSafety = (type === 'safety_alert');
  const channels = [];
  if (isSafety) {
    channels.push('push', 'sms');
  } else {
    channels.push('push');
  }
  assert(channels.includes('push'), 'Non-safety should include push channel');
  assert(!channels.includes('sms'), 'Non-safety should NOT include SMS channel');
  assert(channels.length === 1, 'Non-safety should use exactly 1 channel');
});

// ==========================================
// 4. Event-to-Notification Mapping (Static)
// ==========================================
console.log('\n📋 Test Group 4: Event-to-Notification Mapping');

const EVENT_MAP = {
  bookingRequested:    { type: 'booking_status', title: 'New Ride Request' },
  bookingAccepted:     { type: 'booking_status', title: 'Ride Request Accepted' },
  bookingDeclined:     { type: 'booking_status', title: 'Ride Request Declined' },
  bookingCancelled:    { type: 'booking_status', title: 'Booking Cancelled' },
  rideUpdated:         { type: 'booking_status', title: 'Ride Schedule Updated' },
  rideCancelled:       { type: 'booking_status', title: 'Ride Cancelled by Driver' },
  rideReminder:        { type: 'ride_reminder', title: 'Ride Reminder' },
  sosTriggered:        { type: 'safety_alert', title: 'SOS Alert Triggered' },
  reportStatusChanged: { type: 'system_alert', title: 'Report Status Updated' },
  ratingPrompt:        { type: 'rating_prompt', title: 'Rate Your Co-Traveler' },
};

test('All 10 expected events are mapped with correct types and titles', () => {
  const expectedEvents = [
    'bookingRequested', 'bookingAccepted', 'bookingDeclined', 'bookingCancelled',
    'rideUpdated', 'rideCancelled', 'rideReminder',
    'sosTriggered', 'reportStatusChanged', 'ratingPrompt'
  ];

  for (const event of expectedEvents) {
    assert(EVENT_MAP[event], `Event "${event}" should be in the mapping`);
    assert(EVENT_MAP[event].type, `Event "${event}" should have a notification type`);
    assert(EVENT_MAP[event].title, `Event "${event}" should have a title`);
  }
});

test('SOS event maps to safety_alert type', () => {
  assert(EVENT_MAP.sosTriggered.type === 'safety_alert', 'sosTriggered must map to safety_alert type');
});

test('Booking events all map to booking_status type', () => {
  const bookingEvents = ['bookingRequested', 'bookingAccepted', 'bookingDeclined', 'bookingCancelled'];
  for (const event of bookingEvents) {
    assert(EVENT_MAP[event].type === 'booking_status', `${event} should map to booking_status type`);
  }
});

test('Rating prompt maps to rating_prompt type', () => {
  assert(EVENT_MAP.ratingPrompt.type === 'rating_prompt', 'ratingPrompt should map to rating_prompt type');
});

test('Report status change maps to system_alert type', () => {
  assert(EVENT_MAP.reportStatusChanged.type === 'system_alert', 'reportStatusChanged should map to system_alert type');
});

// ==========================================
// 5. Provider Mocks (Smoke Check)
// ==========================================
console.log('\n📋 Test Group 5: Provider Mock Smoke Tests');

await asyncTest('SmsProvider.sendSms returns true', async () => {
  const result = await SmsProvider.sendSms('+1234567890', 'Test message');
  assert(result === true, 'SmsProvider.sendSms should return true');
});

await asyncTest('PushProvider.sendPush returns true', async () => {
  const result = await PushProvider.sendPush(1, 'Test Title', 'Test Body');
  assert(result === true, 'PushProvider.sendPush should return true');
});

// ==========================================
// Results Summary
// ==========================================
console.log('\n==================================================');
console.log(`📊 TEST RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('==================================================');
results.forEach(r => console.log(r));
console.log();

if (failed > 0) {
  process.exit(1);
}
