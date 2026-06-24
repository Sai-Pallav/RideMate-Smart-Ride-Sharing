import apiClient from './client';

// GET /api/bookings  — pass status param for filtering
// status: 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled'
export const getBookings = (params) =>
  apiClient.get('/api/bookings', { params }).then((r) => r.data);

// GET /api/bookings/:id
export const getBookingById = (bookingId) =>
  apiClient.get(`/api/bookings/${bookingId}`).then((r) => r.data);

// POST /api/bookings  — passenger joins a ride
export const createBooking = (data) =>
  apiClient.post('/api/bookings', data).then((r) => r.data);

// PUT /api/bookings/:id/accept  — driver accepts
export const acceptBooking = (bookingId) =>
  apiClient.put(`/api/bookings/${bookingId}/accept`).then((r) => r.data);

// PUT /api/bookings/:id/decline  — driver declines
export const declineBooking = (bookingId) =>
  apiClient.put(`/api/bookings/${bookingId}/decline`).then((r) => r.data);

// PUT /api/bookings/:id/cancel  — passenger or driver cancels
export const cancelBooking = (bookingId) =>
  apiClient.put(`/api/bookings/${bookingId}/cancel`).then((r) => r.data);

// PUT /api/bookings/:id/confirm-complete  — passenger confirms completion
export const confirmCompleteBooking = (bookingId) =>
  apiClient.put(`/api/bookings/${bookingId}/confirm-complete`).then((r) => r.data);

// PUT /api/bookings/:id/no-show  — driver marks passenger as no-show
export const markNoShow = (bookingId) =>
  apiClient.put(`/api/bookings/${bookingId}/no-show`).then((r) => r.data);
