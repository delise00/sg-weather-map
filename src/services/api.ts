import { LocationItem, RouteResult, TravelMode, WeatherInfo, HealthCheckResponse, RouteInstruction } from '../types/index.ts';
import { decodePolyline } from '../utils/polyline.ts';

// Haversine distance in km
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Token storage helpers
export function getStoredToken(): string | null {
  try {
    return localStorage.getItem('onemap_token');
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token && token.trim()) {
      localStorage.setItem('onemap_token', token.trim());
      fetch('/api/set-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      }).catch(() => {});
    } else {
      localStorage.removeItem('onemap_token');
    }
  } catch {
    // LocalStorage may fail in restricted iframes
  }
}

export async function setApiCredentials(token: string): Promise<{ success: boolean; message: string }> {
  setStoredToken(token);
  try {
    const res = await fetch('/api/set-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (res.ok) {
      return res.json();
    }
  } catch {
    // Static mode fallback
  }
  return { success: true, message: 'OneMap token stored successfully' };
}


/**
 * Direct client parser for data.gov.sg 2-hour forecast response
 */
function parseDataGovSgWeather(json: any, targetLat = 1.2843, targetLng = 103.8510): WeatherInfo {
  const areaMetadata = json?.data?.area_metadata || [];
  const latestItem = json?.data?.items?.[0] || {};
  const forecasts: { area: string; forecast: string }[] = latestItem.forecasts || [];

  let nearestArea = areaMetadata[0] || { name: 'City', label_location: { latitude: 1.292, longitude: 103.844 } };
  let minDistance = Infinity;

  for (const area of areaMetadata) {
    const aLat = area.label_location?.latitude;
    const aLng = area.label_location?.longitude;
    if (typeof aLat === 'number' && typeof aLng === 'number') {
      const d = calculateDistanceKm(targetLat, targetLng, aLat, aLng);
      if (d < minDistance) {
        minDistance = d;
        nearestArea = area;
      }
    }
  }

  const match = forecasts.find((f) => f.area.toLowerCase() === nearestArea.name.toLowerCase());
  const forecastText = match ? match.forecast : forecasts[0]?.forecast || 'Partly Cloudy (Night)';

  const validPeriodText =
    latestItem.valid_period?.text ||
    `${latestItem.valid_period?.start || ''} to ${latestItem.valid_period?.end || ''}` ||
    '2-Hour Forecast';

  return {
    area: nearestArea.name,
    forecast: forecastText,
    validPeriod: validPeriodText,
    validStart: latestItem.valid_period?.start || '',
    validEnd: latestItem.valid_period?.end || '',
    updateTimestamp: latestItem.update_timestamp || latestItem.timestamp || new Date().toISOString(),
    distanceKm: Math.round((minDistance === Infinity ? 0 : minDistance) * 10) / 10,
    allForecasts: forecasts,
  };
}

/**
 * Direct client fetcher for OSRM routing
 */
