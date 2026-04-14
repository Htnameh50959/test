/**
 * Order-related helper functions.
 */

/**
 * Calculate estimated time of arrival (ETA).
 * A simple mockup based on Euclidean distance. In production, use Google Distance Matrix API.
 * 
 * @param {object} restaurantLocation - { type: "Point", coordinates: [lng, lat] }
 * @param {Array<number>} deliveryCoordinates - [lng, lat]
 * @returns {Date}
 */
exports.calculateETA = (restaurantLocation, deliveryCoordinates) => {
  const [rLng, rLat] = restaurantLocation.coordinates;
  const [dLng, dLat] = deliveryCoordinates;
  
  // Calculate Euclidean distance (very rough approximation for mock)
  const distance = Math.sqrt(Math.pow(rLng - dLng, 2) + Math.pow(rLat - dLat, 2));
  
  // 0.1 degree is roughly 11km. Let's say 30 mins per 0.1 degree + 15 mins prep.
  const travelMinutes = (distance / 0.1) * 30;
  const totalMinutes = Math.max(15, Math.min(120, 15 + travelMinutes));
  
  return new Date(Date.now() + totalMinutes * 60 * 1000);
};

/**
 * Format status for display in notifications.
 * @param {string} status 
 * @returns {string}
 */
exports.formatStatus = (status) => {
  return status.toLowerCase().replace(/_/g, ' ');
};

/**
 * Validates if the transition from currentStatus to newStatus is allowed.
 * @param {string} currentStatus 
 * @param {string} newStatus 
 * @returns {boolean}
 */
const STATUS_FLOW = {
  'PENDING': ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  'ACCEPTED': ['PREPARING', 'CANCELLED'],
  'PREPARING': ['READY_FOR_PICKUP', 'CANCELLED'],
  'READY_FOR_PICKUP': ['COURIER_ASSIGNED'],
  'COURIER_ASSIGNED': ['PICKED_UP', 'UNASSIGNED'],
  'PICKED_UP': ['IN_TRANSIT'],
  'IN_TRANSIT': ['DELIVERED', 'ISSUE_REPORTED'],
  'DELIVERED': ['COMPLETED'],
  'COMPLETED': [],
  'CANCELLED': [],
  'REJECTED': []
};

exports.validateStatusTransition = (currentStatus, newStatus) => {
  const allowedTransitions = STATUS_FLOW[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
};

exports.STATUS_FLOW = STATUS_FLOW;
