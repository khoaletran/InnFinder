import React, { useEffect, useRef, useState } from 'react';
import { Clock, ExternalLink, Loader2, MapPin, Navigation, Plus, Route, X } from 'lucide-react';
import { RoomMap, type MapDestination } from '@/components/map/RoomMap';
import type { RoomSummaryResponse } from '@/types/room.types';
import {
  getCachedAddressSuggestions,
  searchAddressSuggestions,
  type AddressSuggestion,
} from '@/utils/geocoding';
import {
  fetchRoadRoute,
  formatDistance,
  formatDuration,
  type RouteResult,
} from '@/utils/routing';

export interface SavedCommutePlace {
  id: string;
  title: string;
  fullAddress: string;
  lat: number;
  lng: number;
}

const STORAGE_KEY = 'innfinder-commute-places';
const PIN_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#0d9488'];

function loadSavedPlaces(): SavedCommutePlace[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedCommutePlace =>
        typeof item?.id === 'string' &&
        typeof item?.title === 'string' &&
        typeof item?.fullAddress === 'string' &&
        typeof item?.lat === 'number' &&
        typeof item?.lng === 'number',
    );
  } catch {
    return [];
  }
}

interface CommuteDistancePanelProps {
  roomCoords: { lat: number; lng: number };
  roomMapSummary: RoomSummaryResponse;
}

