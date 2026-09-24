import { Request, Response } from 'express';
import { hasOneMapCredentials } from './onemap-route.ts';

/**
 * Endpoint: /api/health
 * Checks operational status of external OneMap and data.gov.sg endpoints.
 */
export async function handleHealthCheck(_req: Request, res: Response) {
  const startTime = Date.now();
  const checks: {
    onemapSearch: { status: string; latencyMs?: number; message?: string };
    weatherGovSg: { status: string; latencyMs?: number; message?: string; forecastPeriod?: string };
    onemapRoute: { status: string; hasCredentials: boolean; message?: string };
  } = {
    onemapSearch: { status: 'checking' },
    weatherGovSg: { status: 'checking' },
    onemapRoute: { status: 'checking', hasCredentials: hasOneMapCredentials() },
  };

  // 1. Check OneMap search
  try {
    const sStart = Date.now();
    const searchRes = await fetch(
      'https://www.onemap.gov.sg/api/common/elastic/search?searchVal=singapore&returnGeom=Y&getAddrDetails=Y&pageNum=1',
      { method: 'GET', headers: { 'User-Agent': 'Singapore-Travel-Assistant/1.0' }, signal: AbortSignal.timeout(5000) }
    );
    const sLatency = Date.now() - sStart;
    if (searchRes.ok) {
      checks.onemapSearch = { status: 'operational', latencyMs: sLatency, message: 'OneMap Search API operational' };
    } else {
      checks.onemapSearch = { status: 'degraded', latencyMs: sLatency, message: `HTTP status ${searchRes.status}` };
    }
  } catch (err: any) {
    checks.onemapSearch = { status: 'unreachable', message: err?.message || 'Network error' };
  }

  // 2. Check data.gov.sg 2-hour forecast
  try {
    const wStart = Date.now();
    const weatherRes = await fetch('https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast', {
      method: 'GET',
      headers: { 'User-Agent': 'Singapore-Travel-Assistant/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    const wLatency = Date.now() - wStart;
    if (weatherRes.ok) {
      const wData = await weatherRes.json();
      const period = wData?.data?.items?.[0]?.valid_period?.text || 'Available';
      checks.weatherGovSg = {
        status: 'operational',
        latencyMs: wLatency,
        message: 'data.gov.sg 2-hour forecast API operational',
        forecastPeriod: period,
      };
    } else {
      checks.weatherGovSg = { status: 'degraded', latencyMs: wLatency, message: `HTTP status ${weatherRes.status}` };
    }
  } catch (err: any) {
    checks.weatherGovSg = { status: 'unreachable', message: err?.message || 'Network error' };
  }

  // 3. Routing status (always operational with OneMap + high-fidelity OSRM fallback)
  const credentialsReady = hasOneMapCredentials();
  checks.onemapRoute = {
    status: 'operational',
    hasCredentials: credentialsReady,
    message: credentialsReady
      ? 'OneMap official credentials active'
      : 'Active (OneMap token or automatic OpenStreetMap fallback)',
  };

  const totalDuration = Date.now() - startTime;
  const isHealthy = checks.onemapSearch.status === 'operational' && checks.weatherGovSg.status === 'operational';

  return res.json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    totalDurationMs: totalDuration,
    services: checks,
    project: 'Singapore Travel & Navigation Assistant (SMU Course Project)',
    disclaimer: 'Not affiliated with or endorsed by OneMap, SLA, data.gov.sg, or the Singapore Government.',
  });
}
