import express from 'express';
import { authenticateJWT } from '../../middleware/authMiddleware.js';
import db from '../../../models/index.js';
import { findMatches } from '../matching-engine-service/matchingEngine.js';
import eventBus from '../../utils/eventBus.js';
import { calculateCostShare } from '../cost-calculation-service/costCalculator.js';
import { isBookingExpired, isLateCancellation } from './stateMachine.js';

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

// POST /bookings (Request to Join)
router.post('/', authenticateJWT, async (req, res) => {
  const passengerId = req.user.id;
  const { ride_id, pickup_location, pickup_label, drop_location, drop_label, preferred_time } = req.body;

  if (!ride_id || !pickup_location || !pickup_label || !drop_location || !drop_label) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required parameters: ride_id, pickup_location, pickup_label, drop_location, drop_label'
    });
  }

  try {
    // 1. Fetch Ride details (UNVERIFIED DB Layer)
    const ride = await db.Ride.findByPk(ride_id, {
      include: [{ model: db.RideStop, as: 'Stops' }]
    });

    if (!ride) {
      return res.status(404).json({
        status: 'error',
        message: 'Ride not found'
      });
    }

    // Enforce state logic
    if (ride.status !== 'scheduled') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot request to join a ride that is already: ${ride.status}`
      });
    }

    // Enforce business rules
    if (ride.driver_id === passengerId) {
      return res.status(403).json({
        status: 'error',
        message: 'You cannot request to join your own published ride'
      });
    }

    if (ride.available_seats <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'This ride has no available seats remaining'
      });
    }

    // Enforce overlapping pending bookings check
    const pendingBookings = await db.Booking.findAll({
      where: {
        passenger_id: passengerId,
        booking_status: 'pending'
      },
      include: [{
        model: db.Ride,
        as: 'Ride',
        where: {
          ride_date: ride.ride_date
        }
      }]
    });

    const newTimeVal = ride.departure_time.split(':').map(Number);
    const newSeconds = (newTimeVal[0] || 0) * 3600 + (newTimeVal[1] || 0) * 60;

    for (const b of pendingBookings) {
      // Lazy Expiry Check (FR-6.4)
      if (isBookingExpired(b.Ride.ride_date, b.Ride.departure_time)) {
        b.booking_status = 'expired';
        await b.save();
        continue;
      }

      const existingTimeVal = b.Ride.departure_time.split(':').map(Number);
      const existingSeconds = (existingTimeVal[0] || 0) * 3600 + (existingTimeVal[1] || 0) * 60;

      if (Math.abs(newSeconds - existingSeconds) < 2 * 3600) {
        return res.status(400).json({
          status: 'error',
          message: 'You already have an active pending request in an overlapping time window on this date.'
        });
      }
    }

    // 2. Validate route overlap and retrieve details using the matching engine
    const candidateRide = {
      ride_id: ride.ride_id,
      driver_id: ride.driver_id,
      driver_name: 'Driver',
      driver_rating: 5.0,
      driver_verified: true,
      vehicle_type: 'car',
      source_label: ride.source_label,
      source_location: formatPoint(ride.source_location),
      destination_label: ride.destination_label,
      destination_location: formatPoint(ride.destination_location),
      ride_date: ride.ride_date,
      departure_time: ride.departure_time,
      total_seats: ride.total_seats,
      available_seats: ride.available_seats,
      estimated_distance_km: parseFloat(ride.estimated_distance_km),
      estimated_total_cost: parseFloat(ride.estimated_total_cost),
      stops: (ride.Stops || []).map(s => ({
        stop_id: s.stop_id,
        sequence_order: s.sequence_order,
        stop_label: s.stop_label,
        stop_location: formatPoint(s.stop_location),
        distance_from_source_km: parseFloat(s.distance_from_source_km)
      }))
    };

    const matches = findMatches(
      {
        pickup_location,
        drop_location,
        ride_date: ride.ride_date,
        preferred_time: preferred_time || ride.departure_time,
        time_window_hours: 2.0
      },
      [candidateRide],
      {
        MAX_PROXIMITY_DISTANCE_KM: 1.0,
        MIN_OVERLAP_THRESHOLD_PCT: 20.0,
        AVERAGE_SPEED_KM_H: 40.0
      }
    );

    if (matches.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Requested pickup/drop locations do not match this ride\'s route, or fail overlap requirements.'
      });
    }

    const matchDetails = matches[0];
    const distance_traveled_km = parseFloat(((matchDetails.overlap_percentage / 100) * ride.estimated_distance_km).toFixed(2));
    const calculated_cost_share = matchDetails.cost_share; // Locked at request time

    // 3. Create booking record
    const matchScenarioMap = {
      'Scenario 1: Exact Match': 'exact',
      'Scenario 2: Partial Match (Passenger Exits Early)': 'partial_exit',
      'Scenario 3: Partial Match (Passenger Joins Mid-Route)': 'partial_pickup',
      'Combined Scenario 2+3: Mid-Route Pickup AND Early Exit': 'partial_exit'
    };
    const mappedScenario = matchScenarioMap[matchDetails.match_scenario] || 'exact';

    const booking = await db.Booking.create({
      ride_id,
      passenger_id: passengerId,
      pickup_label,
      pickup_location: db.sequelize.fn('ST_GeomFromText', `POINT(${pickup_location.latitude} ${pickup_location.longitude})`, 4326),
      drop_label,
      drop_location: db.sequelize.fn('ST_GeomFromText', `POINT(${drop_location.latitude} ${drop_location.longitude})`, 4326),
      distance_traveled_km,
      calculated_cost_share,
      booking_status: 'pending',
      match_scenario: mappedScenario,
      requested_at: new Date()
    });

    eventBus.emit('bookingRequested', {
      bookingId: booking.booking_id,
      passengerId: booking.passenger_id,
      driverId: ride.driver_id,
      rideId: booking.ride_id
    });

    res.status(201).json({
      status: 'success',
      message: 'Join request submitted successfully. Awaiting driver approval.',
      data: {
        booking_id: booking.booking_id,
        ride_id: booking.ride_id,
        passenger_id: booking.passenger_id,
        pickup_label,
        drop_label,
        distance_traveled_km,
        calculated_cost_share,
        booking_status: booking.booking_status,
        match_scenario: booking.match_scenario
      }
    });

  } catch (error) {
    console.error('[Booking Service] Error requesting ride join:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while requesting ride join'
    });
  }
});

// PUT /api/bookings/:id/accept (Driver accepts request)
router.put('/:id/accept', authenticateJWT, async (req, res) => {
  const bookingId = parseInt(req.params.id, 10);
  const driverId = req.user.id;

  try {
    const booking = await db.Booking.findByPk(bookingId, {
      include: [
        { model: db.Ride, as: 'Ride' },
        { model: db.User, as: 'Passenger' }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking request not found'
      });
    }

    if (booking.Ride.driver_id !== driverId) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized: Only the driver of this ride can accept requests.'
      });
    }

    if (booking.booking_status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: `Booking is not pending (current status: ${booking.booking_status})`
      });
    }

    const ride = booking.Ride;
    if (ride.available_seats <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot accept request. No seats available on this ride.'
      });
    }

    // Execute in transaction
    await db.sequelize.transaction(async (t) => {
      booking.booking_status = 'confirmed';
      booking.confirmed_at = new Date();
      await booking.save({ transaction: t });

      ride.available_seats = ride.available_seats - 1;
      await ride.save({ transaction: t });
    });

    // Unmasked contact details logs (FR-6.3)
    const driver = await db.User.findByPk(driverId);

    console.log(`[Booking Service] Booking ${bookingId} confirmed — contact details shared via API response.`);

    eventBus.emit('bookingAccepted', {
      bookingId: booking.booking_id,
      passengerId: booking.passenger_id,
      driverId,
      rideId: booking.ride_id
    });

    res.status(200).json({
      status: 'success',
      message: 'Booking request accepted. Contact details shared.',
      data: {
        booking_id: booking.booking_id,
        booking_status: booking.booking_status,
        confirmed_at: booking.confirmed_at,
        driver_contact: {
          phone_number: driver.phone_number,
          email: driver.email
        },
        passenger_contact: {
          phone_number: booking.Passenger?.phone_number,
          email: booking.Passenger?.email
        }
      }
    });

  } catch (error) {
    console.error('[Booking Service] Error accepting booking:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while accepting booking'
    });
  }
});

// PUT /api/bookings/:id/decline (Driver declines request)
router.put('/:id/decline', authenticateJWT, async (req, res) => {
  const bookingId = parseInt(req.params.id, 10);
  const driverId = req.user.id;

  try {
    const booking = await db.Booking.findByPk(bookingId, {
      include: [{ model: db.Ride, as: 'Ride' }]
    });

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking request not found'
      });
    }

    if (booking.Ride.driver_id !== driverId) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized: Only the driver can decline requests.'
      });
    }

    if (booking.booking_status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: `Booking is not pending (current status: ${booking.booking_status})`
      });
    }

    booking.booking_status = 'declined';
    await booking.save();

    eventBus.emit('bookingDeclined', {
      bookingId: booking.booking_id,
      passengerId: booking.passenger_id,
      driverId: booking.Ride.driver_id,
      rideId: booking.ride_id
    });

    res.status(200).json({
      status: 'success',
      message: 'Booking request declined successfully.'
    });

  } catch (error) {
    console.error('[Booking Service] Error declining booking:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while declining booking'
    });
  }
});

// PUT /api/bookings/:id/cancel (Passenger or Driver cancels booking)
router.put('/:id/cancel', authenticateJWT, async (req, res) => {
  const bookingId = parseInt(req.params.id, 10);
  const userId = req.user.id;

  try {
    const booking = await db.Booking.findByPk(bookingId, {
      include: [{ model: db.Ride, as: 'Ride' }]
    });

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    const isPassenger = (booking.passenger_id === userId);
    const isDriver = (booking.Ride.driver_id === userId);

    if (!isPassenger && !isDriver) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized: Only the passenger or the driver can cancel this booking.'
      });
    }

    if (!['pending', 'confirmed'].includes(booking.booking_status)) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot cancel a booking with status: ${booking.booking_status}`
      });
    }

    const previousStatus = booking.booking_status;
    const ride = booking.Ride;

    let lateCancel = false;
    if (previousStatus === 'confirmed') {
      lateCancel = isLateCancellation(ride.ride_date, ride.departure_time);
      if (lateCancel) {
        console.warn(`⚠️ [Late Cancellation] User ${userId} cancelled booking ${bookingId} within 2 hours of departure.`);
      }
    }

    // Execute in transaction
    await db.sequelize.transaction(async (t) => {
      booking.booking_status = 'cancelled';
      booking.cancelled_at = new Date();
      await booking.save({ transaction: t });

      // If it was confirmed, free up the seat
      if (previousStatus === 'confirmed') {
        ride.available_seats = ride.available_seats + 1;
        await ride.save({ transaction: t });
      }
    });

    eventBus.emit('bookingCancelled', {
      bookingId: booking.booking_id,
      passengerId: booking.passenger_id,
      driverId: booking.Ride.driver_id,
      rideId: booking.ride_id,
      cancelledBy: userId
    });

    res.status(200).json({
      status: 'success',
      message: 'Booking cancelled successfully' + (lateCancel ? ' (Flagged as late cancellation).' : '.'),
      data: {
        booking_id: booking.booking_id,
        booking_status: booking.booking_status,
        is_late_cancellation: lateCancel
      }
    });

  } catch (error) {
    console.error('[Booking Service] Error cancelling booking:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while cancelling booking'
    });
  }
});

