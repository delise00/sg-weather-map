import { LocationItem, RouteResult, TravelMode, WeatherInfo, HealthCheckResponse, RouteInstruction } from '../types/index.ts';
import { decodePolyline } from '../utils/polyline.ts';

/**
 * Client service connecting to internal backend routes
 */

export async function searchLocations(query: string): Promise<LocationItem[]> {
  if (!query || !query.trim()) return [];

  const url = `/api/onemap-search?searchVal=${encodeURIComponent(query.trim())}`;
  const res = await fetch(url);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Location could not be found. Please try another search.');
  }

  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    return [];
  }

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

export async function getDirections(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  mode: TravelMode
): Promise<RouteResult> {
  const url = `/api/onemap-route?start=${start.lat},${start.lng}&end=${end.lat},${end.lng}&routeType=${mode}`;
  const res = await fetch(url);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Unable to calculate the route right now. Please try again.');
  }

  const data = await res.json();

  let coordinates: [number, number][] = [];
  if (data.route_geometry) {
    coordinates = decodePolyline(data.route_geometry);
  }

  const instructions: RouteInstruction[] = [];
  if (Array.isArray(data.route_instructions)) {
    for (const item of data.route_instructions) {
      if (Array.isArray(item) && item.length >= 10) {
        // [action, note, lengthMeters, latLngStr, timeSeconds, distanceStr, startHeading, endHeading, mode, instruction]
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

        instructions.push({
          action,
          instruction,
          distance,
          timeSeconds,
          latLng,
        });
      }
    }
  }

  // If geometry was empty but instructions had points, use them
  if (coordinates.length === 0 && instructions.length > 0) {
    for (const inst of instructions) {
      if (inst.latLng) coordinates.push(inst.latLng);
    }
  }

  // If still empty, link start and end directly
  if (coordinates.length === 0) {
    coordinates = [
      [start.lat, start.lng],
      [end.lat, end.lng],
    ];
  }

  const summary = data.route_summary || {};

  return {
    status: data.status || 0,
    statusMessage: data.status_message || 'Route calculated',
    coordinates,
    totalDistanceMeters: Number(summary.total_distance) || 0,
    totalTimeSeconds: Number(summary.total_time) || 0,
    routeType: mode,
    instructions,
    routeName: data.route_name || [],
  };
}

export async function getWeather(lat?: number, lng?: number): Promise<WeatherInfo> {
  const query = lat !== undefined && lng !== undefined ? `?lat=${lat}&lng=${lng}` : '';
  const res = await fetch(`/api/weather${query}`);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Live 2-hour weather information is temporarily unavailable.');
  }

  const json = await res.json();
  if (!json.data) {
    throw new Error('Live 2-hour weather information is temporarily unavailable.');
  }

  return json.data;
}

export async function checkApiHealth(): Promise<HealthCheckResponse> {
  const res = await fetch('/api/health');
  if (!res.ok) {
    throw new Error(`Health check failed with HTTP status ${res.status}`);
  }
  return res.json();
}

export async function setApiCredentials(token: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/set-credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return res.json();
}
