import { Router, Request, Response } from 'express';
import { handleOneMapSearch } from './onemap-search.ts';
import { handleOneMapRoute, setInMemoryToken } from './onemap-route.ts';
import { handleWeather } from './weather.ts';
import { handleHealthCheck } from './health.ts';

const apiRouter = Router();

// Location Search
apiRouter.get('/onemap-search', handleOneMapSearch);

// Directions / Routing
apiRouter.get('/onemap-route', handleOneMapRoute);

// 2-Hour Weather Forecast
apiRouter.get('/weather', handleWeather);

// Health check endpoint for verifying external services & configurations
apiRouter.get('/health', handleHealthCheck);

// Optional endpoint to dynamically set token for testing
apiRouter.post('/set-credentials', (req: Request, res: Response) => {
  const { token } = req.body || {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token string is required' });
  }
  setInMemoryToken(token);
  return res.json({ success: true, message: 'OneMap token stored in memory' });
});

export default apiRouter;
