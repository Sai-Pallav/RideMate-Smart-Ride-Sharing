const BASE_URL = 'http://localhost:5000/api';
const HEALTH_URL = 'http://localhost:5000/health';

const runTests = async () => {
  console.log('==================================================');
  console.log('🧪 Starting Scaffold Endpoint Testing');
  console.log('==================================================\n');

  try {
    // 1. Health Check
    const healthRes = await fetch(HEALTH_URL);
    const healthData = await healthRes.json();
    console.log('✔ GET /health:', healthRes.status, healthData);

    // 2. Auth - Register
    const registerRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '+15550199', email: 'sai.pallav@institution.edu' })
    });
    const registerData = await registerRes.json();
    console.log('✔ POST /api/auth/register:', registerRes.status, registerData);

    // 3. Auth - Verify OTP
    const verifyOtpRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '+15550199', otp: '123456' })
    });
    const verifyOtpData = await verifyOtpRes.json();
    console.log('✔ POST /api/auth/verify-otp:', verifyOtpRes.status, verifyOtpData);

    // Set authorization header for subsequent requests
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${verifyOtpData.token}`
    };

    // 4. Profile - Get Me
    const profileMeRes = await fetch(`${BASE_URL}/profile/me`, { headers });
    const profileMeData = await profileMeRes.json();
    console.log('✔ GET /api/profile/me:', profileMeRes.status, profileMeData);

    // 5. Profile - Get ID
    const profileIdRes = await fetch(`${BASE_URL}/profile/user-123`, { headers });
    const profileIdData = await profileIdRes.json();
    console.log('✔ GET /api/profile/:id:', profileIdRes.status, profileIdData);

    // 6. Ride Management - Create
    const createRideRes = await fetch(`${BASE_URL}/rides`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ origin: 'Campus Main Gate', destination: 'Downtown Station', seatsAvailable: 3 })
    });
    const createRideData = await createRideRes.json();
    console.log('✔ POST /api/rides:', createRideRes.status, createRideData);

    // 7. Ride Management - Get ID
    const getRideRes = await fetch(`${BASE_URL}/rides/ride-9988-7766`, { headers });
    const getRideData = await getRideRes.json();
    console.log('✔ GET /api/rides/:id:', getRideRes.status, getRideData);

    // 8. Matching Engine - Search
    const searchRes = await fetch(`${BASE_URL}/matching/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ pickup: 'Campus Main Gate', drop: 'Downtown Station', time: new Date().toISOString() })
    });
    const searchData = await searchRes.json();
    console.log('✔ POST /api/matching/search:', searchRes.status, searchData);

    // 9. Booking - Request
    const requestBookingRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ rideId: 'ride-9988-7766', seatsRequested: 1 })
    });
    const requestBookingData = await requestBookingRes.json();
    console.log('✔ POST /api/bookings:', requestBookingRes.status, requestBookingData);

    // 10. Booking - Confirm
    const confirmBookingRes = await fetch(`${BASE_URL}/bookings/booking-1122-3344/confirm`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'accept' })
    });
    const confirmBookingData = await confirmBookingRes.json();
    console.log('✔ POST /api/bookings/:id/confirm:', confirmBookingRes.status, confirmBookingData);

    // 11. Cost Calculation
    const calculateCostRes = await fetch(`${BASE_URL}/cost/calculate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ totalRideCost: 15.00, totalDistanceKm: 10, passengerDistanceKm: 6 })
    });
    const calculateCostData = await calculateCostRes.json();
    console.log('✔ POST /api/cost/calculate:', calculateCostRes.status, calculateCostData);

    // 12. Rating and Review
    const submitRatingRes = await fetch(`${BASE_URL}/ratings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ bookingId: 'booking-1122-3344', targetUserId: 'driver-1', rating: 5, comment: 'Great driver!' })
    });
    const submitRatingData = await submitRatingRes.json();
    console.log('✔ POST /api/ratings:', submitRatingRes.status, submitRatingData);

    // 13. Admin - Report
    const fileReportRes = await fetch(`${BASE_URL}/admin/reports`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ category: 'safety', detail: 'Driver took wrong route', urgency: 'Standard' })
    });
    const fileReportData = await fileReportRes.json();
    console.log('✔ POST /api/admin/reports:', fileReportRes.status, fileReportData);

    // 14. Safety - SOS Trigger
    const triggerSosRes = await fetch(`${BASE_URL}/safety/trigger`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ location: { lat: 37.7749, lng: -122.4194 }, rideId: 'ride-9988-7766' })
    });
    const triggerSosData = await triggerSosRes.json();
    console.log('✔ POST /api/safety/trigger:', triggerSosRes.status, triggerSosData);

    // 15. Notifications - Send
    const sendNotifRes = await fetch(`${BASE_URL}/notifications/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ targetUserId: 'passenger-user-id', title: 'Ride Reminder', body: 'Your ride is arriving in 10 minutes.' })
    });
    const sendNotifData = await sendNotifRes.json();
    console.log('✔ POST /api/notifications/send:', sendNotifRes.status, sendNotifData);

    console.log('\n==================================================');
    console.log('🎉 All scaffold endpoints tested successfully!');
    console.log('==================================================');

  } catch (err) {
    console.error('❌ Testing encountered an error:', err);
  }
};

runTests();
