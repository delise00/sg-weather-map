import React, { useState } from 'react';
import {
  Navigation,
  ArrowUpDown,
  Footprints,
  Car,
  Bike,
  Bus,
  Clock,
  Milestone,
  RotateCcw,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Key,
} from 'lucide-react';
import { LocationItem, RouteResult, TravelMode } from '../types/index.ts';
import { formatDistance, formatDuration } from '../utils/formatting.ts';

interface DirectionsPanelProps {
  startLocation: LocationItem | null;
  destinationLocation: LocationItem | null;
  travelMode: TravelMode;
  routeResult: RouteResult | null;
  isLoading: boolean;
  routingError: string | null;
  onSetTravelMode: (mode: TravelMode) => void;
  onSwapLocations: () => void;
  onGetDirections: () => Promise<void>;
  onClearRoute: () => void;
  onOpenHealthModal: () => void;
}

const TRAVEL_MODES: Array<{ id: TravelMode; label: string; icon: React.ReactNode }> = [
  { id: 'walk', label: 'Walk', icon: <Footprints className="w-4 h-4" /> },
  { id: 'drive', label: 'Drive', icon: <Car className="w-4 h-4" /> },
  { id: 'cycle', label: 'Cycle', icon: <Bike className="w-4 h-4" /> },
  { id: 'pt', label: 'Public Transport', icon: <Bus className="w-4 h-4" /> },
];

export const DirectionsPanel: React.FC<DirectionsPanelProps> = ({
  startLocation,
  destinationLocation,
  travelMode,
  routeResult,
  isLoading,
  routingError,
  onSetTravelMode,
  onSwapLocations,
  onGetDirections,
  onClearRoute,
  onOpenHealthModal,
}) => {
  const [showInstructions, setShowInstructions] = useState(false);

  const canRequestDirections = Boolean(startLocation && destinationLocation);

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-5 flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-900">Directions</h2>
            <p className="text-xs text-slate-500">OneMap Singapore Routing</p>
          </div>
        </div>

        {routeResult && (
          <button
            type="button"
            onClick={onClearRoute}
            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Inputs Section */}
      <div className="mt-4 space-y-3">
        {/* From Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            From (Start Location)
          </label>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
              A
            </div>
            <div className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 truncate">
              {startLocation ? (
                <span className="font-medium text-slate-900">
                  {startLocation.building || startLocation.searchVal}
                  <span className="text-xs text-slate-500 block truncate">
                    {startLocation.address}
                  </span>
                </span>
              ) : (
                <span className="text-slate-400 italic">
                  Search &amp; click &quot;Set as Start&quot;
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center -my-1">
          <button
            type="button"
            onClick={onSwapLocations}
            disabled={!startLocation && !destinationLocation}
            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-600 border border-slate-200 shadow-2xs transition cursor-pointer"
            title="Swap Start and Destination"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>

        {/* To Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            To (Destination)
          </label>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
              B
            </div>
            <div className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 truncate">
              {destinationLocation ? (
                <span className="font-medium text-slate-900">
                  {destinationLocation.building || destinationLocation.searchVal}
                  <span className="text-xs text-slate-500 block truncate">
                    {destinationLocation.address}
                  </span>
                </span>
              ) : (
                <span className="text-slate-400 italic">
                  Search &amp; click &quot;Set as Destination&quot;
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mode Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Travel Mode
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {TRAVEL_MODES.map((mode) => {
              const isSelected = travelMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onSetTravelMode(mode.id)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {mode.icon}
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions buttons */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onGetDirections}
            disabled={!canRequestDirections || isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Calculating Route...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4" />
                <span>Get Directions</span>
              </>
            )}
          </button>
          {!canRequestDirections && (
            <p className="text-[11px] text-center text-slate-500 mt-1.5">
              {!startLocation && !destinationLocation
                ? 'Select or search a location and set Point A and Point B to navigate'
                : !destinationLocation
                ? 'Please set a Destination (Point B) by clicking on the map or searching above'
                : 'Please set a Start location (Point A)'}
            </p>
          )}
        </div>
      </div>

      {/* Routing Error Notice */}
      {routingError && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1.5">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Routing Notice: </span>
              {routingError}
            </div>
          </div>
          {routingError.includes('token') && (
            <div className="pt-1 border-t border-rose-200/60 flex items-center justify-between">
              <span className="text-[11px] text-rose-600">Configure credentials in server</span>
              <button
                type="button"
                onClick={onOpenHealthModal}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 text-[11px] font-medium transition cursor-pointer"
              >
                <Key className="w-3 h-3" />
                <span>API Config</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Route Information Results */}
      {routeResult && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Route Information
              </span>
              <span className="text-[11px] font-medium capitalize px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                {routeResult.routeType}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <Milestone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-medium text-slate-500">Distance</div>
                  <div className="text-base font-bold text-slate-900">
                    {formatDistance(routeResult.totalDistanceMeters)}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-medium text-slate-500">Estimated time</div>
                  <div className="text-base font-bold text-slate-900">
                    {formatDuration(routeResult.totalTimeSeconds)}
                  </div>
                </div>
              </div>
            </div>

            {/* Turn-by-turn instructions toggle */}
            {routeResult.instructions && routeResult.instructions.length > 0 && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowInstructions(!showInstructions)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-slate-900 py-1.5 px-2 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <span>Turn-by-turn Steps ({routeResult.instructions.length})</span>
                  {showInstructions ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {showInstructions && (
                  <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs text-slate-700 border border-slate-200 rounded-lg p-2 bg-slate-50/50">
                    {routeResult.instructions.map((inst, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 py-1 border-b border-slate-100 last:border-0"
                      >
                        <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <div>{inst.instruction}</div>
                          {inst.distance && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {inst.distance}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
