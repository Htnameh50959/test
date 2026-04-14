/**
 * Geospatial and ETA utilities.
 * Uses the Haversine formula for distance calculation.
 */

/**
 * Calculate the great-circle distance between two points (Haversine formula).
 * @param {object} p1 - { lat, lng }
 * @param {object} p2 - { lat, lng }
 * @returns {number} Distance in meters
 */
exports.calculateDistance = (p1, p2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (p1.lat * Math.PI) / 180;
  const φ2 = (p2.lat * Math.PI) / 180;
  const Δφ = ((p2.lat - p1.lat) * Math.PI) / 180;
  const Δλ = ((p2.lng - p1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // meters
};

/**
 * Estimate the remaining time to destination.
 * @param {object} currentLoc - { lat, lng }
 * @param {object} destLoc - { lat, lng }
 * @param {number} [speed] - Speed in km/h (default 30)
 * @returns {object} { eta: Date, minutes: number, distance: number }
 */
exports.calculateETA = (currentLoc, destLoc, speed = 30) => {
  const distance = exports.calculateDistance(currentLoc, destLoc);

  // Time in hours = distance(km) / speed(km/h)
  // Account for traffic and stops (add 25% buffer)
  const timeInHours = (distance / 1000) / speed * 1.25;
  const timeInMinutes = Math.ceil(timeInHours * 60);

  const eta = new Date(Date.now() + timeInMinutes * 60 * 1000);

  return {
    eta,
    minutes: timeInMinutes,
    distance, // meters
  };
};

/**
 * Basic coordinate validation.
 * @param {number} lat
 * @param {number} lng
 * @returns {boolean}
 */
exports.isValidCoordinate = (lat, lng) => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};
