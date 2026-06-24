import { calculateCostShare } from '../cost-calculation-service/costCalculator.js';

/**
 * Pure function utility for Haversine distance.
 * Calculates geographic distance in kilometers between two lat/lng coordinates.
 * 
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in kilometers
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R_EARTH = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R_EARTH * c;
}

/**
 * Converts HH:MM:SS or HH:MM string to seconds from midnight.
 * 
 * @param {string} timeStr 
 * @returns {number} Seconds
 */
export function timeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  const hrs = parts[0] || 0;
  const mins = parts[1] || 0;
  const secs = parts[2] || 0;
  return hrs * 3600 + mins * 60 + secs;
}

/**
 * Converts seconds from midnight to HH:MM:SS string.
 * 
 * @param {number} totalSeconds 
 * @returns {string} HH:MM:SS
 */
export function secondsToTime(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600) % 24;
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  return [
    String(hrs).padStart(2, '0'),
    String(mins).padStart(2, '0'),
    String(secs).padStart(2, '0')
  ].join(':');
}

/**
 * Core matching logic (Pure function).
 * Runs the matching algorithm for a passenger search query against candidate driver rides.
 * 
 * @param {Object} passengerQuery - { pickup_location: { latitude, longitude }, drop_location: { latitude, longitude }, ride_date, preferred_time, time_window_hours }
 * @param {Array} candidateRides - Array of plain ride objects
 * @param {Object} config - { MAX_PROXIMITY_DISTANCE_KM, MIN_OVERLAP_THRESHOLD_PCT, AVERAGE_SPEED_KM_H }
 * @returns {Array} List of matched, scored, and ranked rides
 */
