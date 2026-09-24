export interface OneMapSearchResultItem {
  SEARCHVAL: string;
  BLK_NO?: string;
  ROAD_NAME?: string;
  BUILDING?: string;
  ADDRESS?: string;
  POSTAL?: string;
  X?: string;
  Y?: string;
  LATITUDE: string;
  LONGITUDE: string;
}

export interface OneMapSearchResponse {
  found: number;
  totalNumPages: number;
  pageNum: number;
  results: OneMapSearchResultItem[];
}

export interface RouteSummary {
  start_point: string;
  end_point: string;
  total_time: number; // in seconds
  total_distance: number; // in meters
}

export interface OneMapRouteResponse {
  status: number;
  status_message: string;
  route_geometry?: string; // encoded polyline string
  route_instructions?: (string | number)[][];
  route_name?: string[];
  route_summary?: RouteSummary;
  error?: string;
}

export interface WeatherAreaMetadata {
  name: string;
  label_location: {
    latitude: number;
    longitude: number;
  };
}

export interface WeatherForecastItem {
  area: string;
  forecast: string;
}

export interface DataGovSgWeatherResponse {
  code: number;
  errorMsg?: string;
  data: {
    area_metadata: WeatherAreaMetadata[];
    items: Array<{
      update_timestamp: string;
      timestamp: string;
      valid_period: {
        start: string;
        end: string;
        text: string;
      };
      forecasts: WeatherForecastItem[];
    }>;
  };
}

export interface ParsedWeatherResult {
  area: string;
  forecast: string;
  validPeriod: string;
  validStart: string;
  validEnd: string;
  updateTimestamp: string;
  distanceKm: number;
  allForecasts?: WeatherForecastItem[];
}
