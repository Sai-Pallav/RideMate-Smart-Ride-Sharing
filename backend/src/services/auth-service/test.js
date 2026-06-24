import jwt from 'jsonwebtoken';
import { generateAccessToken, generateRefreshToken, JWT_SECRET } from './router.js';

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
  console.log(`🧪 RUNNING AUTH SERVICE JWT SIGNING UNIT TESTS`);
  console.log(`==================================================\n`);

  // Mock Admin User
  const adminUser = {
    user_id: 42,
    email: 'admin@platform.com',
    phone_number: '+15550999',
    role: 'admin'
  };

  // Mock Regular User
  const regularUser = {
    user_id: 43,
    email: 'passenger@platform.com',
    phone_number: '+15550200',
    role: 'user'
  };

  // Mock User without role (should default or pass undefined depending on how DB defaults it, but here we just pass whatever role is in the object)
  const defaultUser = {
    user_id: 44,
    email: 'default@platform.com',
    phone_number: '+15550111'
    // role is missing
  };

  // --- Case 1: Sign token for Admin -> verify payload has role='admin' ---
  console.log('--- Case 1: Admin User JWT Signing ---');
  const adminToken = generateAccessToken(adminUser);
  assert(typeof adminToken === 'string', 'generateAccessToken returns a string token');

  const decodedAdmin = jwt.verify(adminToken, JWT_SECRET);
  assert(decodedAdmin.user_id === 42, 'Payload user_id matches');
  assert(decodedAdmin.email === 'admin@platform.com', 'Payload email matches');
  assert(decodedAdmin.phone_number === '+15550999', 'Payload phone_number matches');
  assert(decodedAdmin.role === 'admin', 'Payload contains role: "admin"');

  // --- Case 2: Sign token for Regular User -> verify payload has role='user' ---
  console.log('\n--- Case 2: Regular User JWT Signing ---');
  const regularToken = generateAccessToken(regularUser);
  const decodedRegular = jwt.verify(regularToken, JWT_SECRET);
  assert(decodedRegular.user_id === 43, 'Payload user_id matches');
  assert(decodedRegular.role === 'user', 'Payload contains role: "user"');

  // --- Case 3: Sign token for User without role -> role in payload is undefined ---
  console.log('\n--- Case 3: User without role JWT Signing ---');
  const defaultToken = generateAccessToken(defaultUser);
  const decodedDefault = jwt.verify(defaultToken, JWT_SECRET);
  assert(decodedDefault.user_id === 44, 'Payload user_id matches');
  assert(decodedDefault.role === undefined, 'Payload role is undefined (not set)');

  // --- Case 4: Refresh Token signing (does not contain role) ---
  console.log('\n--- Case 4: Refresh Token Signing ---');
  const refreshToken = generateRefreshToken(adminUser);
  const decodedRefresh = jwt.verify(refreshToken, 'your_jwt_refresh_secret_key_here'); // using the default fallback secret for validation
  assert(decodedRefresh.user_id === 42, 'Refresh token contains user_id');
  assert(decodedRefresh.role === undefined, 'Refresh token does NOT contain role');

  console.log(`\n==================================================`);
  console.log(`📊 TEST RESULTS SUMMARY:`);
  console.log(`   ALL JWT SIGNING TESTS PASSED!`);
  console.log(`==================================================`);
};

runTests().catch(err => {
  console.error('Test run encountered an error:', err);
  process.exit(1);
});
