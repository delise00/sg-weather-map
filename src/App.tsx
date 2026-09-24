import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { SearchBar } from './components/SearchBar.tsx';
import { MapView } from './components/MapView.tsx';
import { DirectionsPanel } from './components/DirectionsPanel.tsx';
import { WeatherCard } from './components/WeatherCard.tsx';
import { DemoActionsBar } from './components/DemoActionsBar.tsx';
import { ApiHealthModal } from './components/ApiHealthModal.tsx';
import { LocationItem, RouteResult, TravelMode, WeatherInfo } from './types/index.ts';
import { searchLocations, getDirections, getWeather, checkApiHealth, reverseGeocodeLocation } from './services/api.ts';

// Raffles Place default initial coordinates
const RAFFLES_PLACE: LocationItem = {
  searchVal: 'RAFFLES PLACE',
  building: 'ONE RAFFLES PLACE',
  road: 'RAFFLES PLACE',
  address: '1 RAFFLES PLACE ONE RAFFLES PLACE SINGAPORE 048616',
  postal: '048616',
  lat: 1.2843495,
  lng: 103.8510725,
};

// Marina Bay Sands preset coordinates for the primary demo flow
const MARINA_BAY_SANDS: LocationItem = {
  searchVal: 'MARINA BAY SANDS',
  building: 'MARINA BAY SANDS',
  road: 'BAYFRONT AVENUE',
  address: '10 BAYFRONT AVENUE MARINA BAY SANDS SINGAPORE 018956',
  postal: '018956',
  lat: 1.2834,
  lng: 103.8607,
};

