import apiClient from './client';

// POST /api/matching/search
// data: { pickup_location: { latitude, longitude }, drop_location: { latitude, longitude }, ride_date, preferred_time, time_window_hours }
export const searchRides = (data) =>
  apiClient.post('/api/matching/search', data).then((r) => r.data);

// GET /api/rides/:id
export const getRideById = (rideId) =>
  apiClient.get(`/api/rides/${rideId}`).then((r) => r.data);

// POST /api/rides  (driver publishes a ride)
export const createRide = (data) =>
  apiClient.post('/api/rides', data).then((r) => r.data);

// PUT /api/rides/:id/start
export const startRide = (rideId) =>
  apiClient.put(`/api/rides/${rideId}/start`).then((r) => r.data);

// PUT /api/rides/:id/complete  (driver side completion)
export const completeRide = (rideId) =>
  apiClient.put(`/api/rides/${rideId}/complete`).then((r) => r.data);

// GET /api/rides/history/:id  (single ride detail)

export const getRideHistoryDetail = (rideId) =>
  apiClient.get(`/api/rides/history/${rideId}`).then((r) => r.data);

/**
 * Maps search results to format expected by search cards and details screens.
 */
export const mapSearchResultToRide = (result) => {
  return {
    ...result,
    match_percentage: result.overlap_percentage || 0,
    match_scenario: (result.match_scenario || '').toLowerCase().includes('exact') ? 'exact' : 'partial',
    driver: {
      full_name: result.driver_name,
      rating: result.driver_rating || 5.0
    },
    driver_verified: result.driver_verified,
    vehicle_name: result.vehicle_name || (result.vehicle_type === 'car' ? 'Car' : 'Two-Wheeler'),
    vehicle: result.vehicle_name ? {
      color: '',
      make: result.vehicle_name,
      model: ''
    } : null,
    preferences: typeof result.preferences === 'string' ? JSON.parse(result.preferences) : (result.preferences || { gender: 'any', smoking: false, luggage: 'none' })
  };
};

// GET /api/profile/vehicles  (list driver's vehicles)
export const getMyVehicles = () =>
  apiClient.get('/api/profile/vehicles').then((r) => r.data);

// PUT /api/profile/vehicles/:id  (set a vehicle as active)
export const activateVehicle = (vehicleId) =>
  apiClient.put(`/api/profile/vehicles/${vehicleId}`, { is_active: true }).then((r) => r.data);

/**
 * Maps a booking to request card format expected by the RideRequestsScreen.
 */
export const mapBookingToRequestCard = (booking) => {
  const profile = booking.passengerProfile;
  return {
    request_id: booking.booking_id,
    ride_id: booking.ride_id,
    passenger_name: profile?.full_name || booking.passenger_name || 'Passenger',
    passenger_photo: profile?.photo_url || null,
    passenger_verified: !!(profile?.badges?.institution_verified || profile?.badges?.gov_id_verified),
    passenger_rating: profile?.aggregates?.rating || booking.driver_rating || 5.0,
    pickup_point: booking.pickup_label,
    drop_point: booking.drop_label,
    ride_route: `${booking.source_label} ➔ ${booking.destination_label}`,
    ride_time: booking.departure_time
  };
};

export const confirmBookingComplete = (bookingId) =>
  apiClient.put(`/api/bookings/${bookingId}/confirm-complete`).then((r) => r.data);

export const reportNoShow = (bookingId, data) =>
  apiClient.post(`/api/bookings/${bookingId}/no-show`, data).then((r) => r.data);

export const getRideHistory = (params) =>
  apiClient.get('/api/bookings', { params }).then((r) => r.data);

export const submitRating = (data) =>
  apiClient.post('/api/ratings', data).then((r) => r.data);

export const submitReview = (data) =>
  apiClient.post('/api/reviews', data).then((r) => r.data);

export const mapBookingToHistoryItem = (booking) => {
  const isPassenger = booking.role === 'passenger';
  let formattedDate = 'Today';
  if (booking.ride_date) {
    try {
      const d = new Date(booking.ride_date);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      } else {
        formattedDate = booking.ride_date;
      }
    } catch {
      formattedDate = booking.ride_date;
    }
  }

  const localStorageKey = `rated_booking_${booking.booking_id}`;
  const localRating = typeof window !== 'undefined' ? window.localStorage.getItem(localStorageKey) : null;

  return {
    history_id: booking.booking_id,
    role: booking.role || 'passenger',
    ride_id: booking.ride_id,
    passenger_id: booking.passenger_id,
    driver_id: booking.driver_id,
    source_label: booking.source_label || booking.pickup_label || 'Pickup',
    destination_label: booking.destination_label || booking.drop_label || 'Dropoff',
    ride_date: formattedDate,
    raw_date: booking.ride_date,
    departure_time: booking.departure_time || '9:00 AM',
    co_traveler_name: isPassenger ? (booking.driver_name || 'Driver') : (booking.passenger_name || 'Passenger'),
    co_traveler_rating: isPassenger ? (booking.driver_rating || 4.8) : 5.0,
    cost: parseFloat(booking.calculated_cost_share || booking.cost_share || 0),
    distance_km: parseFloat(booking.distance_traveled_km || 10),
    rating_given: localRating ? parseInt(localRating, 10) : null
  };
};



