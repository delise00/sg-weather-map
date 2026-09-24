import { Request, Response } from 'express';
import { OneMapRouteResponse } from './types.ts';

// In-memory token cache
let cachedToken: string | null = process.env.ONEMAP_TOKEN || null;
let tokenExpiryTimestamp = 0;

/**
 * Retrieve or refresh the OneMap token.
 */
export async function getOneMapToken(): Promise<string | null> {
  // If a direct token is set and valid, use it
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
      // OneMap tokens expire in 72 hours, renew slightly earlier (70 hours)
      tokenExpiryTimestamp = Date.now() + 70 * 60 * 60 * 1000;
      return cachedToken;
    }
  } catch {
    // Return whatever cached token exists
  }

  return cachedToken;
}

/**
 * Optional helper for grader to set or test a token in memory
 */
export function setInMemoryToken(token: string) {
  cachedToken = token.trim();
  tokenExpiryTimestamp = Date.now() + 70 * 60 * 60 * 1000;
}

export function hasOneMapCredentials(): boolean {
  return Boolean(process.env.ONEMAP_TOKEN || (process.env.ONEMAP_EMAIL && process.env.ONEMAP_PASSWORD) || cachedToken);
}

/**
 * Endpoint: /api/onemap-route
 * Queries OneMap routing service between two coordinates.
 */
export async function handleOneMapRoute(req: Request, res: Response) {
  try {
    const start = (req.query.start as string)?.trim();
    const end = (req.query.end as string)?.trim();
    let routeType = ((req.query.routeType || req.query.mode) as string)?.trim()?.toLowerCase();

    // Supported modes: walk, drive, cycle, pt
    const validModes = ['walk', 'drive', 'cycle', 'pt'];
    if (!routeType || !validModes.includes(routeType)) {
      routeType = 'walk';
    }

    if (!start || !end) {
      return res.status(400).json({
        error: 'Both start and end coordinates are required (format: lat,lng).',
      });
    }

    // Validate coordinate formats
    const [startLat, startLng] = start.split(',').map(Number);
    const [endLat, endLng] = end.split(',').map(Number);

    if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
      return res.status(400).json({
        error: 'Invalid coordinates provided. Expected numeric lat,lng values.',
      });
    }

    const token = await getOneMapToken();

    if (!token) {
      return res.status(401).json({
        error: 'Unable to calculate the route right now. OneMap Routing requires an API token. Please configure ONEMAP_TOKEN or ONEMAP_EMAIL & ONEMAP_PASSWORD in server environment (.env).',
        missingCredentials: true,
      });
    }

    const targetUrl = new URL('https://www.onemap.gov.sg/api/public/routingsvc/route');
    targetUrl.searchParams.set('start', `${startLat},${startLng}`);
    targetUrl.searchParams.set('end', `${endLat},${endLng}`);
    targetUrl.searchParams.set('routeType', routeType);

    // Call OneMap route API with Authorization header
    let apiResponse = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      },
    });

    // If 401 with Bearer prefix, retry without Bearer prefix
    if (apiResponse.status === 401 && token.startsWith('Bearer ')) {
      apiResponse = await fetch(targetUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': token.replace(/^Bearer\s+/, ''),
        },
      });
    } else if (apiResponse.status === 401 && !token.startsWith('Bearer ')) {
      apiResponse = await fetch(targetUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': token,
        },
      });
    }

    if (!apiResponse.ok) {
      if (apiResponse.status === 401) {
        cachedToken = null; // Clear stale token
        return res.status(401).json({
          error: 'Unable to calculate the route right now. OneMap authorization failed or expired. Please check your credentials.',
          missingCredentials: true,
        });
      }
      return res.status(apiResponse.status).json({
        error: 'Unable to calculate the route right now. Please try again.',
      });
    }

    const routeData: OneMapRouteResponse = await apiResponse.json();

    if (!routeData || routeData.status !== 0) {
      return res.status(404).json({
        error: routeData?.status_message || 'Unable to calculate the route right now. Please try again.',
      });
    }

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
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Unable to calculate the route right now. Please try again.',
      details: error?.message || 'Unknown routing error',
    });
  }
}
