import { Request, Response } from 'express';
import { OneMapSearchResponse } from './types.ts';

/**
 * Endpoint: /api/onemap-search
 * Queries OneMap elastic search service for Singapore locations.
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
    const targetUrl = new URL('https://www.onemap.gov.sg/api/common/elastic/search');
    targetUrl.searchParams.set('searchVal', trimmedQuery);
    targetUrl.searchParams.set('returnGeom', 'Y');
    targetUrl.searchParams.set('getAddrDetails', 'Y');
    targetUrl.searchParams.set('pageNum', '1');

    const apiResponse = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Singapore-Travel-Assistant/1.0',
      },
    });

    if (!apiResponse.ok) {
      return res.status(apiResponse.status).json({
        error: 'Location could not be found. Please try another search.',
        results: [],
        found: 0,
      });
    }

    const data: OneMapSearchResponse = await apiResponse.json();

    if (!data.results || data.results.length === 0) {
      return res.json({
        found: 0,
        totalNumPages: 0,
        pageNum: 1,
        results: [],
        message: 'Location could not be found. Please try another search.',
      });
    }

    // Filter and sanitize results ensuring valid latitude and longitude
    const validResults = data.results.filter(item => {
      const lat = parseFloat(item.LATITUDE);
      const lng = parseFloat(item.LONGITUDE);
      return !isNaN(lat) && !isNaN(lng) && lat >= 1.15 && lat <= 1.50 && lng >= 103.55 && lng <= 104.15;
    });

    return res.json({
      found: validResults.length,
      totalNumPages: data.totalNumPages || 1,
      pageNum: data.pageNum || 1,
      results: validResults,
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
