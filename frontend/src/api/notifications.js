import apiClient from './client';

// GET /api/notifications - Get paginated user notifications
export const getNotifications = (params) =>
  apiClient.get('/api/notifications', { params }).then((r) => r.data);

// PUT /api/notifications/:id/read - Mark specific notification as read
export const markNotificationRead = (id) =>
  apiClient.put(`/api/notifications/${id}/read`).then((r) => r.data);

// PUT /api/notifications/read-all - Mark all notifications as read
export const markAllRead = () =>
  apiClient.put('/api/notifications/read-all').then((r) => r.data);

// GET /api/notifications/preferences - Retrieve user notification preferences
export const getNotificationPreferences = () =>
  apiClient.get('/api/notifications/preferences').then((r) => r.data);

// PUT /api/notifications/preferences - Update user notification preferences
export const updateNotificationPreferences = (prefs) =>
  apiClient.put('/api/notifications/preferences', { preferences: prefs }).then((r) => r.data);
