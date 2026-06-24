import apiClient from './client';

// ─── Profile ─────────────────────────────────────────────────────────────────

// GET /api/profile/me
export const getMyProfile = () =>
  apiClient.get('/api/profile/me').then((r) => r.data);

// PUT /api/profile/me
export const updateMyProfile = (data) =>
  apiClient.put('/api/profile/me', data).then((r) => r.data);

// GET /api/profile/:userId  — public profile
export const getPublicProfile = (userId) =>
  apiClient.get(`/api/profile/${userId}`).then((r) => r.data);

// GET /api/users/:userId/reviews  — public reviews
export const getUserReviews = (userId) =>
  apiClient.get(`/api/users/${userId}/reviews`).then((r) => r.data);

// ─── Vehicles ────────────────────────────────────────────────────────────────

// GET /api/profile/vehicles
export const getVehicles = () =>
  apiClient.get('/api/profile/vehicles').then((r) => r.data);

// POST /api/profile/vehicles
export const addVehicle = (data) =>
  apiClient.post('/api/profile/vehicles', data).then((r) => r.data);

// PUT /api/profile/vehicles/:id
export const updateVehicle = (vehicleId, data) =>
  apiClient.put(`/api/profile/vehicles/${vehicleId}`, data).then((r) => r.data);

// DELETE /api/profile/vehicles/:id
export const deleteVehicle = (vehicleId) =>
  apiClient.delete(`/api/profile/vehicles/${vehicleId}`).then((r) => r.data);

// ─── Emergency Contacts ───────────────────────────────────────────────────────

// GET /api/profile/emergency-contacts
export const getEmergencyContacts = () =>
  apiClient.get('/api/profile/emergency-contacts').then((r) => r.data);

// POST /api/profile/emergency-contacts
export const addEmergencyContact = (data) =>
  apiClient.post('/api/profile/emergency-contacts', data).then((r) => r.data);

// DELETE /api/profile/emergency-contacts/:id
export const deleteEmergencyContact = (contactId) =>
  apiClient.delete(`/api/profile/emergency-contacts/${contactId}`).then((r) => r.data);

// ─── Notification Preferences ─────────────────────────────────────────────────

// GET /api/profile/notification-preferences
export const getNotificationPrefs = () =>
  apiClient.get('/api/profile/notification-preferences').then((r) => r.data);

// PUT /api/profile/notification-preferences
export const updateNotificationPrefs = (data) =>
  apiClient.put('/api/profile/notification-preferences', data).then((r) => r.data);
