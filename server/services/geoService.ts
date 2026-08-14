// Server-Authoritative Haversine Geofence Calculation

export interface GeoValidationResult {
  isWithinGeofence: boolean;
  distanceMeters: number;
  accuracyPassed: boolean;
  accuracyMeters: number;
  allowedRadiusMeters: number;
  accuracyThresholdMeters: number;
  errorMessage?: string;
}

export const geoService = {
  /**
   * Calculates the great-circle distance between two points in meters using the Haversine formula
   */
  calculateHaversineDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  },

  /**
   * Validates client-submitted coordinates against approved location geofence
   */
  validateLocationGeofence(
    clientLat: number,
    clientLng: number,
    clientAccuracy: number,
    locationLat: number,
    locationLng: number,
    radiusMeters: number,
    accuracyThresholdMeters: number = 100
  ): GeoValidationResult {
    const distanceMeters = this.calculateHaversineDistanceMeters(
      clientLat,
      clientLng,
      locationLat,
      locationLng
    );

    const accuracyPassed = clientAccuracy <= accuracyThresholdMeters;
    const isWithinGeofence = distanceMeters <= radiusMeters;

    let errorMessage: string | undefined;
    if (!accuracyPassed) {
      errorMessage = `GPS accuracy of ${Math.round(clientAccuracy)}m exceeds the required threshold of ${accuracyThresholdMeters}m. Please ensure GPS/high-accuracy mode is enabled.`;
    } else if (!isWithinGeofence) {
      errorMessage = `You are ${distanceMeters}m away from the approved perimeter. Maximum allowable geofence is ${radiusMeters}m.`;
    }

    return {
      isWithinGeofence,
      distanceMeters,
      accuracyPassed,
      accuracyMeters: clientAccuracy,
      allowedRadiusMeters: radiusMeters,
      accuracyThresholdMeters,
      errorMessage,
    };
  },
};
