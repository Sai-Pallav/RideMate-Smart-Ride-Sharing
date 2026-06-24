/**
 * Pure function to calculate a passenger's distance-proportional cost share.
 * Formula: (passengerDistance / totalDistance) * totalEstimatedCost
 * 
 * @param {number} totalEstimatedCost - Total estimated cost of the ride
 * @param {number} totalDistance - Total distance of the ride in km
 * @param {number} passengerDistance - Distance traveled by the passenger in km
 * @returns {number} The distance-proportional cost share rounded to 2 decimal places
 */
export function calculateCostShare(totalEstimatedCost, totalDistance, passengerDistance) {
  const cost = parseFloat(totalEstimatedCost);
  const totalDist = parseFloat(totalDistance);
  const passengerDist = parseFloat(passengerDistance);

  if (isNaN(cost) || isNaN(totalDist) || isNaN(passengerDist)) {
    return 0.00;
  }

  if (totalDist <= 0 || passengerDist <= 0) {
    return 0.00;
  }

  // Ensure passenger distance cannot exceed total distance
  const validPassengerDist = passengerDist > totalDist ? totalDist : passengerDist;

  const share = (validPassengerDist / totalDist) * cost;
  return parseFloat(share.toFixed(2));
}
