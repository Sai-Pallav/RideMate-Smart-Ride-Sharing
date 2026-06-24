import express from 'express';
import { authenticateJWT } from '../../middleware/authMiddleware.js';
import db from '../../../models/index.js';
import { validateStateTransition } from '../booking-service/stateMachine.js';
import eventBus from '../../utils/eventBus.js';

const router = express.Router();

// Helper: Format coordinates from POINT object
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

// POST /rides (Create/Publish a Ride)
router.post('/', authenticateJWT, async (req, res) => {
  const driverId = req.user.id;
  const {
    source_label,
    source_location, // Expecting { latitude, longitude }
    destination_label,
    destination_location, // Expecting { latitude, longitude }
    ride_date,
    departure_time,
    total_seats,
    estimated_distance_km,
    estimated_total_cost,
    preferences,
    polyline,
    stops // Expecting Array of stop objects: [{ sequence_order, stop_label, location: { latitude, longitude }, distance_from_source_km }]
  } = req.body;

  // 1. Validation of required inputs
  if (!source_label || !source_location || !destination_label || !destination_location || !ride_date || !departure_time || !total_seats || estimated_distance_km === undefined || estimated_total_cost === undefined) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required ride parameters. Source, destination, date, time, total seats, distance, and total cost are required.'
    });
  }

  try {
    // 2. Business Rule FR-3.1: Driver must add/activate at least one vehicle before publishing
    const activeVehicle = await db.Vehicle.findOne({
      where: { user_id: driverId, is_active: true }
    });

    if (!activeVehicle) {
      return res.status(403).json({
        status: 'error',
        message: 'Driver must register and activate a vehicle before publishing a ride.'
      });
    }

    // 3. Insert ride and related details in transaction
    const result = await db.sequelize.transaction(async (t) => {
      const ride = await db.Ride.create({
        driver_id: driverId,
        vehicle_id: activeVehicle.vehicle_id,
        source_label,
        source_location: db.sequelize.fn('ST_GeomFromText', `POINT(${source_location.latitude} ${source_location.longitude})`, 4326),
        destination_label,
        destination_location: db.sequelize.fn('ST_GeomFromText', `POINT(${destination_location.latitude} ${destination_location.longitude})`, 4326),
        ride_date,
        departure_time,
        total_seats,
        available_seats: total_seats,
        estimated_distance_km,
        estimated_total_cost,
        status: 'scheduled',
        preferences: preferences ? JSON.stringify(preferences) : null
      }, { transaction: t });

      // Save polyline in ride_routes
      let route = null;
      if (polyline) {
        route = await db.RideRoute.create({
          ride_id: ride.ride_id,
          polyline_data: JSON.stringify({ points: polyline }),
          total_distance_km: estimated_distance_km
        }, { transaction: t });
      }

      // Save intermediate stops
      const stopRecords = [];
      if (stops && Array.isArray(stops)) {
        for (const stop of stops) {
          const createdStop = await db.RideStop.create({
            ride_id: ride.ride_id,
            sequence_order: stop.sequence_order,
            stop_label: stop.stop_label,
            stop_location: db.sequelize.fn('ST_GeomFromText', `POINT(${stop.location.latitude} ${stop.location.longitude})`, 4326),
            distance_from_source_km: stop.distance_from_source_km
          }, { transaction: t });
          stopRecords.push(createdStop);
        }
      }

      return { ride, route, stops: stopRecords };
    });

    res.status(201).json({
      status: 'success',
      message: 'Ride created and published successfully',
      data: {
        ride_id: result.ride.ride_id,
        driver_id: result.ride.driver_id,
        vehicle_id: result.ride.vehicle_id,
        source_label: result.ride.source_label,
        source_location,
        destination_label: result.ride.destination_label,
        destination_location,
        ride_date: result.ride.ride_date,
        departure_time: result.ride.departure_time,
        total_seats: result.ride.total_seats,
        available_seats: result.ride.available_seats,
        estimated_distance_km: result.ride.estimated_distance_km,
        estimated_total_cost: result.ride.estimated_total_cost,
        status: result.ride.status,
        preferences: result.ride.preferences ? JSON.parse(result.ride.preferences) : null,
        route: result.route,
        stops: result.stops.map(s => ({
          stop_id: s.stop_id,
          sequence_order: s.sequence_order,
          stop_label: s.stop_label,
          location: formatPoint(s.stop_location),
          distance_from_source_km: s.distance_from_source_km
        }))
      }
    });

  } catch (error) {
    console.error('[Ride Service] Error creating ride:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while creating ride'
    });
  }
});

