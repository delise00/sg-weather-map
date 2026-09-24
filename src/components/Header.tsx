import React from 'react';
import { Compass, Activity, CloudSun } from 'lucide-react';

interface HeaderProps {
  onOpenHealthModal: () => void;
  isApiHealthy?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenHealthModal, isApiHealthy = true }) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Title and Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center shadow-inner text-white">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Singapore Travel &amp; Navigation
              </h1>
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium bg-rose-950/80 text-rose-300 border border-rose-800/60 px-2 py-0.5 rounded-full">
                OneMap &bull; data.gov.sg
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive map, address search, route directions &amp; real-time 2-hour weather
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenHealthModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shadow-sm cursor-pointer"
            title="Check OneMap & Weather API status"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>API Health</span>
            <span className={`w-2 h-2 rounded-full ${isApiHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          </button>
        </div>
      </div>

      {/* SMU Course Project Disclaimer Banner */}
      <div className="bg-slate-950/80 border-t border-slate-800/80 py-1 px-4 text-center">
        <p className="text-[11px] text-slate-400">
          SMU Course Project &bull; Not affiliated with or endorsed by OneMap, SLA, data.gov.sg, or the Singapore Government.
        </p>
      </div>
    </header>
  );
};
