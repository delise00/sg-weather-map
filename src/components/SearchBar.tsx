import React, { useState } from 'react';
import { Search, MapPin, Loader2, X, Navigation, ArrowRight } from 'lucide-react';
import { LocationItem } from '../types/index.ts';

interface SearchBarProps {
  onSearch: (query: string) => Promise<void>;
  searchResults: LocationItem[];
  isLoading: boolean;
  searchError: string | null;
  onSelectResult: (location: LocationItem) => void;
  onSetAsStart: (location: LocationItem) => void;
  onSetAsDestination: (location: LocationItem) => void;
  onClearSearch: () => void;
}

const QUICK_SUGGESTIONS = [
  'Raffles Place',
  'Marina Bay Sands',
  'Gardens by the Bay',
  'Orchard Road',
];

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  searchResults,
  isLoading,
  searchError,
  onSelectResult,
  onSetAsStart,
  onSetAsDestination,
  onClearSearch,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    setHasSearched(true);
    onSearch(inputValue.trim());
  };

  const handleQuickSuggestion = (suggestion: string) => {
    setInputValue(suggestion);
    setHasSearched(true);
    onSearch(suggestion);
  };

  const handleClear = () => {
    setInputValue('');
    setHasSearched(false);
    onClearSearch();
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-md border border-slate-200 p-4 transition-all">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search location or postal code (e.g. Raffles Place, Marina Bay Sands, 048616)..."
            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition"
          />
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-medium text-sm rounded-lg shadow-sm transition cursor-pointer disabled:cursor-not-allowed shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Searching...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Search</span>
            </>
          )}
        </button>
      </form>

      {/* Quick suggestions pills */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
        <span className="font-medium text-slate-600 mr-1">Quick search:</span>
        {QUICK_SUGGESTIONS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => handleQuickSuggestion(item)}
            className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 border border-slate-200 rounded-full transition text-slate-700 text-xs cursor-pointer"
          >
            {item}
          </button>
        ))}
      </div>

      {/* Error state */}
      {searchError && (
        <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          <span>{searchError}</span>
        </div>
      )}

      {/* Results Dropdown / List */}
      {searchResults.length > 0 && (
        <div className="mt-3 border border-slate-200 rounded-lg bg-slate-50/50 divide-y divide-slate-200 max-h-60 overflow-y-auto shadow-sm">
          <div className="px-3 py-1.5 bg-slate-100/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>OneMap Search Results ({searchResults.length})</span>
            <span className="text-slate-400 font-normal">Click to select on map</span>
          </div>
          {searchResults.map((item, index) => (
            <div
              key={`${item.searchVal}-${index}`}
              className="p-3 hover:bg-white transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left"
            >
              <button
                type="button"
                onClick={() => onSelectResult(item)}
                className="flex items-start gap-2.5 flex-1 text-left cursor-pointer group"
              >
                <div className="mt-0.5 p-1.5 rounded-lg bg-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs sm:text-sm text-slate-900 group-hover:text-rose-600 transition">
                    {item.building || item.searchVal}
                  </div>
                  <div className="text-xs text-slate-500 line-clamp-1">
                    {item.address}
                  </div>
                  {item.postal && (
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      Postal Code: {item.postal}
                    </div>
                  )}
                </div>
              </button>

              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => onSetAsStart(item)}
                  className="px-2 py-1 text-[11px] font-medium rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer"
                  title="Use as route start point"
                >
                  Set as Start
                </button>
                <button
                  type="button"
                  onClick={() => onSetAsDestination(item)}
                  className="px-2 py-1 text-[11px] font-medium rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer"
                  title="Use as route destination"
                >
                  Set as Destination
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasSearched && !isLoading && searchResults.length === 0 && !searchError && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs">
          Location could not be found. Please try another search.
        </div>
      )}
    </div>
  );
};