// GET /rides/:id (Fetch Ride Details)
router.get('/:id', authenticateJWT, async (req, res) => {
  const rideId = parseInt(req.params.id, 10);

  try {
    const ride = await db.Ride.findByPk(rideId, {
      include: [
        {
          model: db.User,
          as: 'Driver',
          include: [{ model: db.Profile, as: 'Profile' }]
        },
        { model: db.Vehicle, as: 'Vehicle' },
        { model: db.RideRoute, as: 'Route' },
        { model: db.RideStop, as: 'Stops' }
      ]
    });

    if (!ride) {
      return res.status(404).json({
        status: 'error',
        message: 'Ride not found'
      });
    }

    // Format stops locations
    const formattedStops = (ride.Stops || []).map(stop => ({
      stop_id: stop.stop_id,
      sequence_order: stop.sequence_order,
      stop_label: stop.stop_label,
      stop_location: formatPoint(stop.stop_location),
      distance_from_source_km: stop.distance_from_source_km
    })).sort((a, b) => a.sequence_order - b.sequence_order);

    res.status(200).json({
      status: 'success',
      data: {
        ride_id: ride.ride_id,
        driver: {
          user_id: ride.Driver?.user_id,
          full_name: ride.Driver?.Profile?.full_name,
          rating: 4.8 // Aggregate rating mock / could fetch dynamically
        },
        vehicle: ride.Vehicle,
        source_label: ride.source_label,
        source_location: formatPoint(ride.source_location),
        destination_label: ride.destination_label,
        destination_location: formatPoint(ride.destination_location),
        ride_date: ride.ride_date,
        departure_time: ride.departure_time,
        total_seats: ride.total_seats,
        available_seats: ride.available_seats,
        estimated_distance_km: ride.estimated_distance_km,
        estimated_total_cost: ride.estimated_total_cost,
        status: ride.status,
        preferences: ride.preferences ? JSON.parse(ride.preferences) : null,
        route: ride.Route,
        stops: formattedStops
      }
    });

  } catch (error) {
    console.error('[Ride Service] Error fetching ride:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching ride details'
    });
  }
});

