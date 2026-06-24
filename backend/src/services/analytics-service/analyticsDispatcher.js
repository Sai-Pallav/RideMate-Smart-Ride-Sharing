import db from '../../../models/index.js';
import eventBus from '../../utils/eventBus.js';
import { calculateRideSavings } from './savingsCalculator.js';

/**
 * Handles the rideCompleted event by calculating and updating cumulative analytics
 * for both passengers and the driver.
 * 
 * @param {Object} payload - { rideId }
 */
export async function handleRideCompleted({ rideId }) {
  console.log(`📊 [Analytics Service] Processing rideCompleted for Ride ID: ${rideId}`);

  try {
    // 1. Fetch Ride with all completed bookings
    const ride = await db.Ride.findByPk(rideId, {
      include: [
        {
          model: db.Booking,
          as: 'Bookings',
          where: { booking_status: 'completed' },
          required: false // Allow driver-only completion if no passengers participated
        }
      ]
    });

    if (!ride) {
      console.warn(`⚠️ [Analytics Service] Ride not found for ID: ${rideId}`);
      return;
    }

    const driverId = ride.driver_id;
    const completedBookings = ride.Bookings || [];

    // 2. Process in a transaction to guarantee atomicity
    await db.sequelize.transaction(async (t) => {
      let driverDistanceShared = 0;
      let driverFuelSaved = 0;
      let driverCo2Avoided = 0;
      let driverCostSaved = 0;

      // Process each passenger's completed booking
      for (const booking of completedBookings) {
        const passengerId = booking.passenger_id;
        const distanceKm = parseFloat(booking.distance_traveled_km || 0);
        const actualCostShare = parseFloat(booking.calculated_cost_share || 0);

        // Calculate savings for this passenger
        const savings = calculateRideSavings({ distanceKm, actualCostShare });

        // Update/Create passenger analytics
        await updateAnalyticsForUser(
          passengerId,
          {
            distanceKm,
            fuelLiters: savings.fuelSavedLiters,
            co2Kg: savings.co2AvoidedKg,
            costSaved: savings.costSaved
          },
          t
        );

        // Aggregate for driver credit
        driverDistanceShared += distanceKm;
        driverFuelSaved += savings.fuelSavedLiters;
        driverCo2Avoided += savings.co2AvoidedKg;
        driverCostSaved += actualCostShare; // Reimbursed to the driver
      }

      // Update/Create driver analytics (driver gets credited with enabled savings + cost reimbursed)
      await updateAnalyticsForUser(
        driverId,
        {
          distanceKm: driverDistanceShared,
          fuelLiters: driverFuelSaved,
          co2Kg: driverCo2Avoided,
          costSaved: driverCostSaved
        },
        t
      );
    });

    console.log(`✅ [Analytics Service] Successfully updated analytics for Ride ID: ${rideId}`);

  } catch (error) {
    console.error(`❌ [Analytics Service] Error processing rideCompleted for Ride ID ${rideId}:`, error);
  }
}

/**
 * Helper to find or create a UserAnalytics record and increment the cumulative stats.
 */
async function updateAnalyticsForUser(userId, { distanceKm, fuelLiters, co2Kg, costSaved }, transaction) {
  const [analytics, created] = await db.UserAnalytics.findOrCreate({
    where: { user_id: userId },
    defaults: {
      total_rides: 1,
      total_distance_shared_km: parseFloat(distanceKm.toFixed(2)),
      total_fuel_saved_liters: parseFloat(fuelLiters.toFixed(4)),
      total_co2_avoided_kg: parseFloat(co2Kg.toFixed(4)),
      total_cost_saved: parseFloat(costSaved.toFixed(2))
    },
    transaction
  });

  if (!created) {
    analytics.total_rides = analytics.total_rides + 1;
    analytics.total_distance_shared_km = parseFloat((parseFloat(analytics.total_distance_shared_km) + distanceKm).toFixed(2));
    analytics.total_fuel_saved_liters = parseFloat((parseFloat(analytics.total_fuel_saved_liters) + fuelLiters).toFixed(4));
    analytics.total_co2_avoided_kg = parseFloat((parseFloat(analytics.total_co2_avoided_kg) + co2Kg).toFixed(4));
    analytics.total_cost_saved = parseFloat((parseFloat(analytics.total_cost_saved) + costSaved).toFixed(2));
    await analytics.save({ transaction });
  }
}

/**
 * Initializes the analytics event listeners.
 */
export function initAnalyticsListeners() {
  console.log('📡 [Analytics Dispatcher] Initializing event listeners...');
  eventBus.on('rideCompleted', handleRideCompleted);
}
