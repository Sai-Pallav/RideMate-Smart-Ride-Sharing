// TODO: replace with real geocoding when Maps API is integrated
export const locationCoords = {
  'academic block a': { latitude: 37.775, longitude: -122.418 },
  'metro station terminal 2': { latitude: 37.789, longitude: -122.401 },
  'main campus gate 1': { latitude: 37.7749, longitude: -122.4194 },
  'campus main gate': { latitude: 37.7749, longitude: -122.4194 },
  'downtown station': { latitude: 37.7891, longitude: -122.4014 },
  'tech park cluster b': { latitude: 37.785, longitude: -122.405 },
  'it park gate 3': { latitude: 37.783, longitude: -122.408 },
  'central library': { latitude: 37.779, longitude: -122.412 },
  'boys hostel block c': { latitude: 37.776, longitude: -122.415 },
  'girls hostel block a': { latitude: 37.777, longitude: -122.414 },
  'sports arena main entrance': { latitude: 37.781, longitude: -122.411 },
  'science complex': { latitude: 37.783, longitude: -122.408 }
};

export const resolveLocation = (label) => {
  const norm = (label || '').toLowerCase().trim();
  const coords = locationCoords[norm];
  if (!coords) return null;
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    lat: coords.latitude,
    lng: coords.longitude,
    label
  };
};