export const CommuteDistancePanel: React.FC<CommuteDistancePanelProps> = ({
  roomCoords,
  roomMapSummary,
}) => {
  const [places, setPlaces] = useState<SavedCommutePlace[]>(() => loadSavedPlaces());
  const [activePlaceId, setActivePlaceId] = useState<string | null>(() => {
    const initial = loadSavedPlaces();
    return initial[0]?.id ?? null;
  });
  const [routesByPlaceId, setRoutesByPlaceId] = useState<Record<string, RouteResult>>({});
  const [loadingRouteIds, setLoadingRouteIds] = useState<Record<string, boolean>>({});

  // Address autocomplete state
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Persist places to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
    } catch {
      // Ignore storage quota errors
    }
  }, [places]);

  // Close suggestions dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Forward geocode suggestions when typing
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const cached = getCachedAddressSuggestions(trimmed, roomCoords);
    if (cached) {
      setSuggestions(cached);
      setShowSuggestions(cached.length > 0);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await searchAddressSuggestions(trimmed, controller.signal, roomCoords);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      } finally {
        setIsSearching(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, roomCoords]);

  // Fetch road routes from roomCoords to all added places
  useEffect(() => {
    if (places.length === 0) return;

    const controller = new AbortController();
    const fetchAll = async () => {
      await Promise.all(
        places.map(async (place) => {
          setLoadingRouteIds((prev) => ({ ...prev, [place.id]: true }));
          try {
            const route = await fetchRoadRoute(
              roomCoords,
              { lat: place.lat, lng: place.lng },
              controller.signal,
            );
            if (!controller.signal.aborted) {
              setRoutesByPlaceId((prev) => ({ ...prev, [place.id]: route }));
            }
          } catch (err: unknown) {
            if (err instanceof DOMException && err.name === 'AbortError') return;
          } finally {
            if (!controller.signal.aborted) {
              setLoadingRouteIds((prev) => ({ ...prev, [place.id]: false }));
            }
          }
        }),
      );
    };

    void fetchAll();
    return () => controller.abort();
  }, [places, roomCoords]);

  const handleAddPlace = (suggestion: AddressSuggestion) => {
    const duplicate = places.find(
      (p) =>
        Math.abs(p.lat - suggestion.lat) < 0.0002 &&
        Math.abs(p.lng - suggestion.lng) < 0.0002,
    );
    if (duplicate) {
      setActivePlaceId(duplicate.id);
      setQuery('');
      setShowSuggestions(false);
      return;
    }

    const newPlace: SavedCommutePlace = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: suggestion.title,
      fullAddress: suggestion.fullAddress,
      lat: suggestion.lat,
      lng: suggestion.lng,
    };
    setPlaces((prev) => [...prev, newPlace]);
    setActivePlaceId(newPlace.id);
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleRemovePlace = (id: string) => {
    setPlaces((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (activePlaceId === id) {
        setActivePlaceId(next[0]?.id ?? null);
      }
      return next;
    });
  };

  const mapDestinations: MapDestination[] = places.map((place, index) => ({
    id: place.id,
    label: place.title,
    lat: place.lat,
    lng: place.lng,
    color: PIN_COLORS[index % PIN_COLORS.length],
    routeCoords: routesByPlaceId[place.id]?.routeCoords,
  }));

  return (
    <div className="space-y-3">
      {/* Thanh thêm địa chỉ kiểm tra khoảng cách */}
      <div ref={searchBoxRef} className="relative z-20">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <MapPin className="w-4 h-4 text-teal-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              placeholder="Thêm địa chỉ cần kiểm tra (VD: Đại học Công nghiệp, Bến xe Miền Đông...)"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition-all"
            />
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-teal-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
            ) : query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSuggestions([]);
                  setShowSuggestions(false);
                }}
                aria-label="Xóa từ khóa"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Dropdown gợi ý địa chỉ */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
            <div className="px-3.5 py-1.5 bg-slate-50 text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-teal-600" />
              Chọn địa điểm để tính khoảng cách & thời gian di chuyển
            </div>
            {suggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleAddPlace(item)}
                className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-teal-50/50 transition-colors flex items-start gap-2.5 cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{item.title}</p>
                  {item.subtitle && (
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.subtitle}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 self-center">
                  {item.distanceMeters !== undefined && (
                    <span className="text-[11px] text-slate-400 font-medium">
                      ~{formatDistance(item.distanceMeters)}
                    </span>
                  )}
                  <span className="text-[11px] font-semibold text-teal-700">
                    + Thêm
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Danh sách các địa điểm đã thêm */}
      {places.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {places.map((place, index) => {
            const color = PIN_COLORS[index % PIN_COLORS.length];
            const isActive = place.id === activePlaceId;
            const route = routesByPlaceId[place.id];
            const isLoadingRoute = Boolean(loadingRouteIds[place.id]);

            return (
              <div
                key={place.id}
                onClick={() => setActivePlaceId(place.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActivePlaceId(place.id);
                  }
                }}
                className={`group rounded-xl border p-3 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-teal-50/60 border-teal-500 shadow-xs'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span
                      style={{ backgroundColor: color }}
                      className="w-5 h-5 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{place.title}</p>
                      <p className="text-[11px] text-slate-500 truncate">{place.fullAddress}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePlace(place.id);
                    }}
                    aria-label={`Xóa ${place.title}`}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2 text-xs">
                  {isLoadingRoute && !route ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Loader2 className="w-3 h-3 animate-spin text-teal-600" />
                      Đang tính đường đi...
                    </span>
                  ) : route ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                        <Route className="w-3.5 h-3.5 text-teal-600" />
                        {formatDistance(route.distanceMeters)}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-teal-700">
                        <Clock className="w-3.5 h-3.5" />
                        {route.isEstimate ? '~' : ''}
                        {formatDuration(route.durationSeconds)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400">Chưa có dữ liệu tuyến đường</span>
                  )}

                  <a
                    href={`https://www.google.com/maps/dir/?api=1&origin=${roomCoords.lat},${roomCoords.lng}&destination=${place.lat},${place.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-800 shrink-0"
                    title="Mở chỉ đường trên Google Maps"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>Chỉ đường</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bản đồ hiển thị phòng trọ + tuyến đường tới các vị trí */}
      <div className="h-72 sm:h-80 rounded-2xl overflow-hidden border border-slate-200">
        <RoomMap
          key={roomMapSummary.maPhongTro}
          rooms={[roomMapSummary]}
          selectedRoom={roomMapSummary}
          interactivePreview={false}
          markerStyle="brand"
          showRadiusBadge={false}
          destinations={mapDestinations}
          activeDestinationId={activePlaceId}
          onSelectDestination={setActivePlaceId}
        />
      </div>
    </div>
  );
};
