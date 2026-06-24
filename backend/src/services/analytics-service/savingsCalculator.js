/**
 * Pure utility module for calculating fuel, CO2, and cost savings.
 * 
 * Constants are based on typical commuter vehicles in India:
 * - Fuel Consumption: ~12.5 km/L (0.08 L/km)
 * - CO2 Emissions: ~120 g/km (0.12 kg/km)
 * - Solo Cost Multiplier: 2.0x (assumes solo taxi/auto or single-occupant car running costs are higher than carpooling share)
 */

export const FUEL_CONSUMPTION_PER_KM = 0.08; // Liters per km
export const CO2_EMISSIONS_PER_KM = 0.12;    // Kilograms per km
export const SOLO_COST_MULTIPLIER = 2.0;       // Multiplier for solo travel cost vs shared cost

/**
 * Calculates environmental and cost savings for a passenger's shared distance.
 * 
 * @param {Object} params
 * @param {number} params.distanceKm - Distance traveled by the passenger in km
 * @param {number} params.actualCostShare - Actual cost share paid by the passenger
 * @returns {Object} { fuelSavedLiters, co2AvoidedKg, costSaved }
 */
export function calculateRideSavings({ distanceKm, actualCostShare }) {
  const dist = parseFloat(distanceKm);
  const cost = parseFloat(actualCostShare);

  if (isNaN(dist) || isNaN(cost) || dist <= 0 || cost <= 0) {
    return {
      fuelSavedLiters: 0.0000,
      co2AvoidedKg: 0.0000,
      costSaved: 0.00
    };
  }

  const fuelSavedLiters = parseFloat((dist * FUEL_CONSUMPTION_PER_KM).toFixed(4));
  const co2AvoidedKg = parseFloat((dist * CO2_EMISSIONS_PER_KM).toFixed(4));
  
  // Cost saved = estimated solo cost - actual cost share
  const estimatedSoloCost = cost * SOLO_COST_MULTIPLIER;
  const costSaved = parseFloat((estimatedSoloCost - cost).toFixed(2));

  return {
    fuelSavedLiters,
    co2AvoidedKg,
    costSaved
  };
}
