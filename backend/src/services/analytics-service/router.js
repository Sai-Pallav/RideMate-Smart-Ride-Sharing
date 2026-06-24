import express from 'express';
import { authenticateJWT } from '../../middleware/authMiddleware.js';
import db from '../../../models/index.js';

const router = express.Router();

// GET /api/analytics/me
// Returns cumulative personal analytics for the authenticated user.
router.get('/me', authenticateJWT, async (req, res) => {
  const userId = req.user.id;

  try {
    const analytics = await db.UserAnalytics.findOne({
      where: { user_id: userId }
    });

    // If no analytics record exists, return a default zeroed structure
    if (!analytics) {
      return res.status(200).json({
        status: 'success',
        data: {
          user_id: userId,
          total_rides: 0,
          total_distance_shared_km: 0.00,
          total_fuel_saved_liters: 0.0000,
          total_co2_avoided_kg: 0.0000,
          total_cost_saved: 0.00
        }
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user_id: parseInt(analytics.user_id, 10),
        total_rides: parseInt(analytics.total_rides, 10),
        total_distance_shared_km: parseFloat(analytics.total_distance_shared_km),
        total_fuel_saved_liters: parseFloat(analytics.total_fuel_saved_liters),
        total_co2_avoided_kg: parseFloat(analytics.total_co2_avoided_kg),
        total_cost_saved: parseFloat(analytics.total_cost_saved)
      }
    });

  } catch (error) {
    console.error(`[Analytics Service] Error fetching analytics for User ${userId}:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching personal analytics'
    });
  }
});

// GET /api/analytics/platform
// Returns platform-wide cumulative aggregates. Public endpoint.
router.get('/platform', async (req, res) => {
  try {
    const aggregates = await db.UserAnalytics.findOne({
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('total_rides')), 'total_rides'],
        [db.sequelize.fn('SUM', db.sequelize.col('total_distance_shared_km')), 'total_distance_shared_km'],
        [db.sequelize.fn('SUM', db.sequelize.col('total_fuel_saved_liters')), 'total_fuel_saved_liters'],
        [db.sequelize.fn('SUM', db.sequelize.col('total_co2_avoided_kg')), 'total_co2_avoided_kg'],
        [db.sequelize.fn('SUM', db.sequelize.col('total_cost_saved')), 'total_cost_saved']
      ],
      raw: true
    });

    const totalRides = parseInt(aggregates?.total_rides || 0, 10);
    const totalDistance = parseFloat(aggregates?.total_distance_shared_km || 0);
    const totalFuel = parseFloat(aggregates?.total_fuel_saved_liters || 0);
    const totalCo2 = parseFloat(aggregates?.total_co2_avoided_kg || 0);
    const totalCost = parseFloat(aggregates?.total_cost_saved || 0);

    res.status(200).json({
      status: 'success',
      data: {
        total_rides: totalRides,
        total_distance_shared_km: parseFloat(totalDistance.toFixed(2)),
        total_fuel_saved_liters: parseFloat(totalFuel.toFixed(4)),
        total_co2_avoided_kg: parseFloat(totalCo2.toFixed(4)),
        total_cost_saved: parseFloat(totalCost.toFixed(2))
      }
    });

  } catch (error) {
    console.error('[Analytics Service] Error fetching platform-wide analytics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching platform analytics'
    });
  }
});

// GET /health
router.get('/health', (req, res) => {
  res.json({ service: 'Analytics Service', status: 'OK' });
});

import { initAnalyticsListeners } from './analyticsDispatcher.js';
initAnalyticsListeners();

export default router;
