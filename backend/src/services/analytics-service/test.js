import assert from 'assert';
import { calculateRideSavings, FUEL_CONSUMPTION_PER_KM, CO2_EMISSIONS_PER_KM } from './savingsCalculator.js';
import eventBus from '../../utils/eventBus.js';

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

console.log('\n🔬 [Test Suite] Analytics Service Unit Tests\n');

// ==========================================
// 1. Pure Savings Calculation Unit Tests
// ==========================================
console.log('📋 Test Group 1: savingsCalculator.js (Pure Logic)');

test('Configured constants match specs', () => {
  assert.strictEqual(FUEL_CONSUMPTION_PER_KM, 0.08, 'Fuel consumption constant must be 0.08 L/km');
  assert.strictEqual(CO2_EMISSIONS_PER_KM, 0.12, 'CO2 emissions constant must be 0.12 kg/km');
});

test('calculateRideSavings returns correct calculations for standard trip', () => {
  const result = calculateRideSavings({ distanceKm: 10, actualCostShare: 40 });
  
  assert.strictEqual(result.fuelSavedLiters, 0.8, '10km * 0.08 = 0.8 Liters');
  assert.strictEqual(result.co2AvoidedKg, 1.2, '10km * 0.12 = 1.2 kg CO2');
  assert.strictEqual(result.costSaved, 40, '40 * 2.0 - 40 = 40 INR');
});

test('calculateRideSavings handles zero distance or cost', () => {
  const zeroDist = calculateRideSavings({ distanceKm: 0, actualCostShare: 40 });
  assert.strictEqual(zeroDist.fuelSavedLiters, 0);
  assert.strictEqual(zeroDist.co2AvoidedKg, 0);
  assert.strictEqual(zeroDist.costSaved, 0);

  const zeroCost = calculateRideSavings({ distanceKm: 10, actualCostShare: 0 });
  assert.strictEqual(zeroCost.fuelSavedLiters, 0);
  assert.strictEqual(zeroCost.co2AvoidedKg, 0);
  assert.strictEqual(zeroCost.costSaved, 0);
});

test('calculateRideSavings handles negative inputs gracefully', () => {
  const negDist = calculateRideSavings({ distanceKm: -5, actualCostShare: 20 });
  assert.strictEqual(negDist.fuelSavedLiters, 0);
  assert.strictEqual(negDist.co2AvoidedKg, 0);
  assert.strictEqual(negDist.costSaved, 0);

  const negCost = calculateRideSavings({ distanceKm: 5, actualCostShare: -20 });
  assert.strictEqual(negCost.fuelSavedLiters, 0);
  assert.strictEqual(negCost.co2AvoidedKg, 0);
  assert.strictEqual(negCost.costSaved, 0);
});

test('calculateRideSavings handles null or NaN inputs', () => {
  const nanInput = calculateRideSavings({ distanceKm: NaN, actualCostShare: 20 });
  assert.strictEqual(nanInput.fuelSavedLiters, 0);
  assert.strictEqual(nanInput.co2AvoidedKg, 0);
  assert.strictEqual(nanInput.costSaved, 0);

  const nullInput = calculateRideSavings({ distanceKm: 5, actualCostShare: null });
  assert.strictEqual(nullInput.fuelSavedLiters, 0);
  assert.strictEqual(nullInput.co2AvoidedKg, 0);
  assert.strictEqual(nullInput.costSaved, 0);
});

// ==========================================
// 2. Express Route and Middleware Stack Verification
// ==========================================
console.log('\n📋 Test Group 2: Express Route Configuration');

test('GET /me route uses authenticateJWT middleware', async () => {
  const { default: router } = await import('./router.js');
  
  const meRoute = router.stack.find(layer => {
    return layer.route && layer.route.path === '/me' && layer.route.methods.get;
  });
  
  assert(meRoute, 'GET /me route must exist');
  
  const middlewareNames = meRoute.route.stack.map(s => s.name);
  assert(middlewareNames.includes('authenticateJWT'), '/me must require authenticateJWT');
});

test('GET /platform route does not use authenticateJWT middleware', async () => {
  const { default: router } = await import('./router.js');
  
  const platformRoute = router.stack.find(layer => {
    return layer.route && layer.route.path === '/platform' && layer.route.methods.get;
  });
  
  assert(platformRoute, 'GET /platform route must exist');
  
  const middlewareNames = platformRoute.route.stack.map(s => s.name);
  assert(!middlewareNames.includes('authenticateJWT'), '/platform must be public');
});

