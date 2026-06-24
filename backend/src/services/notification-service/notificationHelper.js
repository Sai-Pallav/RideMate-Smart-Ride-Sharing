import db from '../../../models/index.js';
import eventBus from '../../utils/eventBus.js';

// Helper: Get default user notification preferences
export const getDefaultPreferences = () => {
  return {
    ride_reminder: true,
    booking_status: true,
    rating_prompt: true,
    system_alert: true
  };
};

// Helper: Callable function for ride reminders (simulates cron scheduler)
export const triggerRideReminders = async () => {
  console.log('⏰ [Scheduler] Running ride reminders check...');
  
  try {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    // Fetch rides scheduled within the next 1 hour (ongoing / completed rides ignored)
    const rides = await db.Ride.findAll({
      where: {
        status: 'scheduled',
        ride_date: now.toISOString().split('T')[0] // today's rides
      },
      include: [
        {
          model: db.Booking,
          as: 'Bookings',
          where: { booking_status: 'confirmed' },
          required: false
        }
      ]
    });

    let reminderCount = 0;

    for (const ride of rides) {
      // Parse scheduled departure time to check if it's within the 1-hour window
      const [hours, minutes, seconds] = ride.departure_time.split(':').map(Number);
      const departureTime = new Date();
      departureTime.setHours(hours || 0, minutes || 0, seconds || 0, 0);

      const timeDiffMs = departureTime.getTime() - now.getTime();
      const oneHourMs = 60 * 60 * 1000;

      if (timeDiffMs > 0 && timeDiffMs <= oneHourMs) {
        // 1. Notify Driver
        eventBus.emit('rideReminder', {
          userId: ride.driver_id,
          rideId: ride.ride_id,
          title: 'Ride Departure Reminder',
          body: `Reminder: Your published ride (ID: ${ride.ride_id}) is scheduled to depart in 1 hour at ${ride.departure_time}.`
        });
        reminderCount++;

        // 2. Notify Confirmed Passengers
        if (ride.Bookings && ride.Bookings.length > 0) {
          for (const booking of ride.Bookings) {
            eventBus.emit('rideReminder', {
              userId: booking.passenger_id,
              rideId: ride.ride_id,
              title: 'Ride Departure Reminder',
              body: `Reminder: Your booked ride (ID: ${ride.ride_id}) is scheduled to depart in 1 hour at ${ride.departure_time}.`
            });
            reminderCount++;
          }
        }
      }
    }

    console.log(`⏰ [Scheduler] Ride reminders check complete. Emitted ${reminderCount} reminder events.`);
    return reminderCount;
  } catch (error) {
    console.error('⏰ [Scheduler] Error running ride reminders check:', error);
    return 0;
  }
};
