import apiClient from './client';

// GET /api/analytics/me - Returns cumulative personal analytics for the authenticated user
export const getMyAnalytics = () =>
  apiClient.get('/api/analytics/me').then((r) => r.data);