export function findMatches(passengerQuery, candidateRides, config = {}) {
  const MAX_PROXIMITY = config.MAX_PROXIMITY_DISTANCE_KM || 1.0;
  const MIN_OVERLAP = config.MIN_OVERLAP_THRESHOLD_PCT || 20.0;
  const AVG_SPEED = config.AVERAGE_SPEED_KM_H || 40.0;

  const { pickup_location, drop_location, ride_date, preferred_time, time_window_hours } = passengerQuery;
  const P1 = pickup_location;
  const P2 = drop_location;

  const matches = [];

  for (const ride of candidateRides) {
    // 1. Date match validation
    if (ride.ride_date !== ride_date) {
      continue;
    }

    // 2. Available seats validation
    if (ride.available_seats <= 0) {
      continue;
    }

    // 3. Reconstruct ordered points along the driver's route
    // Point structure: { label, location: { latitude, longitude }, distance: distance_from_source_km, index }
    const points = [];
    points.push({
      label: ride.source_label,
      location: ride.source_location,
      distance: 0.0,
      index: 0
    });

    if (ride.stops && Array.isArray(ride.stops)) {
      ride.stops.forEach((stop, idx) => {
        points.push({
          label: stop.stop_label,
          location: stop.stop_location,
          distance: parseFloat(stop.distance_from_source_km),
          index: idx + 1
        });
      });
    }

    points.push({
      label: ride.destination_label,
      location: ride.destination_location,
      distance: parseFloat(ride.estimated_distance_km),
      index: points.length
    });

    // 4. Find the best matching point on driver route for passenger pickup (P1)
    let bestPickupIdx = -1;
    let minPickupDist = Infinity;
    
    points.forEach((pt, idx) => {
      const dist = haversineDistance(P1.latitude, P1.longitude, pt.location.latitude, pt.location.longitude);
      if (dist <= MAX_PROXIMITY && dist < minPickupDist) {
        minPickupDist = dist;
        bestPickupIdx = idx;
      }
    });

    // 5. Find the best matching point on driver route for passenger drop-off (P2)
    let bestDropIdx = -1;
    let minDropDist = Infinity;

    points.forEach((pt, idx) => {
      const dist = haversineDistance(P2.latitude, P2.longitude, pt.location.latitude, pt.location.longitude);
      if (dist <= MAX_PROXIMITY && dist < minDropDist) {
        minDropDist = dist;
        bestDropIdx = idx;
      }
    });

    // 6. Verify spatial validation (both points found on route, and pickup lies before drop-off)
    if (bestPickupIdx === -1 || bestDropIdx === -1 || bestPickupIdx >= bestDropIdx) {
      continue;
    }

    // 7. Calculate travel distance and route overlap percentage
    const D_total = parseFloat(ride.estimated_distance_km);
    const D_passenger = points[bestDropIdx].distance - points[bestPickupIdx].distance;
    const overlap_pct = (D_passenger / D_total) * 100;

    if (overlap_pct < MIN_OVERLAP) {
      continue;
    }

    // 8. Calculate time window compatibility
    // Estimate ETA at passenger pickup stop (travel time = distance / average speed)
    const travelTimeSeconds = (points[bestPickupIdx].distance / AVG_SPEED) * 3600;
    const departureSeconds = timeToSeconds(ride.departure_time);
    const pickupEtaSeconds = departureSeconds + travelTimeSeconds;

    const preferredSeconds = timeToSeconds(preferred_time);
    const timeDifferenceSeconds = Math.abs(pickupEtaSeconds - preferredSeconds);
    const maxAllowedDiffSeconds = parseFloat(time_window_hours || 2.0) * 3600;

    if (timeDifferenceSeconds > maxAllowedDiffSeconds) {
      continue;
    }

    // 9. Classify scenario and generate human-readable explanation
    let scenario = '';
    let explanation = '';
    const startMatched = (bestPickupIdx === 0);
    const endMatched = (bestDropIdx === points.length - 1);

    if (startMatched && endMatched) {
      scenario = 'Scenario 1: Exact Match';
      explanation = `Exact match for your route from ${points[bestPickupIdx].label} to ${points[bestDropIdx].label}.`;
    } else if (startMatched && !endMatched) {
      scenario = 'Scenario 2: Partial Match (Passenger Exits Early)';
      explanation = `Joins at driver start (${points[bestPickupIdx].label}) and exits early at ${points[bestDropIdx].label} (${D_passenger.toFixed(1)} km shared).`;
    } else if (!startMatched && endMatched) {
      scenario = 'Scenario 3: Partial Match (Passenger Joins Mid-Route)';
      explanation = `Joins mid-route at ${points[bestPickupIdx].label} (${(points[bestPickupIdx].distance).toFixed(1)} km from driver start) and rides to final destination.`;
    } else {
      scenario = 'Combined Scenario 2+3: Mid-Route Pickup AND Early Exit';
      explanation = `Joins mid-route at ${points[bestPickupIdx].label} and exits early at ${points[bestDropIdx].label} (${D_passenger.toFixed(1)} km shared).`;
    }

    // 10. Cost share calculation (proportional to overlap)
    const cost_share = calculateCostShare(ride.estimated_total_cost, D_total, D_passenger);

    // 11. Calculate ranking score
    const overlapScore = overlap_pct / 100;
    const timeScore = 1 - (timeDifferenceSeconds / maxAllowedDiffSeconds);
    const ratingScore = (ride.driver_rating || 5.0) / 5.0;
    const verifiedBonus = ride.driver_verified ? 1.0 : 0.0;
    
    // Weight factors: Overlap 40%, Time proximity 30%, Driver rating 20%, Verification 10%
    const score = (overlapScore * 0.4) + (timeScore * 0.3) + (ratingScore * 0.2) + (verifiedBonus * 0.1);

    matches.push({
      ride_id: ride.ride_id,
      driver_id: ride.driver_id,
      driver_name: ride.driver_name,
      driver_rating: ride.driver_rating,
      driver_verified: ride.driver_verified,
      vehicle_type: ride.vehicle_type,
      vehicle_name: ride.vehicle_name,
      source_label: ride.source_label,
      destination_label: ride.destination_label,
      departure_time: ride.departure_time,
      pickup_eta: secondsToTime(pickupEtaSeconds),
      overlap_percentage: Math.round(overlap_pct),
      cost_share,
      match_scenario: scenario,
      match_explanation: explanation,
      score: parseFloat(score.toFixed(4)),
      estimated_distance_km: ride.estimated_distance_km,
      available_seats: ride.available_seats,
      total_seats: ride.total_seats,
      preferences: ride.preferences
    });
  }

  // Sort ranked matches descending by score
  return matches.sort((a, b) => b.score - a.score);
}
