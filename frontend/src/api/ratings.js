import apiClient from './client';

// POST /api/ratings  — submit a rating and review for a booking
export const submitRating = (data) =>
  apiClient.post('/api/ratings', data).then((r) => r.data);

// GET /api/ratings/user/:userId  — get ratings for a user (public profile)
export const getUserRatings = (userId) =>
  apiClient.get(`/api/ratings/user/${userId}`).then((r) => r.data);
