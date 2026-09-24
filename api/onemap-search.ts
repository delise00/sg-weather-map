import { Request, Response } from 'express';
import { OneMapSearchResponse } from './types.ts';
import { getOneMapToken } from './onemap-route.ts';

/**
 * Endpoint: /api/onemap-search
 * Queries OneMap elastic search service for Singapore locations.
 * Attaches Authorization header if token is available, and falls back to Nominatim Singapore search if needed.
 */
export async function handleOneMapSearch(req: Request, res: Response) {
  try {
    const searchVal = (req.query.searchVal || req.query.query || req.query.q) as string;

    if (!searchVal || !searchVal.trim()) {
      return res.status(400).json({
        error: 'Location search query is required.',
        results: [],
        found: 0,
      });
    }

    const trimmedQuery = searchVal.trim();
    const token = await getOneMapToken();

    const targetUrl = new URL('https://www.onemap.gov.sg/api/common/elastic/search');
    targetUrl.searchParams.set('searchVal', trimmedQuery);
    targetUrl.searchParams.set('returnGeom', 'Y');
    targetUrl.searchParams.set('getAddrDetails', 'Y');
    targetUrl.searchParams.set('pageNum', '1');

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'Singapore-Travel-Assistant/1.0',
    };

    if (token) {
      headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }

    try {
      const apiResponse = await fetch(targetUrl.toString(), {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(5000),
      });

      if (apiResponse.ok) {
        const data: OneMapSearchResponse = await apiResponse.json();

        if (data.results && data.results.length > 0) {
          const validResults = data.results.filter((item) => {
            const lat = parseFloat(item.LATITUDE);
            const lng = parseFloat(item.LONGITUDE);
            return !isNaN(lat) && !isNaN(lng) && lat >= 1.15 && lat <= 1.5 && lng >= 103.55 && lng <= 104.15;
          });

          if (validResults.length > 0) {
            return res.json({
              found: validResults.length,
              totalNumPages: data.totalNumPages || 1,
              pageNum: data.pageNum || 1,
              results: validResults,
              source: 'onemap',
            });
          }
        }
      }
    } catch {
      // Fall through to fallback
    }

    // Nominatim Singapore search fallback
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        trimmedQuery
      )}&format=json&addressdetails=1&countrycodes=sg&limit=10`;
      const nomRes = await fetch(nomUrl, {
        headers: { 'User-Agent': 'Singapore-Travel-Assistant/1.0' },
        signal: AbortSignal.timeout(5000),
      });

      if (nomRes.ok) {
        const nomList = await nomRes.json();
        if (Array.isArray(nomList) && nomList.length > 0) {
          const mapped = nomList.map((item: any) => {
            const name = item.name || item.display_name?.split(',')[0] || trimmedQuery;
            const road = item.address?.road || item.address?.pedestrian || '';
            const postcode = item.address?.postcode || '';
            return {
              SEARCHVAL: name.toUpperCase(),
              BUILDING: name.toUpperCase(),
              ROAD_NAME: road ? road.toUpperCase() : 'NIL',
              ADDRESS: item.display_name,
              POSTAL: postcode || 'NIL',
              LATITUDE: item.lat,
              LONGITUDE: item.lon,
            };
          });

          return res.json({
            found: mapped.length,
            totalNumPages: 1,
            pageNum: 1,
            results: mapped,
            source: 'nominatim-fallback',
          });
        }
      }
    } catch {
      // Nominatim failed
    }

    return res.json({
      found: 0,
      totalNumPages: 0,
      pageNum: 1,
      results: [],
      message: 'Location could not be found. Please try another search.',
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Location could not be found. Please try another search.',
      details: error?.message || 'Unknown search error',
      results: [],
      found: 0,
    });
  }
}
