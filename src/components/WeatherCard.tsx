import React, { useState } from 'react';
import {
  Cloud,
  CloudSun,
  CloudRain,
  CloudLightning,
  Sun,
  Moon,
  Clock,
  RefreshCw,
  MapPin,
  AlertCircle,
  Eye,
  X,
  Wind,
} from 'lucide-react';
import { WeatherInfo, WeatherForecastItem } from '../types/index.ts';
import { formatTimestamp } from '../utils/formatting.ts';

interface WeatherCardProps {
  weather: WeatherInfo | null;
  isLoading: boolean;
  weatherError: string | null;
  onRefreshWeather: () => Promise<void>;
  selectedLocationName?: string;
  onSelectArea?: (areaName: string) => void;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({
  weather,
  isLoading,
  weatherError,
  onRefreshWeather,
  selectedLocationName,
  onSelectArea,
}) => {
  const [showAllAreas, setShowAllAreas] = useState(false);

  // Helper to map weather forecast descriptions to icons and badge styling
  const getWeatherVisuals = (forecastText: string = '') => {
    const text = forecastText.toLowerCase();

    if (text.includes('thunder') || text.includes('lightning')) {
      return {
        icon: <CloudLightning className="w-8 h-8 text-amber-500 animate-bounce" />,
        bg: 'from-amber-500/10 to-purple-500/10 border-amber-300',
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
      };
    }
    if (text.includes('rain') || text.includes('shower')) {
      return {
        icon: <CloudRain className="w-8 h-8 text-blue-500" />,
        bg: 'from-blue-500/10 to-cyan-500/10 border-blue-300',
        badgeBg: 'bg-blue-100 text-blue-800 border-blue-300',
      };
    }
    if (text.includes('cloud') && text.includes('night')) {
      return {
        icon: <Cloud className="w-8 h-8 text-indigo-400" />,
        bg: 'from-indigo-500/10 to-slate-500/10 border-indigo-200',
        badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      };
    }
    if (text.includes('cloud')) {
      return {
        icon: <CloudSun className="w-8 h-8 text-sky-500" />,
        bg: 'from-sky-500/10 to-slate-500/10 border-sky-200',
        badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
      };
    }
    if (text.includes('night') || text.includes('fair (night)')) {
      return {
        icon: <Moon className="w-8 h-8 text-indigo-500" />,
        bg: 'from-indigo-500/10 to-purple-500/10 border-indigo-200',
        badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      };
    }
    if (text.includes('fair') || text.includes('sunny')) {
      return {
        icon: <Sun className="w-8 h-8 text-amber-500" />,
        bg: 'from-amber-500/10 to-orange-500/10 border-amber-200',
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
      };
    }
    return {
      icon: <Wind className="w-8 h-8 text-slate-500" />,
      bg: 'from-slate-500/10 to-slate-600/10 border-slate-200',
      badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
    };
  };

  const visuals = weather ? getWeatherVisuals(weather.forecast) : getWeatherVisuals();

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-5 flex flex-col justify-between h-full relative">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <CloudSun className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-bold text-base text-slate-900">Weather</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                  2-Hour Forecast
                </span>
              </div>
              <p className="text-xs text-slate-500">Live data from data.gov.sg</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefreshWeather}
            disabled={isLoading}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
            title="Refresh 2-Hour Weather"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-600' : ''}`} />
          </button>
        </div>

        {/* Error Notice */}
        {weatherError && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{weatherError}</span>
          </div>
        )}

        {/* Active 2-Hour Forecast Card */}
        {weather && !weatherError && (
          <div className="mt-4 space-y-3">
            {/* Forecast Highlight Card */}
            <div
              className={`p-4 rounded-xl border bg-gradient-to-br ${visuals.bg} flex items-center justify-between`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>
                    Forecast Area: <strong className="text-slate-900">{weather.area}</strong>
                  </span>
                  {weather.distanceKm > 0 && (
                    <span className="text-[11px] text-slate-400">
                      (~{weather.distanceKm} km away)
                    </span>
                  )}
                </div>

                <div className="text-lg sm:text-xl font-extrabold text-slate-900">
                  {weather.forecast}
                </div>

                {selectedLocationName && (
                  <div className="text-[11px] text-slate-500">
                    For: <span className="font-semibold text-slate-700">{selectedLocationName}</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-white/80 backdrop-blur-xs rounded-2xl shadow-xs border border-white/60">
                {visuals.icon}
              </div>
            </div>

            {/* Key 2-Hour Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Forecast Period</span>
                </div>
                <div className="font-semibold text-slate-900">
                  {weather.validPeriod || 'Next 2 Hours'}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Last Updated</span>
                </div>
                <div className="font-semibold text-slate-900">
                  {formatTimestamp(weather.updateTimestamp)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info & Singapore Areas Explorer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="text-[11px]">Real-time 2-hr nowcast only</span>

        {weather?.allForecasts && weather.allForecasts.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAllAreas(true)}
            className="inline-flex items-center gap-1 font-medium text-amber-700 hover:text-amber-800 hover:underline cursor-pointer text-xs"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>All SG Areas ({weather.allForecasts.length})</span>
          </button>
        )}
      </div>

      {/* Modal / Drawer for All Singapore Areas 2-Hour Forecasts */}
      {showAllAreas && weather?.allForecasts && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Singapore 2-Hour Forecast by Area</h3>
                <p className="text-xs text-slate-300">Period: {weather.validPeriod}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAllAreas(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto divide-y divide-slate-100 flex-1 space-y-1">
              {weather.allForecasts.map((item: WeatherForecastItem) => {
                const isSelected = item.area.toLowerCase() === weather.area.toLowerCase();
                return (
                  <div
                    key={item.area}
                    className={`py-2 px-3 rounded-lg flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-amber-50 border border-amber-200 font-semibold'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin
                        className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-600' : 'text-slate-400'}`}
                      />
                      <span className="text-xs text-slate-800">{item.area}</span>
                      {isSelected && (
                        <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                          Nearest Area
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-600">{item.forecast}</span>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
              <button
                type="button"
                onClick={() => setShowAllAreas(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-lg transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