// PUT /api/bookings/:id/confirm-complete (Passenger completes ride)
router.put('/:id/confirm-complete', authenticateJWT, async (req, res) => {
  const bookingId = parseInt(req.params.id, 10);
  const passengerId = req.user.id;

  try {
    const booking = await db.Booking.findByPk(bookingId, {
      include: [{ model: db.Ride, as: 'Ride' }]
    });

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    if (booking.passenger_id !== passengerId) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized: Only the passenger of this booking can confirm completion.'
      });
    }

    if (booking.booking_status !== 'confirmed') {
      return res.status(400).json({
        status: 'error',
        message: `Booking completion is not valid from status: ${booking.booking_status}`
      });
    }

    const ride = booking.Ride;
    let rideFinished = false;

    await db.sequelize.transaction(async (t) => {
      booking.booking_status = 'completed';
      booking.completed_at = new Date();
      await booking.save({ transaction: t });

      // Check if driver has already confirmed completion in JSON preferences
      const preferences = ride.preferences ? JSON.parse(ride.preferences) : {};
      if (preferences.driver_confirmed_completion === true) {
        ride.status = 'completed';
        await ride.save({ transaction: t });
        rideFinished = true;
      }
    });

    if (rideFinished) {
      eventBus.emit('rideCompleted', { rideId: ride.ride_id });
    }

    res.status(200).json({
      status: 'success',
      message: 'Ride completion confirmed.' + (rideFinished ? ' Mutual confirmation complete. Ride finalized.' : ' Awaiting driver confirmation.'),
      data: {
        booking_status: booking.booking_status,
        ride_status: ride.status
      }
    });

  } catch (error) {
    console.error('[Booking Service] Error confirming booking completion:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while confirming completion'
    });
  }
});

