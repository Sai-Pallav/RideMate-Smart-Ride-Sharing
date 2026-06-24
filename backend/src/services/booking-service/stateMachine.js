/**
 * Validates ride status transitions based on the authoritative state machine.
 * Allowed transitions:
 * - scheduled -> ongoing
 * - scheduled -> cancelled
 * - ongoing -> completed
 * - ongoing -> cancelled
 * 
 * @param {string} currentStatus 
 * @param {string} nextStatus 
 * @returns {boolean} True if valid
 */
export function validateStateTransition(currentStatus, nextStatus) {
  if (!currentStatus || !nextStatus) return false;

  const current = currentStatus.toLowerCase();
  const next = nextStatus.toLowerCase();

  if (current === next) return true;

  const allowed = {
    scheduled: ['ongoing', 'cancelled'],
    ongoing: ['completed', 'cancelled'],
    completed: [],
    cancelled: []
  };

  const transitions = allowed[current];
  return transitions ? transitions.includes(next) : false;
}

/**
 * Checks if a pending booking is expired.
 * Expires if the departure time has passed, or e.g. within 30 minutes of departure.
 * 
 * @param {string|Date} rideDate - "YYYY-MM-DD"
 * @param {string} departureTime - "HH:MM:SS" or "HH:MM"
 * @param {Date} [now] - Current datetime (for testing override)
 * @returns {boolean} True if expired
 */
export function isBookingExpired(rideDate, departureTime, now = new Date()) {
  if (!rideDate || !departureTime) return false;

  // Reconstruct departure timestamp
  const departureDateTime = new Date(`${rideDate}T${departureTime}`);
  
  // A pending booking is expired if it's within 30 minutes of departure or has already passed
  const bufferMs = 30 * 60 * 1000;
  return (departureDateTime.getTime() - now.getTime()) < bufferMs;
}

/**
 * Checks if a cancellation is classified as "late".
 * Late cancellation is defined as cancelling within 2 hours of departure time.
 * 
 * @param {string|Date} rideDate 
 * @param {string} departureTime 
 * @param {Date} [now] - Current datetime (for testing override)
 * @returns {boolean} True if late cancellation
 */
export function isLateCancellation(rideDate, departureTime, now = new Date()) {
  if (!rideDate || !departureTime) return false;

  const departureDateTime = new Date(`${rideDate}T${departureTime}`);
  const twoHoursMs = 2 * 60 * 60 * 1000;

  // If time until departure is less than 2 hours (or has already passed)
  const diffMs = departureDateTime.getTime() - now.getTime();
  return diffMs < twoHoursMs;
}
