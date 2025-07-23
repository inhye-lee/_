// ** Helper Function to get the camera Offset for Immersive View //
/**
 * Calculates a camera position offset from a given lat/lon, at a specified distance and altitude,
 * facing the target point. Useful for "third-person" or "over-the-shoulder" views in 3D scenes.
 *
 * @param {number} lat - Latitude of the target point (degrees)
 * @param {number} lon - Longitude of the target point (degrees)
 * @param {number} heading - Heading in degrees (0 = north, 90 = east, etc.)
 * @param {number} distanceMeters - Horizontal distance behind the target (meters)
 * @param {number} altitudeOffset - Height above the target (meters)
 * @returns {Object} Camera position and tilt:
 *   {
 *     latitude: <camera latitude>,
 *     longitude: <camera longitude>,
 *     z: <camera altitude>,
 *     tilt: <camera tilt angle, degrees>
 *   }
 */

function getCameraOffsetPosition(lat, lon, heading, altitudeOffset = 100, distanceMeters = 100) {
  const R = 6378137; // Earth radius in meters
  const theta = (heading + 180) * Math.PI / 180; // Opposite direction
  // Offset in meters
  const dx = distanceMeters * Math.cos(theta);
  const dy = distanceMeters * Math.sin(theta);
  // Offset in lat/lon
  const dLat = dx / R * (180 / Math.PI);
  const dLon = dy / (R * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);
  // Camera position
  const camLat = lat + dLat;
  const camLon = lon + dLon;
  const camZ = altitudeOffset;
  // Calculate tilt angle (in degrees) so camera looks at the user
  // Horizontal distance in meters
  const horizontalDist = distanceMeters;
  // Vertical distance in meters
  const verticalDist = altitudeOffset;
  // Angle from horizontal plane (0 = flat, 90 = straight down)
  const tiltRad = Math.atan2(verticalDist, horizontalDist);
  const tiltDeg = 90 - (tiltRad * 180 / Math.PI); // ArcGIS tilt: 0 = top-down, 90 = horizontal
  return {
    latitude: camLat,
    longitude: camLon,
    z: camZ,
    tilt: tiltDeg
  };
}

// function getCameraOffsetPosition(lat, lon, heading, distanceMeters = 100, altitudeOffset = 100) {
//   const R = 6378137; // Earth radius in meters
//   const theta = (heading + 180) * Math.PI / 180; // Opposite direction
//   // Offset in meters
//   const dx = distanceMeters * Math.cos(theta);
//   const dy = distanceMeters * Math.sin(theta);
//   // Offset in lat/lon
//   const dLat = dx / R * (180 / Math.PI);
//   const dLon = dy / (R * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);
//   // Camera position
//   const camLat = lat + dLat;
//   const camLon = lon + dLon;
//   const camZ = altitudeOffset;
//   // Calculate tilt angle (in degrees) so camera looks at the user
//   // Horizontal distance in meters
//   const horizontalDist = distanceMeters;
//   // Vertical distance in meters
//   const verticalDist = altitudeOffset;
//   // Angle from horizontal plane (0 = flat, 90 = straight down)
//   const tiltRad = Math.atan2(verticalDist, horizontalDist);
//   const tiltDeg = 90 - (tiltRad * 180 / Math.PI); // ArcGIS tilt: 0 = top-down, 90 = horizontal
//   return {
//     latitude: camLat,
//     longitude: camLon,
//     z: camZ,
//     tilt: tiltDeg
//   };
// }