// POST /api/bookings/:id/no-show (Driver marks passenger no-show)
router.post('/:id/no-show', authenticateJWT, async (req, res) => {
  const bookingId = parseInt(req.params.id, 10);
  const driverId = req.user.id;

  try {
    const booking = await db.Booking.findByPk(bookingId, {
      include: [{ model: db.Ride, as: 'Ride' }]
    });

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking request not found'
      });
    }

    if (booking.Ride.driver_id !== driverId) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized: Only the driver of this ride can mark no-shows.'
      });
    }

    if (booking.Ride.status !== 'ongoing') {
      return res.status(400).json({
        status: 'error',
        message: 'No-show report is only valid during an active, ongoing ride.'
      });
    }

    if (booking.booking_status !== 'confirmed') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot report no-show for booking with status: ${booking.booking_status}`
      });
    }

    booking.booking_status = 'no_show';
    await booking.save();

    res.status(200).json({
      status: 'success',
      message: 'Passenger reported as no-show successfully.',
      data: {
        booking_status: booking.booking_status
      }
    });

  } catch (error) {
    console.error('[Booking Service] Error marking no-show:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while reporting no-show'
    });
  }
});

// GET / (List bookings for the logged-in user)
router.get('/', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const { role, status } = req.query;

  try {
    let passengerWhere = {};
    let driverBookingWhere = {};

    if (status) {
      passengerWhere.booking_status = status;
      driverBookingWhere.booking_status = status;
    }

    let passengerBookings = [];
    if (role !== 'driver') {
      passengerWhere.passenger_id = userId;
      passengerBookings = await db.Booking.findAll({
        where: passengerWhere,
        include: [
          {
            model: db.Ride,
            as: 'Ride',
            include: [
              {
                model: db.User,
                as: 'Driver',
                include: [{ model: db.Profile, as: 'Profile' }]
              }
            ]
          }
        ]
      });
    }

    let driverBookings = [];
    if (role !== 'passenger') {
      driverBookings = await db.Booking.findAll({
        where: driverBookingWhere,
        include: [
          {
            model: db.Ride,
            as: 'Ride',
            where: { driver_id: userId },
            include: [
              {
                model: db.User,
                as: 'Driver',
                include: [{ model: db.Profile, as: 'Profile' }]
              }
            ]
          },
          {
            model: db.User,
            as: 'Passenger',
            include: [{ model: db.Profile, as: 'Profile' }]
          }
        ]
      });
    }

    const results = [
      ...passengerBookings.map(b => ({
        booking_id: b.booking_id,
        ride_id: b.ride_id,
        passenger_id: b.passenger_id,
        driver_id: b.Ride?.driver_id,
        pickup_label: b.pickup_label,
        drop_label: b.drop_label,
        distance_traveled_km: b.distance_traveled_km,
        calculated_cost_share: b.calculated_cost_share,
        status: b.booking_status,
        match_scenario: b.match_scenario,
        role: 'passenger',
        driver_name: b.Ride?.Driver?.Profile?.full_name || 'Driver',
        driver_rating: 4.8,
        departure_time: b.Ride?.departure_time,
        ride_date: b.Ride?.ride_date,
        source_label: b.Ride?.source_label,
        destination_label: b.Ride?.destination_label
      })),
      ...driverBookings.map(b => ({
        booking_id: b.booking_id,
        ride_id: b.ride_id,
        passenger_id: b.passenger_id,
        driver_id: b.Ride?.driver_id,
        pickup_label: b.pickup_label,
        drop_label: b.drop_label,
        distance_traveled_km: b.distance_traveled_km,
        calculated_cost_share: b.calculated_cost_share,
        status: b.booking_status,
        match_scenario: b.match_scenario,
        role: 'driver',
        passenger_name: b.Passenger?.Profile?.full_name || 'Passenger',
        driver_name: 'You',
        driver_rating: 5.0,
        departure_time: b.Ride?.departure_time,
        ride_date: b.Ride?.ride_date,
        source_label: b.Ride?.source_label,
        destination_label: b.Ride?.destination_label
      }))
    ];

    res.status(200).json({
      status: 'success',
      data: results
    });

  } catch (error) {
    console.error('[Booking Service] Error fetching bookings:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching bookings'
    });
  }
});

// GET /bookings/health
router.get('/health', (req, res) => {
  res.json({ service: 'Booking Service', status: 'OK' });
});

export default router;
