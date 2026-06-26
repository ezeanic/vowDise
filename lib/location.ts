type Coordinates = {
  lat: number;
  lng: number;
};

export type LocationOption = {
  city: string;
  state: string;
  coordinates: Coordinates;
};

export const locationOptions: LocationOption[] = [
  { city: "San Jose", state: "CA", coordinates: { lat: 37.3382, lng: -121.8863 } },
  { city: "Santa Clara", state: "CA", coordinates: { lat: 37.3541, lng: -121.9552 } },
  { city: "Campbell", state: "CA", coordinates: { lat: 37.2872, lng: -121.95 } },
  { city: "Los Gatos", state: "CA", coordinates: { lat: 37.2358, lng: -121.9624 } },
  { city: "Morgan Hill", state: "CA", coordinates: { lat: 37.1305, lng: -121.6544 } },
  { city: "Mountain View", state: "CA", coordinates: { lat: 37.3861, lng: -122.0839 } },
  { city: "Palo Alto", state: "CA", coordinates: { lat: 37.4419, lng: -122.143 } },
];

const knownLocations: Record<string, Coordinates> = {
  ...Object.fromEntries(locationOptions.map((location) => [location.city.toLowerCase(), location.coordinates])),
  ...Object.fromEntries(locationOptions.map((location) => [formatLocation(location.city, location.state).toLowerCase(), location.coordinates])),
  "san jose": { lat: 37.3382, lng: -121.8863 },
  "san jose, ca": { lat: 37.3382, lng: -121.8863 },
  "santa clara": { lat: 37.3541, lng: -121.9552 },
  "santa clara, ca": { lat: 37.3541, lng: -121.9552 },
  "campbell": { lat: 37.2872, lng: -121.95 },
  "campbell, ca": { lat: 37.2872, lng: -121.95 },
  "los gatos": { lat: 37.2358, lng: -121.9624 },
  "los gatos, ca": { lat: 37.2358, lng: -121.9624 },
  "morgan hill": { lat: 37.1305, lng: -121.6544 },
  "morgan hill, ca": { lat: 37.1305, lng: -121.6544 },
  "mountain view": { lat: 37.3861, lng: -122.0839 },
  "mountain view, ca": { lat: 37.3861, lng: -122.0839 },
  "palo alto": { lat: 37.4419, lng: -122.143 },
  "palo alto, ca": { lat: 37.4419, lng: -122.143 },
};

export const locationStates = Array.from(new Set(locationOptions.map((location) => location.state))).sort();

export function formatLocation(city: string, state: string) {
  return [city.trim(), state.trim()].filter(Boolean).join(", ");
}

export function parseLocation(location: string) {
  const [city = "", state = ""] = location.split(",").map((part) => part.trim());
  return { city, state };
}

export function citiesForState(state: string) {
  return locationOptions
    .filter((location) => !state || location.state === state)
    .map((location) => location.city)
    .sort();
}

export function locationMatchesState(location: string, state: string) {
  if (!state) return true;
  return parseLocation(location).state.toLowerCase() === state.toLowerCase();
}

export function coordinatesForLocation(location: string) {
  const normalized = location.trim().toLowerCase();
  return knownLocations[normalized] ?? null;
}

export function milesBetween(from: Coordinates, to: Coordinates) {
  const earthRadiusMiles = 3958.8;
  const latDelta = degreesToRadians(to.lat - from.lat);
  const lngDelta = degreesToRadians(to.lng - from.lng);
  const fromLat = degreesToRadians(from.lat);
  const toLat = degreesToRadians(to.lat);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2);

  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}
