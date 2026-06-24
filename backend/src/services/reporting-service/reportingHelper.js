/**
 * User Reporting Helper Logic
 */

/**
 * Validates that the reporter is not reporting themselves.
 * 
 * @param {string|number} reporterId 
 * @param {string|number} reportedUserId 
 * @throws {Error} If self-report is attempted
 */
export const validateSelfReport = (reporterId, reportedUserId) => {
  if (String(reporterId) === String(reportedUserId)) {
    throw new Error('Self-reporting is blocked. You cannot file a report against yourself.');
  }
  return true;
};

/**
 * Determines whether a new report should be merged into an existing active report.
 * 
 * @param {Object} existingReport - Existing database report
 * @param {Object} queryParams - New report query parameters
 * @param {number} timeWindowMs - Time window inside which duplicates are merged (default 24 hours)
 * @returns {boolean}
 */
export const shouldMerge = (existingReport, queryParams, timeWindowMs = 24 * 60 * 60 * 1000) => {
  if (!existingReport) return false;
  
  // Status check: must not be resolved
  if (existingReport.status === 'resolved') return false;

  // Window check
  const createdAtTime = new Date(existingReport.created_at || existingReport.createdAt).getTime();
  const now = Date.now();
  if (now - createdAtTime > timeWindowMs) return false;

  // Attributes check
  const matchReporter = String(existingReport.reporter_id) === String(queryParams.reporter_id);
  const matchReported = String(existingReport.reported_user_id) === String(queryParams.reported_user_id);
  const matchCategory = existingReport.category === queryParams.category;
  
  // Check context (must match ride_id or booking_id)
  const matchRide = String(existingReport.ride_id) === String(queryParams.ride_id);
  const matchBooking = String(existingReport.booking_id) === String(queryParams.booking_id);

  return matchReporter && matchReported && matchCategory && (matchRide || matchBooking);
};

/**
 * Returns merged detail text formatted with timestamp.
 * 
 * @param {string} originalDetail 
 * @param {string} additionalDetail 
 * @param {Date} [timestamp] 
 * @returns {string}
 */
export const getMergedDetail = (originalDetail, additionalDetail, timestamp = new Date()) => {
  return `${originalDetail}\n\n[Additional Detail added at ${timestamp.toISOString()}]: ${additionalDetail}`;
};

/**
 * Checks for an active SOS alert on the ride to link to the report.
 * 
 * @param {Object} params
 * @param {string|number} params.rideId
 * @param {Array} params.activeAlerts - Array of active alerts
 * @returns {Object|null}
 */
export const findActiveSosAlert = ({ rideId, activeAlerts }) => {
  if (!rideId || !activeAlerts) return null;
  return activeAlerts.find(alert => 
    String(alert.ride_id) === String(rideId) && alert.status === 'active'
  ) || null;
};
