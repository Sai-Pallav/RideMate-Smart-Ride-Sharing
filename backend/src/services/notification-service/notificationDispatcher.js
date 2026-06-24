import db from '../../../models/index.js';
import eventBus from '../../utils/eventBus.js';
import { getDefaultPreferences } from './notificationHelper.js';

// Provider Mocks (exposing for testing)
export class SmsProvider {
  static async sendSms(phoneNumber, message) {
    console.log(`\n==================================================`);
    console.log(`📱 [SmsProvider] SENDING SMS TO: ${phoneNumber}`);
    console.log(`💬 MESSAGE: ${message}`);
    console.log(`==================================================\n`);
    return true;
  }
}

export class PushProvider {
  static async sendPush(userId, title, body) {
    console.log(`\n==================================================`);
    console.log(`🔔 [PushProvider] SENDING PUSH TO USER: ${userId}`);
    console.log(`📌 TITLE: ${title}`);
    console.log(`📝 BODY: ${body}`);
    console.log(`==================================================\n`);
    return true;
  }
}

// Check preferences and dispatch notification
export const processNotification = async ({ userId, type, title, body, metadata = {} }) => {
  try {
    const user = await db.User.findByPk(userId);
    if (!user) {
      console.warn(`[Notification Dispatcher] Skipped: User ${userId} not found.`);
      return null;
    }

    // 1. Preferences Enforcement Gate (FR-13.2 / US-13.2)
    const preferences = user.notification_preferences || getDefaultPreferences();
    
    // Safety alerts (SOS) are always-on and cannot be suppressed in code
    const isSafety = (type === 'safety_alert');
    const isEnabled = isSafety || preferences[type] !== false;

    if (!isEnabled) {
      console.log(`[Notification Dispatcher] Suppressed: Notification type "${type}" disabled in preferences for User ${userId}.`);
      return null;
    }

    // 2. Create database record
    const notification = await db.Notification.create({
      user_id: userId,
      notification_type: type,
      title,
      body,
      is_read: false,
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_at: new Date()
    });

    // 3. Dispatch to Provider Channels (FR-12.2)
    // Safety alerts use BOTH SMS and Push. Other alerts use Push only by default.
    if (isSafety) {
      await PushProvider.sendPush(userId, title, body);
      if (user.phone_number) {
        await SmsProvider.sendSms(user.phone_number, `ALERT: ${title} - ${body}`);
      }
    } else {
      await PushProvider.sendPush(userId, title, body);
    }

    return notification;
  } catch (error) {
    console.error(`[Notification Dispatcher] Error processing notification for User ${userId}:`, error);
    return null;
  }
};

