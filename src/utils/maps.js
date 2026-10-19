// Loads react-native-maps without crashing the app (same idea as
// utils/visionCamera.js): before the app is rebuilt with the native part,
// map areas show "Map not available" instead of a red error screen.
export const loadMapsLibrary = load => {
  try {
    const library = load();
    const MapView = library?.default ?? library?.MapView;
    return MapView && library.Marker && library.Polyline ? { ...library, MapView } : null;
  } catch {
    return null;
  }
};

export const maps = loadMapsLibrary(() => require('react-native-maps'));
export const isMapAvailable = maps !== null;

// Region that shows every coordinate, with some padding around them.
export const regionFor = (coords, padding = 1.6) => {
  const lats = coords.map(c => c.latitude);
  const lngs = coords.map(c => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.005, (maxLat - minLat) * padding),
    longitudeDelta: Math.max(0.005, (maxLng - minLng) * padding),
  };
};