// PUT /rides/:id (Edit Ride)
router.put('/:id', authenticateJWT, async (req, res) => {
  const driverId = req.user.id;
  const rideId = parseInt(req.params.id, 10);
  const {
    departure_time,
    ride_date,
    total_seats,
    preferences,
    confirm_affected_passengers // Explicit driver override if passengers exist
  } = req.body;

  try {
    const ride = await db.Ride.findOne({
      where: { ride_id: rideId, driver_id: driverId }
    });

    if (!ride) {
      return res.status(404).json({
        status: 'error',
        message: 'Ride not found or you are not authorized to edit this ride'
      });
    }

    if (ride.status !== 'scheduled') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot edit a ride that has already status: ${ride.status}`
      });
    }

    // FR-4.5 Check for confirmed bookings
    const confirmedBookings = await db.Booking.findAll({
      where: { ride_id: rideId, booking_status: 'confirmed' }
    });

    const isScheduleChange = (departure_time && departure_time !== ride.departure_time) || (ride_date && ride_date !== ride.ride_date);

    if (confirmedBookings.length > 0 && isScheduleChange) {
      if (!confirm_affected_passengers) {
        return res.status(400).json({
          status: 'error',
          message: 'This ride has confirmed passengers. Changing schedule will affect them. Explicit confirmation (confirm_affected_passengers: true) is required.',
          requires_confirmation: true,
          affected_passengers_count: confirmedBookings.length
        });
      }
    }

    // Execute updates
    if (departure_time !== undefined) ride.departure_time = departure_time;
    if (ride_date !== undefined) ride.ride_date = ride_date;
    if (total_seats !== undefined) {
      // Calculate active passengers to make sure total_seats is not set below current bookings count
      const bookedSeatsCount = ride.total_seats - ride.available_seats;
      if (total_seats < bookedSeatsCount) {
        return res.status(400).json({
          status: 'error',
          message: `Cannot reduce total seats below currently booked seats (${bookedSeatsCount})`
        });
      }
      ride.available_seats = total_seats - bookedSeatsCount;
      ride.total_seats = total_seats;
    }
    if (preferences !== undefined) ride.preferences = JSON.stringify(preferences);

    await ride.save();

    // Trigger Notification Stubs if passengers are affected (FR-4.5)
    if (confirmedBookings.length > 0 && isScheduleChange) {
      for (const booking of confirmedBookings) {
        const msg = `Schedule for your ride (ID: ${rideId}) has been modified by the driver to: ${ride.ride_date} at ${ride.departure_time}.`;
        eventBus.emit('rideUpdated', {
          passengerId: booking.passenger_id,
          rideId: ride.ride_id,
          message: msg
        });
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Ride updated successfully' + (confirmedBookings.length > 0 && isScheduleChange ? '. Confirmed passengers have been notified.' : ''),
      data: {
        ride_id: ride.ride_id,
        ride_date: ride.ride_date,
        departure_time: ride.departure_time,
        total_seats: ride.total_seats,
        available_seats: ride.available_seats,
        preferences: ride.preferences ? JSON.parse(ride.preferences) : null
      }
    });

  } catch (error) {
    console.error('[Ride Service] Error updating ride:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while updating ride'
    });
  }
});

// DELETE /rides/:id (Cancel Ride)
router.delete('/:id', authenticateJWT, async (req, res) => {
  const driverId = req.user.id;
  const rideId = parseInt(req.params.id, 10);
  const { confirm_affected_passengers } = req.body;

  try {
    const ride = await db.Ride.findOne({
      where: { ride_id: rideId, driver_id: driverId }
    });

    if (!ride) {
      return res.status(404).json({
        status: 'error',
        message: 'Ride not found or you are not authorized to cancel this ride'
      });
    }

    if (ride.status === 'cancelled' || ride.status === 'completed') {
      return res.status(400).json({
        status: 'error',
        message: `Ride is already in a terminal state: ${ride.status}`
      });
    }

    // Check for confirmed passengers
    const confirmedBookings = await db.Booking.findAll({
      where: { ride_id: rideId, booking_status: 'confirmed' }
    });

    if (confirmedBookings.length > 0) {
      if (!confirm_affected_passengers) {
        return res.status(400).json({
          status: 'error',
          message: 'This ride has confirmed passengers. Cancelling it will affect them. Explicit confirmation (confirm_affected_passengers: true) is required.',
          requires_confirmation: true,
          affected_passengers_count: confirmedBookings.length
        });
      }
    }

    // Execute cancellation in transaction
    await db.sequelize.transaction(async (t) => {
      // Cancel Ride
      ride.status = 'cancelled';
      await ride.save({ transaction: t });

      // Cancel all active bookings (pending or confirmed)
      await db.Booking.update(
        { booking_status: 'cancelled', cancelled_at: new Date() },
        { where: { ride_id: rideId, booking_status: ['pending', 'confirmed'] }, transaction: t }
      );
    });

    // Notify confirmed passengers (FR-4.5)
    if (confirmedBookings.length > 0) {
      for (const booking of confirmedBookings) {
        const msg = `We regret to inform you that your scheduled ride (ID: ${rideId}) has been cancelled by the driver.`;
        eventBus.emit('rideCancelled', {
          passengerId: booking.passenger_id,
          rideId,
          message: msg
        });
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Ride cancelled successfully' + (confirmedBookings.length > 0 ? '. Affected passengers have been notified.' : '')
    });

  } catch (error) {
    console.error('[Ride Service] Error cancelling ride:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while cancelling ride'
    });
  }
});


// POST /rides/templates (Create recurring ride templates and future instances)
router.post('/templates', authenticateJWT, async (req, res) => {
  const driverId = req.user.id;
  const {
    source_label,
    source_location,
    destination_label,
    destination_location,
    departure_time,
    total_seats,
    estimated_distance_km,
    estimated_total_cost,
    preferences,
    polyline,
    stops,
    recurrence_pattern, // 'daily', 'weekly', 'weekdays'
    start_date,         // default today
    end_date            // date range boundary
  } = req.body;

  if (!recurrence_pattern || !end_date) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing recurrence_pattern (daily, weekly, weekdays) and end_date.'
    });
  }

  try {
    const activeVehicle = await db.Vehicle.findOne({
      where: { user_id: driverId, is_active: true }
    });

    if (!activeVehicle) {
      return res.status(403).json({
        status: 'error',
        message: 'Driver must register and activate a vehicle before publishing a recurring ride template.'
      });
    }

    const start = new Date(start_date || Date.now());
    const end = new Date(end_date);

    // Enforce safety bound (maximum 14 days forward generation in this pilot)
    const maxEnd = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
    const actualEnd = end > maxEnd ? maxEnd : end;

    // Generate dates matching pattern
    const datesToGenerate = [];
    let current = new Date(start);
    while (current <= actualEnd) {
      const dayOfWeek = current.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      let matches = false;

      if (recurrence_pattern === 'daily') {
        matches = true;
      } else if (recurrence_pattern === 'weekdays') {
        matches = (dayOfWeek >= 1 && dayOfWeek <= 5);
      } else if (recurrence_pattern === 'weekly') {
        matches = (dayOfWeek === start.getDay());
      }

      if (matches) {
        // Format as YYYY-MM-DD
        datesToGenerate.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }

    if (datesToGenerate.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No matching dates found within the recurrence date range pattern'
      });
    }

    // Execute template and instances creation in transaction
    const result = await db.sequelize.transaction(async (t) => {
      // 1. Create the template ride record (serves as template series parent)
      const templateRide = await db.Ride.create({
        driver_id: driverId,
        vehicle_id: activeVehicle.vehicle_id,
        source_label,
        source_location: db.sequelize.fn('ST_GeomFromText', `POINT(${source_location.latitude} ${source_location.longitude})`, 4326),
        destination_label,
        destination_location: db.sequelize.fn('ST_GeomFromText', `POINT(${destination_location.latitude} ${destination_location.longitude})`, 4326),
        ride_date: start_date || new Date().toISOString().split('T')[0],
        departure_time,
        total_seats,
        available_seats: total_seats,
        estimated_distance_km,
        estimated_total_cost,
        status: 'scheduled',
        preferences: preferences ? JSON.stringify(preferences) : null
      }, { transaction: t });

      const generatedRides = [];

      // 2. Generate instances
      for (const targetDate of datesToGenerate) {
        const instance = await db.Ride.create({
          driver_id: driverId,
          vehicle_id: activeVehicle.vehicle_id,
          source_label,
          source_location: db.sequelize.fn('ST_GeomFromText', `POINT(${source_location.latitude} ${source_location.longitude})`, 4326),
          destination_label,
          destination_location: db.sequelize.fn('ST_GeomFromText', `POINT(${destination_location.latitude} ${destination_location.longitude})`, 4326),
          ride_date: targetDate,
          departure_time,
          total_seats,
          available_seats: total_seats,
          estimated_distance_km,
          estimated_total_cost,
          status: 'scheduled',
          recurring_template_id: templateRide.ride_id, // Reference to template
          preferences: preferences ? JSON.stringify(preferences) : null
        }, { transaction: t });

        // Copy polyline route for each instance
        if (polyline) {
          await db.RideRoute.create({
            ride_id: instance.ride_id,
            polyline_data: JSON.stringify({ points: polyline }),
            total_distance_km: estimated_distance_km
          }, { transaction: t });
        }

        // Copy stops for each instance
        if (stops && Array.isArray(stops)) {
          for (const stop of stops) {
            await db.RideStop.create({
              ride_id: instance.ride_id,
              sequence_order: stop.sequence_order,
              stop_label: stop.stop_label,
              stop_location: db.sequelize.fn('ST_GeomFromText', `POINT(${stop.location.latitude} ${stop.location.longitude})`, 4326),
              distance_from_source_km: stop.distance_from_source_km
            }, { transaction: t });
          }
        }

        generatedRides.push({
          ride_id: instance.ride_id,
          ride_date: targetDate
        });
      }

      return { template_id: templateRide.ride_id, generatedRides };
    });

    res.status(201).json({
      status: 'success',
      message: `Recurring ride template registered. Generated ${result.generatedRides.length} ride instances.`,
      data: {
        template_ride_id: result.template_id,
        recurrence_pattern,
        instances: result.generatedRides
      }
    });

  } catch (error) {
    console.error('[Ride Service] Error generating recurring series:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while generating recurring ride series'
    });
  }
});

// PUT /rides/:id/start (Driver starts ride)
router.put('/:id/start', authenticateJWT, async (req, res) => {
  const rideId = parseInt(req.params.id, 10);
  const driverId = req.user.id;

  try {
    const ride = await db.Ride.findOne({
      where: { ride_id: rideId, driver_id: driverId }
    });

    if (!ride) {
      return res.status(404).json({
        status: 'error',
        message: 'Ride not found or you are not authorized to start this ride'
      });
    }

    // Enforce state transition checks strictly
    if (!validateStateTransition(ride.status, 'ongoing')) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid state transition: Cannot start a ride with current status: ${ride.status}`
      });
    }

    ride.status = 'ongoing';
    await ride.save();

    res.status(200).json({
      status: 'success',
      message: 'Ride marked as ongoing.',
      data: {
        ride_id: ride.ride_id,
        status: ride.status
      }
    });

  } catch (error) {
    console.error('[Ride Service] Error starting ride:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while starting ride'
    });
  }
});

