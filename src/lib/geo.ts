// Geolocation Service with High Accuracy & Test Site Simulation

import { Coordinates } from '../types';

export interface LocationResult {
  coordinates?: Coordinates;
  error?: string;
}

export async function getCurrentBrowserLocation(): Promise<LocationResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      return resolve({
        error: 'Geolocation is not supported by your current browser. Please use Chrome, Safari, or Edge.',
      });
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy || 15,
          },
        });
      },
      (err) => {
        let msg = 'Unable to capture GPS location.';
        if (err.code === 1) {
          msg = 'Location permission was denied. Please allow location access in your browser settings to sign in.';
        } else if (err.code === 2) {
          msg = 'GPS signal unavailable. Please ensure device location/GPS is switched on.';
        } else if (err.code === 3) {
          msg = 'Location request timed out. Please retry.';
        }
        resolve({ error: msg });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}
