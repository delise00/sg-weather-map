import React from 'react';
import { Play, Sparkles, Footprints, Bike, Search } from 'lucide-react';

interface DemoActionsBarProps {
  onRunDemo1: () => void; // Search Raffles Place
  onRunDemo2: () => void; // Walk from Raffles Place to Marina Bay Sands
  onRunDemo3: () => void; // Cycle from Orchard to Gardens by the Bay
}

export const DemoActionsBar: React.FC<DemoActionsBarProps> = ({
  onRunDemo1,
  onRunDemo2,
  onRunDemo3,
}) => {
  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-3.5 text-white shadow-md border border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-rose-400">
            Course Evaluation &amp; Presentation Quick Flows
          </div>
          <div className="text-[11px] text-slate-300">
            One-click test actions demonstrating search, routing &amp; 2-hour weather
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onRunDemo1}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600/80 text-xs font-medium transition cursor-pointer shadow-xs"
        >
          <Search className="w-3.5 h-3.5 text-amber-400" />
          <span>Demo 1: Search Raffles Place</span>
        </button>

        <button
          type="button"
          onClick={onRunDemo2}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition cursor-pointer shadow-xs"
        >
          <Footprints className="w-3.5 h-3.5" />
          <span>Demo 2: Walk (Raffles Pl &rarr; MBS)</span>
        </button>

        <button
          type="button"
          onClick={onRunDemo3}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600/80 text-xs font-medium transition cursor-pointer shadow-xs"
        >
          <Bike className="w-3.5 h-3.5 text-emerald-400" />
          <span>Demo 3: Cycle (Orchard &rarr; Gardens)</span>
        </button>
      </div>
    </div>
  );
};
