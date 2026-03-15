const haversineDistance = require("./haversine");

const FARE_CONFIG = {
  auto:  { base: 25, perKm: 10, perMin: 1.0 },
  mini:  { base: 30, perKm: 12, perMin: 1.5 },
  sedan: { base: 50, perKm: 15, perMin: 2.0 },
  suv:   { base: 80, perKm: 20, perMin: 2.5 },
};

/**
 * Estimate fare for a ride
 * @param {object} pickup    - { lat, lng }
 * @param {object} destination - { lat, lng }
 * @param {string} vehicleType - auto | mini | sedan | suv
 * @param {number} availableDrivers - used for surge calculation
 * @returns {object} { distanceKm, estimatedFare, breakdown }
 */
const estimateFare = (pickup, destination, vehicleType = "mini", availableDrivers = 5) => {
  const distanceKm = haversineDistance(
    pickup.lat,
    pickup.lng,
    destination.lat,
    destination.lng
  );

  const config = FARE_CONFIG[vehicleType] || FARE_CONFIG.mini;
  const estimatedMinutes = Math.ceil((distanceKm / 30) * 60); // avg 30km/h in city

  let fare = config.base + config.perKm * distanceKm + config.perMin * estimatedMinutes;

  // Surge pricing — if fewer than 3 drivers available, apply surge
  let surge = 1.0;
  if (availableDrivers === 0) surge = 2.0;
  else if (availableDrivers <= 2) surge = 1.5;
  else if (availableDrivers <= 4) surge = 1.2;

  fare = Math.ceil(fare * surge);

  return {
    distanceKm,
    estimatedMinutes,
    estimatedFare: fare,
    surge,
    breakdown: {
      baseFare: config.base,
      distanceFare: parseFloat((config.perKm * distanceKm).toFixed(2)),
      timeFare: parseFloat((config.perMin * estimatedMinutes).toFixed(2)),
      surgeMultiplier: surge,
      vehicleType,
    },
  };
};

module.exports = estimateFare;
