import { Request, Response } from 'express';
import { OneMapRouteResponse } from './types.ts';

// In-memory token cache
let cachedToken: string | null = process.env.ONEMAP_TOKEN || null;
let tokenExpiryTimestamp = 0;

/**
 * Retrieve or refresh the OneMap token.
 */
export async function getOneMapToken(): Promise<string | null> {
  if (process.env.ONEMAP_TOKEN) {
    return process.env.ONEMAP_TOKEN.trim();
  }

  if (cachedToken && Date.now() < tokenExpiryTimestamp) {
    return cachedToken;
  }

  const email = process.env.ONEMAP_EMAIL;
  const password = process.env.ONEMAP_PASSWORD;

  if (!email || !password) {
    return cachedToken || null;
  }

  try {
    const tokenRes = await fetch('https://www.onemap.gov.sg/api/auth/post/getToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!tokenRes.ok) {
      return null;
    }

    const tokenData = await tokenRes.json();
    if (tokenData && tokenData.access_token) {
      cachedToken = tokenData.access_token;
      tokenExpiryTimestamp = Date.now() + 70 * 60 * 60 * 1000;
      return cachedToken;
    }
  } catch {
    // Keep cached token
  }

  return cachedToken;
}

export function setInMemoryToken(token: string) {
  cachedToken = token.trim();
  tokenExpiryTimestamp = Date.now() + 70 * 60 * 60 * 1000;
}

export function hasOneMapCredentials(): boolean {
  return Boolean(process.env.ONEMAP_TOKEN || (process.env.ONEMAP_EMAIL && process.env.ONEMAP_PASSWORD) || cachedToken);
}

/**
 * Fallback open-source routing (OSRM) for Singapore when OneMap API token is unconfigured or rate-limited.
 */
async function fetchOsrmFallbackRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  mode: string
): Promise<OneMapRouteResponse | null> {
  try {
    let profile = 'walking';
    if (mode === 'drive') profile = 'driving';
    else if (mode === 'cycle') profile = 'cycling';

    const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=polyline&steps=true`;
    const response = await fetch(osrmUrl, {
      signal: AbortSignal.timeout(6000),
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) return null;
    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    const leg = route.legs?.[0];
    const steps = leg?.steps || [];

    const instructions = steps.map((s: any) => {
      const type = s.maneuver?.type || 'proceed';
      const modifier = s.maneuver?.modifier ? ` ${s.maneuver.modifier}` : '';
      const name = s.name ? ` onto ${s.name}` : '';
      const text = `${type.charAt(0).toUpperCase() + type.slice(1)}${modifier}${name}`;
      const lat = s.maneuver?.location?.[1] || 0;
      const lng = s.maneuver?.location?.[0] || 0;
      return [
        type,
        '',
        Math.round(s.distance || 0),
        `${lat},${lng}`,
        Math.round(s.duration || 0),
        `${Math.round(s.distance || 0)} m`,
        0,
        0,
        mode,
        text,
      ];
    });

    return {
      status: 0,
      status_message: 'Found route',
      route_geometry: route.geometry || '',
      route_instructions: instructions,
      route_name: [leg?.summary || `${mode} route`],
      route_summary: {
        start_point: `${startLat},${startLng}`,
        end_point: `${endLat},${endLng}`,
        total_time: Math.round(route.duration || 0),
        total_distance: Math.round(route.distance || 0),
      },
    };
  } catch {
    return null;
  }
}

/**
 * Endpoint: /api/onemap-route
 * Queries OneMap routing service, with transparent OpenStreetMap/OSRM Singapore fallback.
 */
export async function handleOneMapRoute(req: Request, res: Response) {
  try {
    const start = (req.query.start as string)?.trim();
    const end = (req.query.end as string)?.trim();
    let routeType = ((req.query.routeType || req.query.mode) as string)?.trim()?.toLowerCase();

    const validModes = ['walk', 'drive', 'cycle', 'pt'];
    if (!routeType || !validModes.includes(routeType)) {
      routeType = 'walk';
    }

    if (!start || !end) {
      return res.status(400).json({
        error: 'Both start and end coordinates are required (format: lat,lng).',
      });
    }

    const [startLat, startLng] = start.split(',').map(Number);
    const [endLat, endLng] = end.split(',').map(Number);

    if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
      return res.status(400).json({
        error: 'Invalid coordinates provided. Expected numeric lat,lng values.',
      });
    }

    const token = await getOneMapToken();

    // If OneMap token exists, try OneMap official API first
    if (token) {
      const targetUrl = new URL('https://www.onemap.gov.sg/api/public/routingsvc/route');
      targetUrl.searchParams.set('start', `${startLat},${startLng}`);
      targetUrl.searchParams.set('end', `${endLat},${endLng}`);
      targetUrl.searchParams.set('routeType', routeType);

      try {
        let apiResponse = await fetch(targetUrl.toString(), {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
          },
          signal: AbortSignal.timeout(6000),
        });

        if (apiResponse.ok) {
          const routeData: OneMapRouteResponse = await apiResponse.json();
          if (routeData && routeData.status === 0) {
            return res.json({
              status: routeData.status,
              status_message: routeData.status_message,
              route_geometry: routeData.route_geometry || '',
              route_instructions: routeData.route_instructions || [],
              route_name: routeData.route_name || [],
              route_summary: routeData.route_summary || {
                start_point: start,
                end_point: end,
                total_time: 0,
                total_distance: 0,
              },
              routeType,
              source: 'onemap',
            });
          }
        }
      } catch {
        // Fall through to fallback
      }
    }

    // Fallback to OSRM high-resolution Singapore routing
    const fallbackRoute = await fetchOsrmFallbackRoute(startLat, startLng, endLat, endLng, routeType);

    if (fallbackRoute && fallbackRoute.status === 0) {
      return res.json({
        status: fallbackRoute.status,
        status_message: fallbackRoute.status_message,
        route_geometry: fallbackRoute.route_geometry,
        route_instructions: fallbackRoute.route_instructions,
        route_name: fallbackRoute.route_name,
        route_summary: fallbackRoute.route_summary,
        routeType,
        source: 'osrm-fallback',
      });
    }

    return res.status(502).json({
      error: 'Unable to calculate the route right now. Please try again.',
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Unable to calculate the route right now. Please try again.',
      details: error?.message || 'Unknown routing error',
    });
  }
}
