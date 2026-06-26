export type Coordinates = {
  lat: number;
  lng: number;
};

export type LocationOption = {
  city: string;
  state: string;
  coordinates: Coordinates;
};

export type LocationSelection = {
  city: string;
  state: string;
  formattedLocation: string;
  lat?: number;
  lng?: number;
};

export const locationOptions: LocationOption[] = [
  {
    city: "San Jose",
    state: "CA",
    coordinates: { lat: 37.3382, lng: -121.8863 },
  },
  {
    city: "Santa Clara",
    state: "CA",
    coordinates: { lat: 37.3541, lng: -121.9552 },
  },
  {
    city: "Campbell",
    state: "CA",
    coordinates: { lat: 37.2872, lng: -121.95 },
  },
  {
    city: "Los Gatos",
    state: "CA",
    coordinates: { lat: 37.2358, lng: -121.9624 },
  },
  {
    city: "Morgan Hill",
    state: "CA",
    coordinates: { lat: 37.1305, lng: -121.6544 },
  },
  {
    city: "Mountain View",
    state: "CA",
    coordinates: { lat: 37.3861, lng: -122.0839 },
  },
  {
    city: "Palo Alto",
    state: "CA",
    coordinates: { lat: 37.4419, lng: -122.143 },
  },
];

const knownLocations: Record<string, Coordinates> = {
  ...Object.fromEntries(
    locationOptions.map((location) => [
      location.city.toLowerCase(),
      location.coordinates,
    ]),
  ),
  ...Object.fromEntries(
    locationOptions.map((location) => [
      formatLocation(location.city, location.state).toLowerCase(),
      location.coordinates,
    ]),
  ),
  "san jose": { lat: 37.3382, lng: -121.8863 },
  "san jose, ca": { lat: 37.3382, lng: -121.8863 },
  "santa clara": { lat: 37.3541, lng: -121.9552 },
  "santa clara, ca": { lat: 37.3541, lng: -121.9552 },
  campbell: { lat: 37.2872, lng: -121.95 },
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

export const locationStates = Array.from(
  new Set(locationOptions.map((location) => location.state)),
).sort();

export function formatLocation(city: string, state: string) {
  return [city.trim(), state.trim()].filter(Boolean).join(", ");
}

export function parseLocation(location: string) {
  const [city = "", state = ""] = location
    .split(",")
    .map((part) => part.trim());
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

export function coordinatesForValues(values: {
  lat?: number | null;
  lng?: number | null;
  location?: string;
}) {
  const lat = Number(values.lat);
  const lng = Number(values.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return values.location ? coordinatesForLocation(values.location) : null;
}

export function serviceRadiusMilesFor(values: {
  serviceRadiusMiles?: number | null;
  serviceRadius?: string | number | null;
}) {
  const radius = Number(
    values.serviceRadiusMiles ?? values.serviceRadius ?? 25,
  );
  return Number.isFinite(radius) && radius > 0 ? radius : 25;
}

export function locationSelectionFromText(value: string): LocationSelection {
  const trimmed = value.trim();
  const localMatch = localLocationSuggestions(trimmed, 1)[0];
  if (
    localMatch &&
    (localMatch.formattedLocation.toLowerCase() === trimmed.toLowerCase() ||
      localMatch.city.toLowerCase() === trimmed.toLowerCase())
  ) {
    return localMatch;
  }

  const { city, state } = parseLocation(trimmed);
  return {
    city,
    state,
    formattedLocation: formatLocation(city, state) || trimmed,
  };
}

export function localLocationSuggestions(
  query: string,
  limit = 8,
): LocationSelection[] {
  const normalized = query.trim().toLowerCase();
  return locationOptions
    .filter((location) => {
      const formattedLocation = formatLocation(
        location.city,
        location.state,
      ).toLowerCase();
      return (
        !normalized ||
        location.city.toLowerCase().includes(normalized) ||
        formattedLocation.includes(normalized)
      );
    })
    .slice(0, limit)
    .map((location) => ({
      city: location.city,
      state: location.state,
      formattedLocation: formatLocation(location.city, location.state),
      lat: location.coordinates.lat,
      lng: location.coordinates.lng,
    }));
}

type MapboxFeature = {
  place_name?: string;
  text?: string;
  center?: [number, number];
  context?: { id?: string; short_code?: string; text?: string }[];
  properties?: { short_code?: string };
};

export async function searchLocations(
  query: string,
  signal?: AbortSignal,
): Promise<LocationSelection[]> {
  const trimmed = query.trim();
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!trimmed || trimmed.length < 2) return localLocationSuggestions(trimmed);
  if (!token) return localLocationSuggestions(trimmed);

  const params = new URLSearchParams({
    access_token: token,
    autocomplete: "true",
    limit: "6",
    types: "place,locality,neighborhood",
    country: "us",
  });

  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json?${params.toString()}`,
    { signal },
  );
  if (!response.ok) return localLocationSuggestions(trimmed);

  const data = (await response.json()) as { features?: MapboxFeature[] };
  const remoteSuggestions = (data.features ?? [])
    .map(locationSelectionFromMapboxFeature)
    .filter((location): location is LocationSelection => Boolean(location));

  return remoteSuggestions.length
    ? remoteSuggestions
    : localLocationSuggestions(trimmed);
}

function locationSelectionFromMapboxFeature(
  feature: MapboxFeature,
): LocationSelection | null {
  const [lng, lat] = feature.center ?? [];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const region = feature.context?.find((item) =>
    item.id?.startsWith("region."),
  );
  const state = (
    region?.short_code?.split("-").pop() ||
    region?.text ||
    ""
  ).toUpperCase();
  const city = feature.text || parseLocation(feature.place_name || "").city;
  const formattedLocation =
    formatLocation(city, state) || feature.place_name || city;

  return {
    city,
    state,
    formattedLocation,
    lat,
    lng,
  };
}

export function milesBetween(from: Coordinates, to: Coordinates) {
  const earthRadiusMiles = 3958.8;
  const latDelta = degreesToRadians(to.lat - from.lat);
  const lngDelta = degreesToRadians(to.lng - from.lng);
  const fromLat = degreesToRadians(from.lat);
  const toLat = degreesToRadians(to.lat);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(fromLat) *
      Math.cos(toLat) *
      Math.sin(lngDelta / 2) *
      Math.sin(lngDelta / 2);

  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}
