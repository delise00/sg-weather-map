import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Key,
  Server,
  ExternalLink,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { HealthCheckResponse } from '../types/index.ts';
import { checkApiHealth, setApiCredentials, getStoredToken, setStoredToken } from '../services/api.ts';

interface ApiHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiHealthModal: React.FC<ApiHealthModalProps> = ({ isOpen, onClose }) => {
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [tokenMsg, setTokenMsg] = useState<string | null>(null);

  const fetchHealth = async () => {
    setIsLoading(true);
    try {
      const data = await checkApiHealth();
      setHealthData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHealth();
      const stored = getStoredToken();
      setCurrentToken(stored);
    }
  }, [isOpen]);

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    try {
      const trimmed = tokenInput.trim();
      setStoredToken(trimmed);
      await setApiCredentials(trimmed).catch(() => {});
      setCurrentToken(trimmed);
      setTokenMsg('OneMap token saved! Active for Search, Reverse Geocode & Routing.');
      setTokenInput('');
      fetchHealth();
    } catch (err: any) {
      setTokenMsg(`Error saving token: ${err.message}`);
    }
  };

  const handleClearToken = () => {
    setStoredToken(null);
    setCurrentToken(null);
    setTokenMsg('OneMap token removed. Free mode active (OSRM + Nominatim + data.gov.sg).');
    fetchHealth();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">API Health Status &amp; Architecture</h3>
              <p className="text-xs text-slate-400">Inspecting server-side /api routes and connectivity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                System Status
              </span>
              {healthData && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                    healthData.status === 'healthy'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {healthData.status.toUpperCase()}
                </span>
              )}
            </div>

            <button
              onClick={fetchHealth}
              disabled={isLoading}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Recheck</span>
            </button>
          </div>

          {/* Service Cards */}
          <div className="space-y-2.5">
            {/* OneMap Search */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between">
              <div>
                <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                  <span>OneMap Elastic Search</span>
                  <span className="text-[11px] font-mono text-slate-400">/api/onemap-search</span>
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  {healthData?.services.onemapSearch.message || 'Testing...'}
                </div>
                {healthData?.services.onemapSearch.latencyMs !== undefined && (
                  <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    Latency: {healthData.services.onemapSearch.latencyMs}ms
                  </div>
                )}
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded font-medium ${
                  healthData?.services.onemapSearch.status === 'operational'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {healthData?.services.onemapSearch.status || '...'}
              </span>
            </div>

            {/* data.gov.sg Weather */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between">
              <div>
                <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                  <span>data.gov.sg 2-Hour Weather</span>
                  <span className="text-[11px] font-mono text-slate-400">/api/weather</span>
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  {healthData?.services.weatherGovSg.message || 'Testing...'}
                </div>
                {healthData?.services.weatherGovSg.forecastPeriod && (
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Valid: {healthData.services.weatherGovSg.forecastPeriod}
                  </div>
                )}
                {healthData?.services.weatherGovSg.latencyMs !== undefined && (
                  <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    Latency: {healthData.services.weatherGovSg.latencyMs}ms
                  </div>
                )}
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded font-medium ${
                  healthData?.services.weatherGovSg.status === 'operational'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {healthData?.services.weatherGovSg.status || '...'}
              </span>
            </div>

            {/* OneMap Routing & Credentials */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between">
              <div>
                <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                  <span>OneMap Routing Service</span>
                  <span className="text-[11px] font-mono text-slate-400">/api/onemap-route</span>
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  {healthData?.services.onemapRoute.message || 'Operational'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  OneMap Token: <strong>{healthData?.services.onemapRoute.hasCredentials ? 'Configured' : 'Optional (OSRM Fallback Active)'}</strong>
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded font-medium bg-emerald-100 text-emerald-800">
                Operational
              </span>
            </div>
          </div>

          {/* OneMap Token Configuration */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-900">
                <Key className="w-4 h-4 text-blue-600" />
                <span>OneMap API Token (Optional)</span>
              </div>
              {currentToken && (
                <button
                  type="button"
                  onClick={handleClearToken}
                  className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove Token</span>
                </button>
              )}
            </div>

            <p className="text-xs text-blue-800">
              OneMap APIs require a registered authorization token for full access. Free OpenStreetMap (OSRM) + Nominatim and real-time data.gov.sg weather are active automatically when no token is provided.
            </p>

            {currentToken ? (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold">OneMap Token Active</span>
                  <span className="text-[11px] text-emerald-600 font-mono">
                    ({currentToken.slice(0, 10)}...{currentToken.slice(-6)})
                  </span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveToken} className="flex gap-2">
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Paste OneMap access token (Bearer or raw token)..."
                  className="flex-1 px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Save Token
                </button>
              </form>
            )}

            {tokenMsg && (
              <p className="text-[11px] text-blue-700 font-medium">{tokenMsg}</p>
            )}
          </div>

          {/* Directory Architecture Verification */}
          <div className="p-3 bg-slate-100 rounded-xl text-xs space-y-1 text-slate-600">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5" />
              <span>Project API Structure (/api)</span>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] font-mono text-slate-600">
              <li>/api/health - External API health check endpoint</li>
              <li>/api/onemap-search - OneMap search &amp; geocoding</li>
              <li>/api/onemap-route - OneMap walk/drive/cycle/pt routing</li>
              <li>/api/weather - data.gov.sg 2-hour weather nowcast</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