// ==========================================
// 3. Database Model & Integration Mock Tests
// ==========================================
console.log('\n📋 Test Group 3: Event handler & Mock database updates');

await asyncTest('handleRideCompleted handles event and updates analytics for passengers & drivers', async () => {
  const { default: db } = await import('../../../models/index.js');
  const { handleRideCompleted } = await import('./analyticsDispatcher.js');

  // Stub Ride data
  const mockRide = {
    ride_id: 123,
    driver_id: 10,
    Bookings: [
      {
        passenger_id: 20,
        distance_traveled_km: 10,
        calculated_cost_share: 40
      },
      {
        passenger_id: 30,
        distance_traveled_km: 5,
        calculated_cost_share: 20
      }
    ]
  };

  // Setup database mocks
  db.Ride.findByPk = async (id) => {
    if (id === 123) return mockRide;
    return null;
  };

  // Mock transaction
  db.sequelize.transaction = async (fn) => {
    return await fn({});
  };

  const upserts = {};
  db.UserAnalytics.findOrCreate = async ({ where, defaults, transaction }) => {
    const userId = where.user_id;
    const key = `user_${userId}`;
    
    // Simulate that the default is saved to database on creation
    upserts[key] = {
      total_rides: defaults.total_rides,
      total_distance_shared_km: defaults.total_distance_shared_km,
      total_fuel_saved_liters: defaults.total_fuel_saved_liters,
      total_co2_avoided_kg: defaults.total_co2_avoided_kg,
      total_cost_saved: defaults.total_cost_saved
    };
    
    const record = {
      user_id: userId,
      ...defaults,
      save: async () => {
        upserts[key] = {
          total_rides: record.total_rides,
          total_distance_shared_km: record.total_distance_shared_km,
          total_fuel_saved_liters: record.total_fuel_saved_liters,
          total_co2_avoided_kg: record.total_co2_avoided_kg,
          total_cost_saved: record.total_cost_saved
        };
      }
    };
    
    return [record, true];
  };

  // Call the handler
  await handleRideCompleted({ rideId: 123 });

  // Verify passenger 1 savings (distance = 10km, cost = 40)
  // fuel: 10 * 0.08 = 0.8, co2: 10 * 0.12 = 1.2, cost saved: 40
  const p1 = upserts['user_20'];
  assert(p1, 'Passenger 20 analytics must be saved');
  assert.strictEqual(p1.total_rides, 1);
  assert.strictEqual(p1.total_distance_shared_km, 10);
  assert.strictEqual(p1.total_fuel_saved_liters, 0.8);
  assert.strictEqual(p1.total_co2_avoided_kg, 1.2);
  assert.strictEqual(p1.total_cost_saved, 40);

  // Verify passenger 2 savings (distance = 5km, cost = 20)
  // fuel: 5 * 0.08 = 0.4, co2: 5 * 0.12 = 0.6, cost saved: 20
  const p2 = upserts['user_30'];
  assert(p2, 'Passenger 30 analytics must be saved');
  assert.strictEqual(p2.total_rides, 1);
  assert.strictEqual(p2.total_distance_shared_km, 5);
  assert.strictEqual(p2.total_fuel_saved_liters, 0.4);
  assert.strictEqual(p2.total_co2_avoided_kg, 0.6);
  assert.strictEqual(p2.total_cost_saved, 20);

  // Verify driver savings (driver = 10)
  // fuel: sum of passengers = 0.8 + 0.4 = 1.2
  // co2: sum of passengers = 1.2 + 0.6 = 1.8
  // distance: sum of passengers = 10 + 5 = 15
  // cost: sum of cost shares = 40 + 20 = 60
  const d = upserts['user_10'];
  assert(d, 'Driver 10 analytics must be saved');
  assert.strictEqual(d.total_rides, 1);
  assert.strictEqual(d.total_distance_shared_km, 15);
  assert.strictEqual(d.total_fuel_saved_liters, 1.2);
  assert.strictEqual(d.total_co2_avoided_kg, 1.8);
  assert.strictEqual(d.total_cost_saved, 60);
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
