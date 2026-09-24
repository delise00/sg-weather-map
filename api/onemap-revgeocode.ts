import { Request, Response } from 'express';
import { getOneMapToken } from './onemap-route.ts';

/**
 * Endpoint: /api/onemap-revgeocode
 * Reverse geocode latitude & longitude to address/building using OneMap or Nominatim fallback.
 */
export async function handleOneMapRevGeocode(req: Request, res: Response) {
  try {
    const latStr = req.query.lat as string;
    const lngStr = req.query.lng as string;
    const locationParam = req.query.location as string;

    let lat = 0;
    let lng = 0;

    if (locationParam && locationParam.includes(',')) {
      const parts = locationParam.split(',').map(Number);
      lat = parts[0];
      lng = parts[1];
    } else if (latStr && lngStr) {
      lat = parseFloat(latStr);
      lng = parseFloat(lngStr);
    }

    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      return res.status(400).json({ error: 'Valid lat and lng are required.' });
    }

    const token = await getOneMapToken();

    // 1. Try OneMap if token available
    if (token) {
      try {
        const url = `https://www.onemap.gov.sg/api/public/revgeocode?location=${lat},${lng}&buffer=40&addressType=All`;
        const omRes = await fetch(url, {
          headers: {
            Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(4000),
        });

        if (omRes.ok) {
          const data = await omRes.json();
          const info = data?.GeocodeInfo?.[0];
          if (info) {
            const building = info.BUILDINGNAME && info.BUILDINGNAME !== 'null' ? info.BUILDINGNAME : '';
            const road = info.ROAD && info.ROAD !== 'null' ? info.ROAD : '';
            const postal = info.POSTALCODE && info.POSTALCODE !== 'null' ? info.POSTALCODE : '';
            const block = info.BLOCK && info.BLOCK !== 'null' ? info.BLOCK : '';

            const addrParts = [block, road, building, postal ? `SINGAPORE ${postal}` : '']
              .filter(Boolean)
              .join(' ');

            return res.json({
              searchVal: building || road || 'Selected Location',
              building: building || undefined,
              road: road || undefined,
              address: addrParts || `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
              postal: postal || undefined,
              lat,
              lng,
              source: 'onemap',
            });
          }
        }
      } catch {
        // Fall through to Nominatim
      }
    }

    // 2. Fallback to Nominatim Reverse Geocoding
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
      const nomRes = await fetch(nomUrl, {
        headers: { 'User-Agent': 'Singapore-Travel-Assistant/1.0' },
        signal: AbortSignal.timeout(4000),
      });

      if (nomRes.ok) {
        const nomData = await nomRes.json();
        const addr = nomData.address || {};
        const building = nomData.name || addr.amenity || addr.building || addr.tourism || '';
        const road = addr.road || addr.pedestrian || '';
        const postal = addr.postcode || '';

        return res.json({
          searchVal: building || road || 'Selected Location',
          building: building || undefined,
          road: road || undefined,
          address: nomData.display_name || `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          postal: postal || undefined,
          lat,
          lng,
          source: 'nominatim',
        });
      }
    } catch {
      // Return basic coordinates
    }

    return res.json({
      searchVal: `Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      address: `Singapore Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      lat,
      lng,
      source: 'coords',
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Unable to reverse geocode location',
      details: err?.message,
    });
  }
}