// Initialize event subscriptions
export const initNotificationListeners = () => {
  console.log('📡 [Notification Dispatcher] Initializing event listeners...');

  // Event: bookingRequested
  eventBus.on('bookingRequested', async ({ bookingId, passengerId, driverId, rideId }) => {
    await processNotification({
      userId: driverId,
      type: 'booking_status',
      title: 'New Ride Request',
      body: `A passenger has requested to join your ride (ID: ${rideId}). Open bookings to review.`,
      metadata: { bookingId, passengerId, rideId }
    });
  });

  // Event: bookingAccepted
  eventBus.on('bookingAccepted', async ({ bookingId, passengerId, driverId, rideId }) => {
    await processNotification({
      userId: passengerId,
      type: 'booking_status',
      title: 'Ride Request Accepted',
      body: `Your request to join ride (ID: ${rideId}) has been accepted. Contact details shared.`,
      metadata: { bookingId, driverId, rideId }
    });
  });

  // Event: bookingDeclined
  eventBus.on('bookingDeclined', async ({ bookingId, passengerId, driverId, rideId }) => {
    await processNotification({
      userId: passengerId,
      type: 'booking_status',
      title: 'Ride Request Declined',
      body: `Your request to join ride (ID: ${rideId}) was declined by the driver.`,
      metadata: { bookingId, driverId, rideId }
    });
  });

  // Event: bookingCancelled
  eventBus.on('bookingCancelled', async ({ bookingId, passengerId, driverId, rideId, cancelledBy }) => {
    const notifyUserId = (parseInt(cancelledBy, 10) === parseInt(passengerId, 10)) ? driverId : passengerId;
    const role = (parseInt(cancelledBy, 10) === parseInt(passengerId, 10)) ? 'passenger' : 'driver';
    await processNotification({
      userId: notifyUserId,
      type: 'booking_status',
      title: 'Booking Cancelled',
      body: `The co-traveler (${role}) has cancelled the booking (ID: ${bookingId}) for ride (ID: ${rideId}).`,
      metadata: { bookingId, rideId, cancelledBy }
    });
  });

  // Event: rideUpdated
  eventBus.on('rideUpdated', async ({ passengerId, rideId, message }) => {
    await processNotification({
      userId: passengerId,
      type: 'booking_status',
      title: 'Ride Schedule Updated',
      body: message || `The details of your upcoming ride (ID: ${rideId}) have been updated.`,
      metadata: { rideId }
    });
  });

  // Event: rideCancelled
  eventBus.on('rideCancelled', async ({ passengerId, rideId, message }) => {
    await processNotification({
      userId: passengerId,
      type: 'booking_status',
      title: 'Ride Cancelled by Driver',
      body: message || `We regret to inform you that your upcoming ride (ID: ${rideId}) has been cancelled.`,
      metadata: { rideId }
    });
  });

  // Event: rideReminder
  eventBus.on('rideReminder', async ({ userId, rideId, title, body }) => {
    await processNotification({
      userId,
      type: 'ride_reminder',
      title: title || 'Ride Reminder',
      body: body || `Reminder: Your ride (ID: ${rideId}) is scheduled to depart soon.`,
      metadata: { rideId }
    });
  });

  // Event: sosTriggered
  eventBus.on('sosTriggered', async ({ alertId, userId, rideId, contacts, location }) => {
    // 1. Notify the user who triggered SOS
    await processNotification({
      userId,
      type: 'safety_alert',
      title: 'SOS Alert Triggered',
      body: `Emergency services and emergency contacts have been notified of your location.`,
      metadata: { alertId, rideId, location }
    });

    // 2. Dispatch SMS directly to all emergency contacts
    const msg = `EMERGENCY: User ${userId} has triggered SOS on ride ${rideId || 'N/A'}. Location: http://maps.google.com/?q=${location.latitude},${location.longitude}`;
    for (const c of contacts) {
      try {
        await SmsProvider.sendSms(c.contact_phone, msg);
      } catch (err) {
        console.error(`[Notification Dispatcher] Failed to dispatch SMS to emergency contact: ${c.contact_phone}`, err);
      }
    }
  });

  // Event: reportStatusChanged
  eventBus.on('reportStatusChanged', async ({ reportId, reporterId, status }) => {
    await processNotification({
      userId: reporterId,
      type: 'system_alert',
      title: 'Report Status Updated',
      body: `The report you filed (ID: ${reportId}) has been marked as: ${status}.`,
      metadata: { reportId, status }
    });
  });

  // Event: ratingPrompt
  eventBus.on('ratingPrompt', async ({ userId, bookingId, role }) => {
    const coRole = (role === 'passenger') ? 'driver' : 'passenger';
    await processNotification({
      userId,
      type: 'rating_prompt',
      title: 'Rate Your Co-Traveler',
      body: `Your ride is complete! Please rate your ${coRole} for booking (ID: ${bookingId}).`,
      metadata: { bookingId, role }
    });
  });

  // Event: rideCompleted (Mutual completion auto-triggers rating prompt)
  eventBus.on('rideCompleted', async ({ rideId }) => {
    console.log(`📢 [Notification Dispatcher] Processing rideCompleted for ride ${rideId} -> triggering rating prompts.`);
    try {
      const bookings = await db.Booking.findAll({
        where: { ride_id: rideId, booking_status: 'completed' },
        include: [{ model: db.Ride, as: 'Ride' }]
      });

      for (const booking of bookings) {
        // Passenger prompt
        eventBus.emit('ratingPrompt', {
          userId: booking.passenger_id,
          bookingId: booking.booking_id,
          role: 'passenger'
        });

        // Driver prompt
        eventBus.emit('ratingPrompt', {
          userId: booking.Ride.driver_id,
          bookingId: booking.booking_id,
          role: 'driver'
        });
      }
    } catch (err) {
      console.error('[Notification Dispatcher] Error processing rating prompts on rideCompleted:', err);
    }
  });

  // Event: ratingSubmitted (Clean up outstanding rating prompt notifications)
  eventBus.on('ratingSubmitted', async ({ bookingId, raterId }) => {
    try {
      // Mark any outstanding rating_prompt notifications for this user+booking as read
      await db.Notification.update(
        { is_read: true },
        {
          where: {
            user_id: raterId,
            notification_type: 'rating_prompt',
            is_read: false
          }
        }
      );
      console.log(`[Notification Dispatcher] Rating prompt notifications cleaned up for user ${raterId}.`);
    } catch (err) {
      console.error('[Notification Dispatcher] Error cleaning up rating prompt notifications:', err);
    }
  });
};
