import apiClient from './client';

// ─── Report Queue ─────────────────────────────────────────────────────────────

// GET /api/admin/reports
export const getAdminReports = (params) =>
  apiClient.get('/api/admin/reports', { params }).then((r) => r.data);

// PUT /api/admin/reports/:id/resolve
export const resolveReport = (reportId, data) =>
  apiClient.put(`/api/admin/reports/${reportId}/resolve`, data).then((r) => r.data);

// ─── User Management ──────────────────────────────────────────────────────────

// GET /api/admin/users  — search users
export const searchAdminUsers = (params) =>
  apiClient.get('/api/admin/users', { params }).then((r) => r.data);

// PUT /api/admin/users/:id/status  — suspend/ban/activate
export const updateUserStatus = (userId, data) =>
  apiClient.put(`/api/admin/users/${userId}/status`, data).then((r) => r.data);

// ─── Safety Metrics ───────────────────────────────────────────────────────────

// GET /api/admin/metrics/safety
export const getSafetyMetrics = () =>
  apiClient.get('/api/admin/metrics/safety').then((r) => r.data);

// ─── Verification Queue ───────────────────────────────────────────────────────

// GET /api/admin/verifications
export const getVerificationQueue = (params) =>
  apiClient.get('/api/admin/verifications', { params }).then((r) => r.data);

// PUT /api/admin/verifications/:id  — approve or reject
export const processVerification = (verificationId, data) =>
  apiClient.put(`/api/admin/verifications/${verificationId}`, data).then((r) => r.data);

// ─── Ride Audit Log ───────────────────────────────────────────────────────────

// GET /api/admin/rides/:id
export const getAdminRideDetail = (rideId) =>
  apiClient.get(`/api/admin/rides/${rideId}`).then((r) => r.data);
