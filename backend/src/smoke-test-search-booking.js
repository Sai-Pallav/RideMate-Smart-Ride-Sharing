const BASE_URL = 'http://localhost:5000/api';

const testPassenger = {
  phone_number: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
  email: `passenger.${Date.now()}@institution.edu`,
  password: 'Password@123',
  full_name: 'Passenger Jane'
};

const pickupCoords = { latitude: 37.775, longitude: -122.418 };
const dropCoords = { latitude: 37.789, longitude: -122.401 };

async function runSearchBookingSmokeTest() {
  console.log('🧪 Starting Search & Booking Flow Integration Smoke Test...');
  
  try {
    // 1. Register Passenger
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPassenger)
    });
    console.log('1. Register Passenger status:', regRes.status);
    
    // 2. Verify OTP
    const verifyRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone_number: testPassenger.phone_number,
        otp: '123456'
      })
    });
    console.log('2. Verify OTP status:', verifyRes.status);
    const verifyData = await verifyRes.json();
    const token = verifyData.data.accessToken;

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // Add Emergency Contact (required to book)
    const contactRes = await fetch(`${BASE_URL}/profile/emergency-contacts`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        contact_name: 'Passenger Contact',
        contact_phone: '9999999999'
      })
    });
    console.log('2b. Add Emergency Contact status:', contactRes.status);

    // 3. Search for Rides (POST /matching/search)
    const todayStr = new Date().toISOString().split('T')[0];
    const searchRes = await fetch(`${BASE_URL}/matching/search`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        pickup_location: pickupCoords,
        drop_location: dropCoords,
        ride_date: todayStr,
        preferred_time: '08:30:00',
        time_window_hours: 2.0
      })
    });
    console.log('3. Search response status:', searchRes.status);
    const searchData = await searchRes.json();
    console.log('3. Search results count:', searchData.data?.results_count);
    
    if (!searchData.data || searchData.data.results_count === 0) {
      throw new Error('No matched rides found in search response. Database might not be seeded correctly.');
    }

    const matchedRide = searchData.data.results[0];
    console.log('Found Matched Ride ID:', matchedRide.ride_id);
    console.log('Driver Name:', matchedRide.driver_name);
    console.log('Cost Share:', matchedRide.cost_share);
    console.log('Match Scenario:', matchedRide.match_scenario);

    // Verify coordinates and extra fields are forwarded
    if (matchedRide.total_seats === undefined || matchedRide.preferences === undefined) {
      throw new Error('Candidate ride pass-through properties (seats, preferences) are missing.');
    }

    // 4. Fetch Ride Details (GET /rides/:id)
    const detailsRes = await fetch(`${BASE_URL}/rides/${matchedRide.ride_id}`, {
      headers: authHeaders
    });
    console.log('4. Fetch Ride Details status:', detailsRes.status);
    const detailsData = await detailsRes.json();
    console.log('Ride details fetched for ride_id:', detailsData.data?.ride_id);
    console.log('Ride vehicle:', JSON.stringify(detailsData.data?.vehicle));

    // 5. Submit Booking request to join (POST /bookings)
    const bookingRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        ride_id: matchedRide.ride_id,
        pickup_location: pickupCoords,
        pickup_label: 'Academic Block A',
        drop_location: dropCoords,
        drop_label: 'Metro Station Terminal 2',
        preferred_time: matchedRide.departure_time
      })
    });
    console.log('5. Request to Join status:', bookingRes.status);
    const bookingData = await bookingRes.json();
    console.log('5. Booking response:', JSON.stringify(bookingData, null, 2));

    if (bookingRes.status !== 201) {
      throw new Error(`Booking request failed with status ${bookingRes.status}: ${bookingData.message}`);
    }

    console.log('\n🎉 PASSENGER DISCOVERY & BOOKING INTEGRATION SMOKE TEST PASSED!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Integration Test Failed:', error);
    process.exit(1);
  }
}

runSearchBookingSmokeTest();
