import express from 'express';
import { authenticateJWT } from '../../middleware/authMiddleware.js';
import db from '../../../models/index.js';
import { findMatches } from './matchingEngine.js';

const router = express.Router();

// Helper: Format MySQL geometry POINT to plain lat/lng object
const formatPoint = (loc) => {
  if (!loc) return null;
  if (loc.coordinates && Array.isArray(loc.coordinates)) {
    return {
      latitude: loc.coordinates[1],
      longitude: loc.coordinates[0]
    };
  }
  return loc;
};

/**
 * POST /matching/search
 * Searches for matches for a passenger's requested trip against available driver rides.
 * 
 * Request body:
 * {
 *   "pickup_location": { "latitude": 37.7749, "longitude": -122.4194 },
 *   "drop_location": { "latitude": 37.7891, "longitude": -122.4014 },
 *   "ride_date": "2026-06-25",
 *   "preferred_time": "08:30:00",
 *   "time_window_hours": 2.0
 * }
 */
router.post('/search', authenticateJWT, async (req, res) => {
  const { pickup_location, drop_location, ride_date, preferred_time, time_window_hours } = req.body;

  // 1. Validate inputs
  if (!pickup_location || !drop_location || !ride_date || !preferred_time) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required parameters: pickup_location, drop_location, ride_date, preferred_time'
    });
  }

  if (pickup_location.latitude === undefined || pickup_location.longitude === undefined ||
      drop_location.latitude === undefined || drop_location.longitude === undefined) {
    return res.status(400).json({
      status: 'error',
      message: 'pickup_location and drop_location must contain latitude and longitude'
    });
  }

  try {
    // 2. Fetch candidate scheduled rides for that date
    // Note: This database access layer is UNVERIFIED until a live MySQL connection is available.
    const candidateRidesRaw = await db.Ride.findAll({
      where: {
        ride_date,
        status: 'scheduled'
      },
      include: [
        {
          model: db.User,
          as: 'Driver',
          include: [{ model: db.Profile, as: 'Profile' }]
        },
        { model: db.Vehicle, as: 'Vehicle' },
        { model: db.RideStop, as: 'Stops' }
      ]
    });

    // 3. Convert MySQL spatial POINT fields to plain objects for the pure matching algorithm
    const candidateRides = candidateRidesRaw.map(ride => {
      const source_location = formatPoint(ride.source_location);
      const destination_location = formatPoint(ride.destination_location);
      
      const stops = (ride.Stops || []).map(s => ({
        stop_id: s.stop_id,
        sequence_order: s.sequence_order,
        stop_label: s.stop_label,
        stop_location: formatPoint(s.stop_location),
        distance_from_source_km: parseFloat(s.distance_from_source_km)
      })).sort((a, b) => a.sequence_order - b.sequence_order);

      // Driver rating defaults to 5.0 for rating table placeholder, driver verification status is pulled from User.phone_verified
      const driver_rating = 5.0; // Placeholder rating stub
      const driver_verified = ride.Driver?.phone_verified || false;

      return {
        ride_id: ride.ride_id,
        driver_id: ride.driver_id,
        driver_name: ride.Driver?.Profile?.full_name || 'Driver',
        driver_rating,
        driver_verified,
        vehicle_type: ride.Vehicle?.vehicle_type || 'car',
        vehicle_name: ride.Vehicle ? `${ride.Vehicle.color} ${ride.Vehicle.make} ${ride.Vehicle.model}`.trim() : 'Vehicle',
        source_label: ride.source_label,
        source_location,
        destination_label: ride.destination_label,
        destination_location,
        ride_date: ride.ride_date,
        departure_time: ride.departure_time,
        total_seats: ride.total_seats,
        available_seats: ride.available_seats,
        estimated_distance_km: parseFloat(ride.estimated_distance_km),
        estimated_total_cost: parseFloat(ride.estimated_total_cost),
        preferences: ride.preferences,
        stops
      };
    });

    // 4. Run the pure matching logic
    const config = {
      MAX_PROXIMITY_DISTANCE_KM: 1.0,  // Maximum distance to walk to a stop
      MIN_OVERLAP_THRESHOLD_PCT: 20.0, // Minimum shared route distance percentage
      AVERAGE_SPEED_KM_H: 40.0         // Average city vehicle speed
    };

    const matchedRides = findMatches(
      {
        pickup_location,
        drop_location,
        ride_date,
        preferred_time,
        time_window_hours: parseFloat(time_window_hours || '2.0')
      },
      candidateRides,
      config
    );

    res.status(200).json({
      status: 'success',
      data: {
        results_count: matchedRides.length,
        results: matchedRides
      }
    });

  } catch (error) {
    console.error('[Matching Service] Error searching for matches:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during match search'
    });
  }
});

// GET /matching/health
router.get('/health', (req, res) => {
  res.json({ service: 'Matching Engine Service', status: 'OK' });
});

export default router;
