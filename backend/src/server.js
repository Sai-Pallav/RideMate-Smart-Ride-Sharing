import express from 'express';
import http from 'http';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import service routers
import authRouter from './services/auth-service/router.js';
import profileRouter from './services/profile-verification-service/router.js';
import rideRouter from './services/ride-management-service/router.js';
import matchingRouter from './services/matching-engine-service/router.js';
import bookingRouter from './services/booking-service/router.js';
import costRouter from './services/cost-calculation-service/router.js';
import ratingRouter, { reviewsRouter, usersRouter } from './services/rating-review-service/router.js';
import adminRouter from './services/admin-moderation-service/router.js';
import safetyRouter from './services/safety-sos-service/router.js';
import notificationRouter from './services/notification-service/router.js';
import reportingRouter from './services/reporting-service/router.js';
import analyticsRouter from './services/analytics-service/router.js';

// Import socket gateway
import { initSocketGateway } from './socket/index.js';

// Load configurations
dotenv.config();

const app = express();
const server = http.createServer(app);

// Enable middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    message: 'Community Ride Sharing core backend is active and healthy.'
  });
});

// Mount service routers
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/rides', rideRouter);
app.use('/api/matching', matchingRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/cost', costRouter);
app.use('/api/ratings', ratingRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/users', usersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/safety', safetyRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/reports', reportingRouter);
app.use('/api/analytics', analyticsRouter);

// Initialize Socket.IO Gateway
initSocketGateway(server);

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`👉 Access health check: http://localhost:${PORT}/health`);
  console.log(`==================================================`);
});
