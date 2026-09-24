export type TravelMode = 'walk' | 'drive' | 'cycle' | 'pt';

export interface LocationItem {
  searchVal: string;
  building?: string;
  road?: string;
  address: string;
  postal?: string;
  lat: number;
  lng: number;
}

export interface RouteInstruction {
  action: string;
  instruction: string;
  distance: string;
  timeSeconds: number;
  latLng?: [number, number];
}

export interface RouteResult {
  status: number;
  statusMessage: string;
  coordinates: [number, number][];
  totalDistanceMeters: number;
  totalTimeSeconds: number;
  routeType: TravelMode;
  instructions: RouteInstruction[];
  routeName?: string[];
}

export interface WeatherForecastItem {
  area: string;
  forecast: string;
}

export interface WeatherInfo {
  area: string;
  forecast: string;
  validPeriod: string;
  validStart: string;
  validEnd: string;
  updateTimestamp: string;
  distanceKm: number;
  allForecasts?: WeatherForecastItem[];
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded';
  timestamp: string;
  totalDurationMs: number;
  services: {
    onemapSearch: { status: string; latencyMs?: number; message?: string };
    weatherGovSg: { status: string; latencyMs?: number; message?: string; forecastPeriod?: string };
    onemapRoute: { status: string; hasCredentials: boolean; message?: string };
  };
  project: string;
  disclaimer: string;
}