export default function App() {
  // Application State
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(RAFFLES_PLACE);
  const [searchResults, setSearchResults] = useState<LocationItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Directions State
  const [startLocation, setStartLocation] = useState<LocationItem | null>(RAFFLES_PLACE);
  const [destinationLocation, setDestinationLocation] = useState<LocationItem | null>(null);
  const [travelMode, setTravelMode] = useState<TravelMode>('walk');
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);

  // Weather State (2-Hour real-time forecast from data.gov.sg)
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // Health modal & status
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isApiHealthy, setIsApiHealthy] = useState(true);

  // Fetch weather for a given point
  const fetchWeatherData = useCallback(async (lat: number, lng: number) => {
    setIsWeatherLoading(true);
    setWeatherError(null);
    try {
      const data = await getWeather(lat, lng);
      setWeather(data);
    } catch (err: any) {
      setWeatherError('Live 2-hour weather information is temporarily unavailable.');
    } finally {
      setIsWeatherLoading(false);
    }
  }, []);

  // Initial mount: load Raffles Place weather & check API health
  useEffect(() => {
    fetchWeatherData(RAFFLES_PLACE.lat, RAFFLES_PLACE.lng);

    checkApiHealth()
      .then((health) => {
        setIsApiHealthy(health.status === 'healthy');
      })
      .catch(() => {
        setIsApiHealthy(false);
      });
  }, [fetchWeatherData]);

  // Handle Search Execution
  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setSearchError(null);
    try {
      const results = await searchLocations(query);
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError('Location could not be found. Please try another search.');
      }
    } catch (err: any) {
      setSearchError('Location could not be found. Please try another search.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle Selecting a Search Result
  const handleSelectResult = (location: LocationItem) => {
    setSelectedLocation(location);
    fetchWeatherData(location.lat, location.lng);
  };

  // Set selected location as start point
  const handleSetAsStart = (location: LocationItem) => {
    setStartLocation(location);
  };

  // Set selected location as destination
  const handleSetAsDestination = (location: LocationItem) => {
    setDestinationLocation(location);
  };

  // Handle Map Click
  const handleSelectMapLocation = async (lat: number, lng: number) => {
    const clickedItem: LocationItem = {
      searchVal: `Pinned Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      address: `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      lat,
      lng,
    };
    setSelectedLocation(clickedItem);
    fetchWeatherData(lat, lng);

    try {
      const resolved = await reverseGeocodeLocation(lat, lng);
      setSelectedLocation(resolved);
    } catch {
      // Keep basic coordinates
    }
  };

  // Handle Swap Start and Destination
  const handleSwapLocations = () => {
    const prevStart = startLocation;
    const prevDest = destinationLocation;
    setStartLocation(prevDest);
    setDestinationLocation(prevStart);
    if (routeResult && prevDest && prevStart) {
      // Automatically recalculate swapped route
      fetchRoute(prevDest, prevStart, travelMode);
    }
  };

  // Calculate Directions
  const fetchRoute = async (
    start: LocationItem,
    dest: LocationItem,
    mode: TravelMode
  ) => {
    setIsRouting(true);
    setRoutingError(null);
    try {
      const res = await getDirections(start, dest, mode);
      setRouteResult(res);
    } catch (err: any) {
      setRoutingError(err.message || 'Unable to calculate the route right now. Please try again.');
      setRouteResult(null);
    } finally {
      setIsRouting(false);
    }
  };

  const handleGetDirections = async () => {
    if (!startLocation || !destinationLocation) return;
    await fetchRoute(startLocation, destinationLocation, travelMode);
  };

  const handleModeChange = (mode: TravelMode) => {
    setTravelMode(mode);
    // If route is already calculated, recalculate for new mode
    if (startLocation && destinationLocation && routeResult) {
      fetchRoute(startLocation, destinationLocation, mode);
    }
  };

  const handleClearRoute = () => {
    setRouteResult(null);
    setRoutingError(null);
  };

  const handleClearSearch = () => {
    setSearchResults([]);
    setSearchError(null);
  };

  // DEMO ACTIONS (as requested in Step 11 & Step 12)
  // Demo 1: Search Raffles Place
  const runDemo1 = async () => {
    await handleSearch('Raffles Place');
    setSelectedLocation(RAFFLES_PLACE);
    fetchWeatherData(RAFFLES_PLACE.lat, RAFFLES_PLACE.lng);
  };

  // Demo 2: Primary demo flow: Walk from Raffles Place to Marina Bay Sands
  const runDemo2 = async () => {
    setStartLocation(RAFFLES_PLACE);
    setDestinationLocation(MARINA_BAY_SANDS);
    setSelectedLocation(RAFFLES_PLACE);
    setTravelMode('walk');
    fetchWeatherData(RAFFLES_PLACE.lat, RAFFLES_PLACE.lng);
    await fetchRoute(RAFFLES_PLACE, MARINA_BAY_SANDS, 'walk');
  };

  // Demo 3: Cycle from Orchard Road to Gardens by the Bay
  const runDemo3 = async () => {
    const orchard: LocationItem = {
      searchVal: 'ION ORCHARD',
      building: 'ION ORCHARD',
      road: 'ORCHARD TURN',
      address: '2 ORCHARD TURN ION ORCHARD SINGAPORE 238801',
      postal: '238801',
      lat: 1.3040,
      lng: 103.8318,
    };
    const gardens: LocationItem = {
      searchVal: 'GARDENS BY THE BAY',
      building: 'GARDENS BY THE BAY',
      road: 'MARINA GARDENS DRIVE',
      address: '18 MARINA GARDENS DRIVE SINGAPORE 018953',
      postal: '018953',
      lat: 1.2816,
      lng: 103.8636,
    };
    setStartLocation(orchard);
    setDestinationLocation(gardens);
    setSelectedLocation(orchard);
    setTravelMode('cycle');
    fetchWeatherData(orchard.lat, orchard.lng);
    await fetchRoute(orchard, gardens, 'cycle');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased selection:bg-rose-500 selection:text-white">
      {/* Top Header */}
      <Header
        onOpenHealthModal={() => setIsHealthModalOpen(true)}
        isApiHealthy={isApiHealthy}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-4">
        {/* Quick Demo Evaluation Flows */}
        <DemoActionsBar
          onRunDemo1={runDemo1}
          onRunDemo2={runDemo2}
          onRunDemo3={runDemo3}
        />

        {/* Location Search Bar */}
        <SearchBar
          onSearch={handleSearch}
          searchResults={searchResults}
          isLoading={isSearching}
          searchError={searchError}
          onSelectResult={handleSelectResult}
          onSetAsStart={handleSetAsStart}
          onSetAsDestination={handleSetAsDestination}
          onClearSearch={handleClearSearch}
        />

        {/* Interactive Map (Dominant Element) */}
        <section className="w-full">
          <MapView
            selectedLocation={selectedLocation}
            startLocation={startLocation}
            destinationLocation={destinationLocation}
            routeResult={routeResult}
            onSelectMapLocation={handleSelectMapLocation}
            onSetAsStart={handleSetAsStart}
            onSetAsDestination={handleSetAsDestination}
          />
        </section>

        {/* Bottom Section: Directions & Weather Cards */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          {/* Directions Panel */}
          <DirectionsPanel
            startLocation={startLocation}
            destinationLocation={destinationLocation}
            travelMode={travelMode}
            routeResult={routeResult}
            isLoading={isRouting}
            routingError={routingError}
            onSetTravelMode={handleModeChange}
            onSwapLocations={handleSwapLocations}
            onGetDirections={handleGetDirections}
            onClearRoute={handleClearRoute}
            onOpenHealthModal={() => setIsHealthModalOpen(true)}
          />

          {/* 2-Hour Weather Card */}
          <WeatherCard
            weather={weather}
            isLoading={isWeatherLoading}
            weatherError={weatherError}
            onRefreshWeather={() =>
              fetchWeatherData(
                selectedLocation?.lat ?? RAFFLES_PLACE.lat,
                selectedLocation?.lng ?? RAFFLES_PLACE.lng
              )
            }
            selectedLocationName={selectedLocation?.building || selectedLocation?.searchVal}
          />
        </section>
      </main>

      {/* API Health & Architecture Modal */}
      <ApiHealthModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
      />
    </div>
  );
}
