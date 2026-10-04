const locationErrors = {
  1: 'Location permission was denied. Allow location access in your browser settings to punch in.',
  2: 'Your location could not be determined. Please try again.',
  3: 'Location request timed out. Please try again.',
};

export function requestCurrentLocation(geolocation = globalThis.navigator?.geolocation) {
  if (!geolocation?.getCurrentPosition) {
    return Promise.reject(new Error('Location is not supported by this browser.'));
  }

  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      (error) => reject(new Error(locationErrors[error.code] || 'Unable to get your location. Please try again.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}
