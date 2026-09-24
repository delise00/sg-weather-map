import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, Maximize2, MapPin } from 'lucide-react';
import { LocationItem, RouteResult } from '../types/index.ts';

interface MapViewProps {
  selectedLocation: LocationItem | null;
  startLocation: LocationItem | null;
  destinationLocation: LocationItem | null;
  routeResult: RouteResult | null;
  onSelectMapLocation: (lat: number, lng: number) => void;
  onSetAsStart: (location: LocationItem) => void;
  onSetAsDestination: (location: LocationItem) => void;
}

type TileTheme = 'Default' | 'Night' | 'Original';

export const MapView: React.FC<MapViewProps> = ({
  selectedLocation,
  startLocation,
  destinationLocation,
  routeResult,
  onSelectMapLocation,
  onSetAsStart,
  onSetAsDestination,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const selectedMarkerRef = useRef<L.Marker | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  const [currentTheme, setCurrentTheme] = useState<TileTheme>('Default');

  // Custom marker creators using SVG DivIcons for zero-asset reliability
  const createDivIcon = (color: string, label: string, ringColor = '#ffffff') => {
    return L.divIcon({
      className: 'custom-map-marker',
      iconSize: [32, 40],
      iconAnchor: [16, 40],
      popupAnchor: [0, -36],
      html: `
        <div style="position: relative; width: 32px; height: 40px;">
          <svg viewBox="0 0 32 40" width="32" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.163 0 0 7.163 0 16c0 11.2 14.4 23.1 15.1 23.7.3.2.6.3.9.3s.6-.1.9-.3C17.6 39.1 32 27.2 32 16c0-8.837-7.163-16-16-16z" fill="${color}" stroke="${ringColor}" stroke-width="2"/>
            <circle cx="16" cy="15" r="9" fill="#ffffff" />
            <text x="16" y="19" text-anchor="middle" fill="${color}" font-size="11" font-weight="bold" font-family="sans-serif">${label}</text>
          </svg>
        </div>
      `,
    });
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default to Raffles Place Singapore
    const initialLat = 1.2843;
    const initialLng = 103.8510;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      minZoom: 11,
      maxZoom: 19,
      zoomControl: true,
    });

    const tileUrl = `https://www.onemap.gov.sg/maps/tiles/${currentTheme}/{z}/{x}/{y}.png`;
    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      minZoom: 11,
      attribution:
        'Map data &copy; <a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a> &bull; Singapore Land Authority',
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    // Handle map clicks
    map.on('click', (e: L.LeafletMouseEvent) => {
      onSelectMapLocation(e.latlng.lat, e.latlng.lng);
    });

    // Invalidate size on resize
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Theme
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const newTileUrl = `https://www.onemap.gov.sg/maps/tiles/${currentTheme}/{z}/{x}/{y}.png`;
    tileLayerRef.current.setUrl(newTileUrl);
  }, [currentTheme]);

  // Update Selected Location Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }

    if (selectedLocation) {
      const marker = L.marker([selectedLocation.lat, selectedLocation.lng], {
        icon: createDivIcon('#e11d48', '★', '#ffffff'),
        zIndexOffset: 1000,
      }).addTo(map);

      // Create DOM elements programmatically so event listeners are always attached reliably
      const container = document.createElement('div');
      container.className = 'p-1 text-slate-800 font-sans';

      const title = document.createElement('div');
      title.className = 'font-bold text-sm text-slate-900 mb-0.5';
      title.textContent = selectedLocation.building || selectedLocation.searchVal;
      container.appendChild(title);

      const address = document.createElement('div');
      address.className = 'text-xs text-slate-600 mb-1';
      address.textContent = selectedLocation.address;
      container.appendChild(address);

      if (selectedLocation.postal) {
        const postal = document.createElement('div');
        postal.className = 'text-[11px] font-mono text-slate-500 mb-2';
        postal.textContent = `Postal: ${selectedLocation.postal}`;
        container.appendChild(postal);
      }

      const btnRow = document.createElement('div');
      btnRow.className = 'flex items-center gap-1.5 mt-2';

      const startBtn = document.createElement('button');
      startBtn.type = 'button';
      startBtn.textContent = 'Set as Start';
      startBtn.className =
        'px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition';
      startBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onSetAsStart(selectedLocation);
        marker.closePopup();
      });
      btnRow.appendChild(startBtn);

      const destBtn = document.createElement('button');
      destBtn.type = 'button';
      destBtn.textContent = 'Set as Dest';
      destBtn.className =
        'px-2.5 py-1 text-xs font-semibold rounded bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition';
      destBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onSetAsDestination(selectedLocation);
        marker.closePopup();
      });
      btnRow.appendChild(destBtn);

      container.appendChild(btnRow);

      marker.bindPopup(container);
      selectedMarkerRef.current = marker;

      // Only fly to marker if there is no active route display
      if (!routeResult) {
        map.flyTo([selectedLocation.lat, selectedLocation.lng], 16, {
          duration: 1,
        });
      }
    }
  }, [selectedLocation, onSetAsStart, onSetAsDestination, routeResult]);

  // Update Start & Destination Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Start marker (Green A)
    if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
    }
    if (startLocation) {
      const marker = L.marker([startLocation.lat, startLocation.lng], {
        icon: createDivIcon('#059669', 'A', '#ffffff'),
        zIndexOffset: 900,
      }).addTo(map);
      marker.bindPopup(`
        <div class="p-1">
          <div style="font-weight: 700; color: #059669; font-size: 12px;">START (Point A)</div>
          <div style="font-size: 12px; font-weight: 600; color: #1e293b;">${startLocation.building || startLocation.searchVal}</div>
          <div style="font-size: 11px; color: #64748b;">${startLocation.address}</div>
        </div>
      `);
      startMarkerRef.current = marker;
    }

    // Destination marker (Indigo B)
    if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }
    if (destinationLocation) {
      const marker = L.marker([destinationLocation.lat, destinationLocation.lng], {
        icon: createDivIcon('#4f46e5', 'B', '#ffffff'),
        zIndexOffset: 900,
      }).addTo(map);
      marker.bindPopup(`
        <div class="p-1">
          <div style="font-weight: 700; color: #4f46e5; font-size: 12px;">DESTINATION (Point B)</div>
          <div style="font-size: 12px; font-weight: 600; color: #1e293b;">${destinationLocation.building || destinationLocation.searchVal}</div>
          <div style="font-size: 11px; color: #64748b;">${destinationLocation.address}</div>
        </div>
      `);
      destMarkerRef.current = marker;
    }
  }, [startLocation, destinationLocation]);

  // Update Route Polyline & Fit Bounds
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }

    if (routeResult && routeResult.coordinates.length > 0) {
      const latLngs: [number, number][] = routeResult.coordinates;

      const polyline = L.polyline(latLngs, {
        color: '#2563eb',
        weight: 6,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      routePolylineRef.current = polyline;

      // Fit map to route bounds
      const bounds = polyline.getBounds();
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 17,
        animate: true,
      });
    }
  }, [routeResult]);

  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([1.2843, 103.8510], 15);
    }
  };

  return (
    <div className="relative w-full h-[450px] md:h-[540px] rounded-2xl overflow-hidden border border-slate-300 shadow-lg bg-slate-100">
      {/* Map DOM target */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Selected location quick-action floating pill on top-left of map */}
      {selectedLocation && (
        <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200 p-2.5 flex items-center gap-2 max-w-[85%] sm:max-w-md">
          <div className="p-1.5 rounded-lg bg-rose-100 text-rose-600 shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-xs text-slate-900 truncate">
              {selectedLocation.building || selectedLocation.searchVal}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {selectedLocation.address}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onSetAsStart(selectedLocation)}
              className="px-2 py-1 text-[11px] font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
            >
              Start
            </button>
            <button
              type="button"
              onClick={() => onSetAsDestination(selectedLocation)}
              className="px-2 py-1 text-[11px] font-semibold rounded bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer"
            >
              Dest
            </button>
          </div>
        </div>
      )}

      {/* Top right floating layer / theme switch controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200 p-1 flex items-center gap-1 text-xs">
          <div className="px-2 py-1 text-slate-500 font-medium flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-slate-700" />
            <span className="hidden sm:inline">Theme:</span>
          </div>
          {(['Default', 'Night', 'Original'] as TileTheme[]).map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => setCurrentTheme(theme)}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                currentTheme === theme
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {theme}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleResetView}
          className="self-end p-2 rounded-xl bg-white/95 backdrop-blur-md shadow-md border border-slate-200 text-slate-700 hover:text-rose-600 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1 text-xs font-medium"
          title="Reset to Raffles Place Singapore view"
        >
          <Maximize2 className="w-4 h-4" />
          <span className="hidden sm:inline">Reset View</span>
        </button>
      </div>

      {/* Map helper legend badge on bottom left */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 backdrop-blur-sm rounded-lg text-white text-[11px] shadow">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Selected
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Start (A)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> Destination (B)
        </span>
      </div>
    </div>
  );
};