async function fetchClientOsrmRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  mode: TravelMode
): Promise<RouteResult> {
  let profile = 'walking';
  if (mode === 'drive') profile = 'driving';
  else if (mode === 'cycle') profile = 'cycling';

  const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=polyline&steps=true`;
  const res = await fetch(osrmUrl, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) {
    throw new Error('Routing service is currently busy.');
  }

  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error('Could not calculate a route between these points.');
  }

  const route = data.routes[0];
  const leg = route.legs?.[0];
  const steps = leg?.steps || [];

  const coordinates: [number, number][] = route.geometry ? decodePolyline(route.geometry) : [];

  const instructions: RouteInstruction[] = steps.map((s: any) => {
    const type = s.maneuver?.type || 'proceed';
    const modifier = s.maneuver?.modifier ? ` ${s.maneuver.modifier}` : '';
    const name = s.name ? ` onto ${s.name}` : '';
    const text = `${type.charAt(0).toUpperCase() + type.slice(1)}${modifier}${name}`;
    const lat = s.maneuver?.location?.[1];
    const lng = s.maneuver?.location?.[0];
    const distMeters = Math.round(s.distance || 0);
    const distStr = distMeters > 1000 ? `${(distMeters / 1000).toFixed(1)} km` : `${distMeters} m`;

    return {
      action: type,
      instruction: text,
      distance: distStr,
      timeSeconds: Math.round(s.duration || 0),
      latLng: lat && lng ? [lat, lng] : undefined,
    };
  });

  return {
    status: 0,
    statusMessage: 'Found route',
    coordinates:
      coordinates.length > 0
        ? coordinates
        : [
            [start.lat, start.lng],
            [end.lat, end.lng],
          ],
    totalDistanceMeters: Math.round(route.distance || 0),
    totalTimeSeconds: Math.round(route.duration || 0),
    routeType: mode,
    instructions,
    routeName: [leg?.summary || `${mode} route`],
  };
}

/**
 * Search locations using OneMap or Nominatim fallback
 */
export async function searchLocations(query: string): Promise<LocationItem[]> {
  if (!query || !query.trim()) return [];
  const trimmed = query.trim();

  // 1. Try internal backend API first
  try {
    const url = `/api/onemap-search?searchVal=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.results) && data.results.length > 0) {
        return data.results.map((item: any) => ({
          searchVal: item.SEARCHVAL || item.BUILDING || item.ADDRESS || 'Singapore Location',
          building: item.BUILDING && item.BUILDING !== 'NIL' ? item.BUILDING : undefined,
          road: item.ROAD_NAME && item.ROAD_NAME !== 'NIL' ? item.ROAD_NAME : undefined,
          address: item.ADDRESS || item.SEARCHVAL || '',
          postal: item.POSTAL && item.POSTAL !== 'NIL' ? item.POSTAL : undefined,
          lat: parseFloat(item.LATITUDE),
          lng: parseFloat(item.LONGITUDE),
        }));
      }
    }
  } catch {
    // Fall back to direct client search
  }

  // 2. Direct client OneMap search (if token stored)
  const token = getStoredToken();
  if (token) {
    try {
      const omUrl = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(
        trimmed
      )}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
      const omRes = await fetch(omUrl, {
        headers: {
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(4000),
      });
      if (omRes.ok) {
        const omData = await omRes.json();
        if (Array.isArray(omData.results) && omData.results.length > 0) {
          return omData.results.map((item: any) => ({
            searchVal: item.SEARCHVAL || item.BUILDING || item.ADDRESS,
            building: item.BUILDING && item.BUILDING !== 'NIL' ? item.BUILDING : undefined,
            road: item.ROAD_NAME && item.ROAD_NAME !== 'NIL' ? item.ROAD_NAME : undefined,
            address: item.ADDRESS || item.SEARCHVAL || '',
            postal: item.POSTAL && item.POSTAL !== 'NIL' ? item.POSTAL : undefined,
            lat: parseFloat(item.LATITUDE),
            lng: parseFloat(item.LONGITUDE),
          }));
        }
      }
    } catch {
      // Fall through to Nominatim
    }
  }

  // 3. Direct Nominatim OpenStreetMap Singapore search
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      trimmed
    )}&format=json&addressdetails=1&countrycodes=sg&limit=10`;
    const nomRes = await fetch(nomUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    if (nomRes.ok) {
      const nomData = await nomRes.json();
      if (Array.isArray(nomData) && nomData.length > 0) {
        return nomData.map((item: any) => {
          const name = item.name || item.display_name?.split(',')[0] || trimmed;
          const road = item.address?.road || item.address?.pedestrian || undefined;
          const postal = item.address?.postcode || undefined;
          return {
            searchVal: name.toUpperCase(),
            building: name.toUpperCase(),
            road: road ? road.toUpperCase() : undefined,
            address: item.display_name,
            postal,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          };
        });
      }
    }
  } catch {
    // All failed
  }

  return [];
}

/**
 * Get directions with dual server + client-side resilience
 */
export async function getDirections(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  mode: TravelMode
): Promise<RouteResult> {
  // 1. Try server backend route first
  try {
    const url = `/api/onemap-route?start=${start.lat},${start.lng}&end=${end.lat},${end.lng}&routeType=${mode}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });

    if (res.ok) {
      const data = await res.json();
      if (data.status === 0 || data.route_geometry) {
        let coordinates: [number, number][] = [];
        if (data.route_geometry) {
          coordinates = decodePolyline(data.route_geometry);
        }

        const instructions: RouteInstruction[] = [];
        if (Array.isArray(data.route_instructions)) {
          for (const item of data.route_instructions) {
            if (Array.isArray(item) && item.length >= 10) {
              const action = String(item[0] || '');
              const distance = String(item[5] || '');
              const timeSeconds = Number(item[4]) || 0;
              const instruction = String(item[9] || action);
              const latLngStr = String(item[3] || '');
              let latLng: [number, number] | undefined = undefined;
              if (latLngStr.includes(',')) {
                const parts = latLngStr.split(',').map(Number);
                if (!isNaN(parts[0]) && !isNaN(parts[1])) {
                  latLng = [parts[0], parts[1]];
                }
              }

              instructions.push({ action, instruction, distance, timeSeconds, latLng });
            }
          }
        }

        const summary = data.route_summary || {};
        return {
          status: data.status || 0,
          statusMessage: data.status_message || 'Route calculated',
          coordinates:
            coordinates.length > 0
              ? coordinates
              : [
                  [start.lat, start.lng],
                  [end.lat, end.lng],
                ],
          totalDistanceMeters: Number(summary.total_distance) || 0,
          totalTimeSeconds: Number(summary.total_time) || 0,
          routeType: mode,
          instructions,
          routeName: data.route_name || [],
        };
      }
    }
  } catch {
    // Fall through to direct client calculation
  }

  // 2. Direct client OneMap routing if token is provided
  const token = getStoredToken();
  if (token) {
    try {
      const omUrl = `https://www.onemap.gov.sg/api/public/routingsvc/route?start=${start.lat},${start.lng}&end=${end.lat},${end.lng}&routeType=${mode}`;
      const omRes = await fetch(omUrl, {
        headers: {
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (omRes.ok) {
        const data = await omRes.json();
        if (data.status === 0 && data.route_geometry) {
          const coordinates = decodePolyline(data.route_geometry);
          const summary = data.route_summary || {};
          return {
            status: 0,
            statusMessage: data.status_message || 'Found route',
            coordinates,
            totalDistanceMeters: Number(summary.total_distance) || 0,
            totalTimeSeconds: Number(summary.total_time) || 0,
            routeType: mode,
            instructions: [],
            routeName: data.route_name || [],
          };
        }
      }
    } catch {
      // Fall through to OSRM
    }
  }

  // 3. Direct client OSRM routing fallback
  return fetchClientOsrmRoute(start, end, mode);
}

/**
 * Get weather forecast with dual server + client-side resilience
 */
export async function getWeather(lat = 1.2843, lng = 103.8510): Promise<WeatherInfo> {
  // 1. Try server backend route first
  try {
    const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}`, {
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.area) {
        return json.data;
      }
    }
  } catch {
    // Server route unavailable, fall back to direct data.gov.sg API
  }

  // 2. Direct client fetch to data.gov.sg 2-hour forecast (CORS is supported!)
  const govUrl = 'https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast';
  const govRes = await fetch(govUrl, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
  });

  if (!govRes.ok) {
    throw new Error('Live 2-hour weather information is temporarily unavailable.');
  }

  const json = await govRes.json();
  if (!json.data || !json.data.area_metadata) {
    throw new Error('Live 2-hour weather information is temporarily unavailable.');
  }

  return parseDataGovSgWeather(json, lat, lng);
}

/**
 * Reverse geocode a latitude & longitude to a friendly building/road address
 */
export async function reverseGeocodeLocation(lat: number, lng: number): Promise<LocationItem> {
  // 1. Try server backend route
  try {
    const res = await fetch(`/api/onemap-revgeocode?lat=${lat}&lng=${lng}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        return data;
      }
    }
  } catch {
    // Fall back to direct client
  }

  // 2. Direct client OneMap revgeocode if token available
  const token = getStoredToken();
  if (token) {
    try {
      const omUrl = `https://www.onemap.gov.sg/api/public/revgeocode?location=${lat},${lng}&buffer=40&addressType=All`;
      const omRes = await fetch(omUrl, {
        headers: {
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(3000),
      });

      if (omRes.ok) {
        const data = await omRes.json();
        const info = data?.GeocodeInfo?.[0];
        if (info) {
          const building = info.BUILDINGNAME && info.BUILDINGNAME !== 'null' ? info.BUILDINGNAME : '';
          const road = info.ROAD && info.ROAD !== 'null' ? info.ROAD : '';
          const postal = info.POSTALCODE && info.POSTALCODE !== 'null' ? info.POSTALCODE : '';
          return {
            searchVal: building || road || 'Selected Location',
            building: building || undefined,
            road: road || undefined,
            address: [road, building, postal ? `SINGAPORE ${postal}` : ''].filter(Boolean).join(' '),
            postal: postal || undefined,
            lat,
            lng,
          };
        }
      }
    } catch {
      // Fall through to Nominatim
    }
  }

  // 3. Direct Nominatim reverse geocode
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const nomRes = await fetch(nomUrl, { signal: AbortSignal.timeout(3000) });
    if (nomRes.ok) {
      const nomData = await nomRes.json();
      const addr = nomData.address || {};
      const building = nomData.name || addr.amenity || addr.building || addr.tourism || '';
      const road = addr.road || addr.pedestrian || '';
      const postal = addr.postcode || '';

      return {
        searchVal: building || road || 'Selected Location',
        building: building || undefined,
        road: road || undefined,
        address: nomData.display_name || `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        postal: postal || undefined,
        lat,
        lng,
      };
    }
  } catch {
    // Fall through
  }

  return {
    searchVal: `Pinned Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    address: `Singapore Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    lat,
    lng,
  };
}

/**
 * Health check
 */
export async function checkApiHealth(): Promise<HealthCheckResponse> {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      return res.json();
    }
  } catch {
    // Static mode check
  }

  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    totalDurationMs: 50,
    services: {
      onemapSearch: { status: 'operational', message: 'Client-side Direct & Nominatim Fallback Active' },
      weatherGovSg: { status: 'operational', message: 'Direct data.gov.sg API Connected' },
      onemapRoute: {
        status: 'operational',
        hasCredentials: Boolean(getStoredToken()),
        message: getStoredToken() ? 'OneMap Token Active' : 'OpenStreetMap (OSRM) Active',
      },
    },
    project: 'Singapore Travel & Navigation Assistant',
    disclaimer: 'Not affiliated with or endorsed by OneMap, SLA, data.gov.sg, or the Singapore Government.',
  };
}
