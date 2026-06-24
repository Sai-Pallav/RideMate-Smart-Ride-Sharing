import express from 'express';
import { authenticateJWT } from '../../middleware/authMiddleware.js';

const router = express.Router();

// POST /cost/calculate
router.post('/calculate', authenticateJWT, (req, res) => {
  const { totalRideCost, totalDistanceKm, passengerDistanceKm } = req.body;
  console.log('[Cost Calculation] Calculating cost share. Body:', req.body);
  
  if (!totalRideCost || !totalDistanceKm || !passengerDistanceKm) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required parameters: totalRideCost, totalDistanceKm, passengerDistanceKm'
    });
  }

  // Simple proportional cost calculation math:
  // costShare = (passengerDistanceKm / totalDistanceKm) * totalRideCost
  const proportion = passengerDistanceKm / totalDistanceKm;
  const costShare = Math.round((proportion * totalRideCost) * 100) / 100;

  res.status(200).json({
    status: 'success',
    calculation: {
      totalRideCost,
      totalDistanceKm,
      passengerDistanceKm,
      proportion: Math.round(proportion * 100) / 100,
      costShare
    }
  });
});

// GET /cost/health
router.get('/health', (req, res) => {
  res.json({ service: 'Cost Calculation Service', status: 'OK' });
});

export default router;
