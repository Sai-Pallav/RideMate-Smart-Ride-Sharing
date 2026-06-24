import { findMatches } from './matchingEngine.js';

// Setup mock candidate driver rides
const mockCandidateRides = [
  {
    ride_id: 1,
    driver_id: 101,
    driver_name: 'Sai Pallav',
    driver_rating: 4.8,
    driver_verified: true,
    vehicle_type: 'car',
    source_label: 'Campus Main Gate',
    source_location: { latitude: 37.7749, longitude: -122.4194 },
    destination_label: 'Downtown Station',
    destination_location: { latitude: 37.7891, longitude: -122.4014 },
    ride_date: '2026-06-25',
    departure_time: '08:30:00',
    total_seats: 3,
    available_seats: 2,
    estimated_distance_km: 5.20,
    estimated_total_cost: 12.00,
    stops: [
      {
        stop_id: 10,
        sequence_order: 1,
        stop_label: 'Campus North Library',
        stop_location: { latitude: 37.7790, longitude: -122.4120 },
        distance_from_source_km: 1.20
      },
      {
        stop_id: 11,
        sequence_order: 2,
        stop_label: 'Science Complex',
        stop_location: { latitude: 37.7830, longitude: -122.4080 },
        distance_from_source_km: 2.80
      }
    ]
  }
];

const config = {
  MAX_PROXIMITY_DISTANCE_KM: 1.0,
  MIN_OVERLAP_THRESHOLD_PCT: 20.0,
  AVERAGE_SPEED_KM_H: 40.0
};

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
console.log('🧪 RUNNING MATCHING ENGINE UNIT TESTS');
console.log('==================================================\n');

// --- Test Case 1: Clean Scenario 1 Match (Exact Match) ---
const query1 = {
  pickup_location: { latitude: 37.7749, longitude: -122.4194 }, // Main Gate
  drop_location: { latitude: 37.7891, longitude: -122.4014 },   // Downtown Station
  ride_date: '2026-06-25',
  preferred_time: '08:30:00',
  time_window_hours: 2.0
};
const results1 = findMatches(query1, mockCandidateRides, config);
assert(results1.length === 1, 'Test 1: Match should be found');
if (results1.length > 0) {
  assert(results1[0].match_scenario === 'Scenario 1: Exact Match', 'Test 1: Scenario should be exact match');
  assert(results1[0].overlap_percentage === 100, 'Test 1: Overlap percentage should be 100%');
}

// --- Test Case 2: Clean Scenario 2 Match (Exits Early) ---
const query2 = {
  pickup_location: { latitude: 37.7749, longitude: -122.4194 }, // Main Gate
  drop_location: { latitude: 37.7830, longitude: -122.4080 },   // Science Complex
  ride_date: '2026-06-25',
  preferred_time: '08:30:00',
  time_window_hours: 2.0
};
const results2 = findMatches(query2, mockCandidateRides, config);
assert(results2.length === 1, 'Test 2: Match should be found');
if (results2.length > 0) {
  assert(results2[0].match_scenario === 'Scenario 2: Partial Match (Passenger Exits Early)', 'Test 2: Scenario should be exits early');
  assert(results2[0].overlap_percentage === 54, 'Test 2: Overlap percentage should be 54% (2.8/5.2)');
}

// --- Test Case 3: Clean Scenario 3 Match (Joins Mid-Route) ---
const query3 = {
  pickup_location: { latitude: 37.7790, longitude: -122.4120 }, // Library
  drop_location: { latitude: 37.7891, longitude: -122.4014 },   // Downtown Station
  ride_date: '2026-06-25',
  preferred_time: '08:35:00',
  time_window_hours: 2.0
};
const results3 = findMatches(query3, mockCandidateRides, config);
assert(results3.length === 1, 'Test 3: Match should be found');
if (results3.length > 0) {
  assert(results3[0].match_scenario === 'Scenario 3: Partial Match (Passenger Joins Mid-Route)', 'Test 3: Scenario should be joins mid-route');
  assert(results3[0].overlap_percentage === 77, 'Test 3: Overlap percentage should be 77% (4.0/5.2)');
}

// --- Test Case 4: Non-match Excluded (Wrong Direction) ---
const query4 = {
  pickup_location: { latitude: 37.7830, longitude: -122.4080 }, // Science Complex
  drop_location: { latitude: 37.7790, longitude: -122.4120 },   // Library (backwards)
  ride_date: '2026-06-25',
  preferred_time: '08:30:00',
  time_window_hours: 2.0
};
const results4 = findMatches(query4, mockCandidateRides, config);
assert(results4.length === 0, 'Test 4: Backward route direction should be excluded');

// --- Test Case 5: Time Window Mismatch ---
const query5 = {
  pickup_location: { latitude: 37.7749, longitude: -122.4194 }, // Main Gate
  drop_location: { latitude: 37.7891, longitude: -122.4014 },   // Downtown Station
  ride_date: '2026-06-25',
  preferred_time: '15:30:00', // 7 hours later
  time_window_hours: 2.0
};
const results5 = findMatches(query5, mockCandidateRides, config);
assert(results5.length === 0, 'Test 5: Time window mismatch should be excluded');

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
