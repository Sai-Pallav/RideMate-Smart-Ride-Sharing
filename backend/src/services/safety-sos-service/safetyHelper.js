/**
 * Safety & SOS Service Helpers
 */
import eventBus from '../../utils/eventBus.js';

/**
 * Checks if the cancellation is made within the allowed grace period window.
 * 
 * @param {Date|string} triggeredAt - The timestamp when SOS was triggered
 * @param {Date|string} cancelTime - The timestamp when cancellation is requested
 * @param {number} graceLimitMs - The grace period duration in milliseconds
 * @returns {boolean}
 */
export const isWithinGracePeriod = (triggeredAt, cancelTime, graceLimitMs = 10000) => {
  const trigger = new Date(triggeredAt).getTime();
  const cancel = new Date(cancelTime).getTime();
  return (cancel - trigger) <= graceLimitMs;
};

/**
 * SmsProvider (Scaffold & Mock Interface)
 * Matches the pattern used by OtpProvider in Auth Service.
 */
export class SmsProvider {
  /**
   * Dispatches a text message to the target phone number.
   * 
   * @param {string} phoneNumber 
   * @param {string} message 
   * @returns {Promise<boolean>}
   */
  static async sendSms(phoneNumber, message) {
    console.log(`\n==================================================`);
    console.log(`📨 [SmsProvider] SENDING SMS TO: ${phoneNumber}`);
    console.log(`🔑 MESSAGE: ${message}`);
    console.log(`==================================================\n`);
    
    // Return true to simulate a successful SMS gateway request
    return true;
  }
}

/**
 * Executes emergency dispatcher fan-out tasks in parallel.
 * 
 * @param {Object} params
 * @param {Object} params.alertDetails - Details of the written EmergencyAlert record
 * @param {Array} params.contacts - Array of emergency contacts for the user
 * @param {Object} params.db - DB models reference (for audit logging)
 * @param {Function} [params.smsStub] - Optional SMS dispatch mock for testing
 * @param {Function} [params.adminStub] - Optional admin queue notify mock for testing
 * @param {Function} [params.socketStub] - Optional socket confirmation mock for testing
 */
export const parallelFanOut = async ({
  alertDetails,
  contacts,
  db,
  smsStub,
  adminStub,
  socketStub
}) => {
  // Define default functions if stubs are not provided
  const notifyContacts = smsStub || (async () => {
    eventBus.emit('sosTriggered', {
      alertId: alertDetails.alert_id,
      userId: alertDetails.user_id,
      rideId: alertDetails.ride_id,
      contacts: contacts.map(c => ({ contact_phone: c.contact_phone, contact_name: c.contact_name })),
      location: alertDetails.location
    });
    return true;
  });

  const notifyAdminQueue = adminStub || (async () => {
    // Write an entry to the AuditLog as a dedicated record of safety dispatch
    if (db && db.AuditLog) {
      await db.AuditLog.create({
        actor_user_id: alertDetails.user_id,
        action_type: 'SOS_TRIGGERED',
        action_detail: {
          alert_id: alertDetails.alert_id,
          location: alertDetails.location,
          ride_id: alertDetails.ride_id,
          timestamp: new Date()
        }
      });
    }
    console.log(`[Safety Dispatcher] Admin/Safety monitoring queue notified for alert: ${alertDetails.alert_id}`);
    return true;
  });

  const notifyUserSocket = socketStub || (async () => {
    console.log(`[Safety Dispatcher] Real-time Socket.IO confirmation sent to user ${alertDetails.user_id}`);
    return true;
  });

  // Hard requirement: execute in parallel using Promise.all
  await Promise.all([
    notifyContacts(),
    notifyAdminQueue(),
    notifyUserSocket()
  ]);

  return {
    shared_location: alertDetails.location,
    contacts_notified: contacts.map(c => ({ name: c.contact_name, phone: c.contact_phone }))
  };
};
