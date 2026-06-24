import apiClient from './client';

// POST /api/auth/register
export const registerUser = (data) =>
  apiClient.post('/api/auth/register', data).then((r) => r.data);

// POST /api/auth/verify-otp
export const verifyOtp = (data) =>
  apiClient.post('/api/auth/verify-otp', data).then((r) => r.data);

// POST /api/auth/login  (identifier = email or phone_number)
export const loginUser = (data) =>
  apiClient.post('/api/auth/login', data).then((r) => r.data);

// POST /api/auth/refresh
export const refreshToken = (data) =>
  apiClient.post('/api/auth/refresh', data).then((r) => r.data);

// POST /api/auth/recover  (trigger recovery OTP)
export const recoverAccount = (data) =>
  apiClient.post('/api/auth/recover', data).then((r) => r.data);

// POST /api/auth/reset-password
export const resetPassword = (data) =>
  apiClient.post('/api/auth/reset-password', data).then((r) => r.data);
