import apiClient from './client';

// GET /api/safety/contacts
export const getContacts = () =>
  apiClient.get('/api/safety/contacts').then((r) => r.data);

// POST /api/safety/sos/trigger
// Expected body: { location: { latitude, longitude }, rideId }
export const triggerSOS = (data) => {
  const payload = {
    rideId: data.ride_id || data.rideId,
    location: {
      latitude: data.trigger_lat !== undefined ? data.trigger_lat : data.location?.latitude,
      longitude: data.trigger_lng !== undefined ? data.trigger_lng : data.location?.longitude,
    },
  };
  return apiClient.post('/api/safety/sos/trigger', payload).then((r) => r.data);
};

// POST /api/safety/sos/:alertId/cancel
export const cancelSOS = (alertId) =>
  apiClient.post(`/api/safety/sos/${alertId}/cancel`).then((r) => r.data);

// POST /api/safety/live-location/start
// Expected body: { rideId, contactId }
export const startLiveLocation = (data) => {
  const payload = {
    rideId: data.ride_id || data.rideId,
    contactId: data.contact_id || data.contactId,
  };
  return apiClient.post('/api/safety/live-location/start', payload).then((r) => r.data);
};

// POST /api/safety/live-location/stop
// Expected body: { rideId }
export const stopLiveLocation = (data) => {
  const payload = {
    rideId: data.ride_id || data.rideId,
  };
  return apiClient.post('/api/safety/live-location/stop', payload).then((r) => r.data);
};

// Note: There is no REST endpoint for live location updates (e.g. updateLiveLocation)
// in the safety service backend. Real-time coordinate updating is Socket.IO-based.
// We skip wiring this call as a REST client call to prevent fabricating an endpoint.
