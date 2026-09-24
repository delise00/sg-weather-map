import { Request, Response } from 'express';
import { DataGovSgWeatherResponse, ParsedWeatherResult, WeatherAreaMetadata, WeatherForecastItem } from './types.ts';

// Haversine distance in kilometers
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
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

/**
 * Endpoint: /api/weather
 * Retrieves the live 2-hour weather forecast from data.gov.sg.
 * Resolves the relevant Singapore forecast area based on requested latitude/longitude.
 */
export async function handleWeather(req: Request, res: Response) {
  try {
    const latParam = req.query.lat as string;
    const lngParam = req.query.lng as string;

    // Default to Singapore city center / Raffles Place if not specified
    const targetLat = latParam ? parseFloat(latParam) : 1.2843;
    const targetLng = lngParam ? parseFloat(lngParam) : 103.8510;

    const weatherUrl = 'https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast';

    const apiResponse = await fetch(weatherUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Singapore-Travel-Assistant/1.0',
      },
    });

    if (!apiResponse.ok) {
      return res.status(503).json({
        error: 'Live 2-hour weather information is temporarily unavailable.',
      });
    }

    const json: DataGovSgWeatherResponse = await apiResponse.json();

    if (!json.data || !json.data.area_metadata || !json.data.items || json.data.items.length === 0) {
      return res.status(503).json({
        error: 'Live 2-hour weather information is temporarily unavailable.',
      });
    }

    const areaMetadata: WeatherAreaMetadata[] = json.data.area_metadata;
    const latestItem = json.data.items[0];
    const forecasts: WeatherForecastItem[] = latestItem.forecasts || [];

    if (areaMetadata.length === 0 || forecasts.length === 0) {
      return res.status(503).json({
        error: 'Live 2-hour weather information is temporarily unavailable.',
      });
    }

    // Find the nearest area to targetLat, targetLng
    let nearestArea: WeatherAreaMetadata = areaMetadata[0];
    let minDistance = Infinity;

    for (const area of areaMetadata) {
      const dist = calculateDistanceKm(
        targetLat,
        targetLng,
        area.label_location.latitude,
        area.label_location.longitude
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestArea = area;
      }
    }

    // Lookup forecast for this area
    const matchingForecast = forecasts.find(
      (f) => f.area.toLowerCase() === nearestArea.name.toLowerCase()
    );

    const forecastText = matchingForecast ? matchingForecast.forecast : 'Forecast Unavailable';

    const validPeriodText =
      latestItem.valid_period?.text ||
      `${latestItem.valid_period?.start || ''} to ${latestItem.valid_period?.end || ''}`;

    const parsedResult: ParsedWeatherResult = {
      area: nearestArea.name,
      forecast: forecastText,
      validPeriod: validPeriodText,
      validStart: latestItem.valid_period?.start || '',
      validEnd: latestItem.valid_period?.end || '',
      updateTimestamp: latestItem.update_timestamp || latestItem.timestamp || '',
      distanceKm: Math.round(minDistance * 10) / 10,
      allForecasts: forecasts,
    };

    return res.json({
      status: 'success',
      data: parsedResult,
      areaCount: areaMetadata.length,
    });
  } catch (error: any) {
    return res.status(503).json({
      error: 'Live 2-hour weather information is temporarily unavailable.',
      details: error?.message || 'Unknown weather service error',
    });
  }
}
