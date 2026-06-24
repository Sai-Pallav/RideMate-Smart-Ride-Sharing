import apiClient from './client';

// POST /api/reports  — submit a report against a user or ride
export const submitReport = (data) =>
  apiClient.post('/api/reports', data).then((r) => r.data);

// GET /api/reports  — get own reports
export const getMyReports = () =>
  apiClient.get('/api/reports').then((r) => r.data);