// PUT /rides/:id/complete (Driver completes ride)
router.put('/:id/complete', authenticateJWT, async (req, res) => {
  const rideId = parseInt(req.params.id, 10);
  const driverId = req.user.id;

  try {
    const ride = await db.Ride.findOne({
      where: { ride_id: rideId, driver_id: driverId }
    });

    if (!ride) {
      return res.status(404).json({
        status: 'error',
        message: 'Ride not found or you are not authorized to complete this ride'
      });
    }

    // Enforce state transition checks strictly
    if (!validateStateTransition(ride.status, 'completed')) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid state transition: Cannot complete a ride with current status: ${ride.status}`
      });
    }

    // Read current JSON preferences
    const preferences = ride.preferences ? JSON.parse(ride.preferences) : {};
    preferences.driver_confirmed_completion = true;

    let rideFinished = false;

    // Check if there are no bookings, or if all passenger bookings are already completed
    const activeBookings = await db.Booking.findAll({
      where: { ride_id: rideId, booking_status: ['confirmed', 'completed'] }
    });

    const pendingConfirmationCount = activeBookings.filter(b => b.booking_status !== 'completed').length;

    await db.sequelize.transaction(async (t) => {
      ride.preferences = JSON.stringify(preferences);

      if (pendingConfirmationCount === 0) {
        ride.status = 'completed';
        rideFinished = true;
      }

      await ride.save({ transaction: t });
    });

    if (rideFinished) {
      eventBus.emit('rideCompleted', { rideId });
    }

    res.status(200).json({
      status: 'success',
      message: rideFinished 
        ? 'Ride completion mutually confirmed. Ride finalized.' 
        : 'Ride marked complete by driver. Awaiting passenger confirmation.',
      data: {
        ride_id: ride.ride_id,
        status: ride.status,
        mutual_completion_confirmed: rideFinished
      }
    });

  } catch (error) {
    console.error('[Ride Service] Error completing ride:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while completing ride'
    });
  }
});

// GET /history (Get user's ride history)
router.get('/history', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  try {
    // Find all rides where the user was the driver
    const driverRides = await db.Ride.findAll({
      where: { driver_id: userId },
      include: [
        { model: db.Vehicle, as: 'Vehicle' },
        { model: db.RideStop, as: 'Stops' }
      ]
    });

    // Find all bookings where the user was the passenger
    const passengerBookings = await db.Booking.findAll({
      where: { passenger_id: userId },
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

    // Combine into history items
    const history = [
      ...driverRides.map(r => ({
        ride_id: r.ride_id,
        role: 'driver',
        source_label: r.source_label,
        destination_label: r.destination_label,
        ride_date: r.ride_date,
        departure_time: r.departure_time,
        status: r.status,
        cost_share: parseFloat(r.estimated_total_cost) / (r.total_seats || 3),
        driver_name: 'You'
      })),
      ...passengerBookings.map(b => ({
        ride_id: b.ride_id,
        booking_id: b.booking_id,
        role: 'passenger',
        source_label: b.Ride?.source_label || b.pickup_label,
        destination_label: b.Ride?.destination_label || b.drop_label,
        ride_date: b.Ride?.ride_date,
        departure_time: b.Ride?.departure_time,
        status: b.booking_status,
        cost_share: parseFloat(b.calculated_cost_share),
        driver_name: b.Ride?.Driver?.Profile?.full_name || 'Driver'
      }))
    ];

    res.status(200).json({
      status: 'success',
      data: history
    });
  } catch (error) {
    console.error('[Ride Service] Error fetching history:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching history'
    });
  }
});

// GET /rides/health
router.get('/health', (req, res) => {
  res.json({ service: 'Ride Management Service', status: 'OK' });
});

export default router;
