import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  List,
  Map as MapIcon,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AppButton } from '@/components/common/AppButton';
import { EmptyState } from '@/components/common/EmptyState';
import { SkeletonList } from '@/components/common/SkeletonList';
import { RoomMap, type MapViewport } from '@/components/map/RoomMap';
import { RoomCard } from '@/components/room/RoomCard';
import { roomService, type SearchBounds, type SearchLocation } from '@/services/room.service';
import type { RoomFilterRequest, RoomSummaryResponse } from '@/types/room.types';
import { getValidCoords } from '@/utils/formatters';

type ActivePopover = 'price' | 'category' | 'area' | 'amenities' | 'radius' | null;

const PRICE_PRESETS: Array<{ label: string; min?: number; max?: number }> = [
  { label: 'Tất cả mức giá' },
  { label: 'Dưới 3 triệu', min: 0, max: 3_000_000 },
  { label: '3 – 5 triệu', min: 3_000_000, max: 5_000_000 },
  { label: '5 – 8 triệu', min: 5_000_000, max: 8_000_000 },
  { label: 'Trên 8 triệu', min: 8_000_000, max: undefined },
];

const AREA_PRESETS: Array<{ label: string; min?: number; max?: number }> = [
  { label: 'Tất cả diện tích' },
  { label: 'Dưới 20 m²', min: 0, max: 20 },
  { label: '20 – 35 m²', min: 20, max: 35 },
  { label: '35 – 50 m²', min: 35, max: 50 },
  { label: 'Trên 50 m²', min: 50, max: undefined },
];

const RADIUS_OPTIONS = [1, 3, 5, 10, 20];

function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.asin(Math.sqrt(Math.min(1, a)));
  return R * c;
}

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const submittedKeyword = searchParams.get('keyword') ?? '';
  const [draft, setDraft] = useState<{ url: string; text: string } | null>(null);
  const url = JSON.stringify([submittedKeyword, searchParams.get('location')]);
  const searchInput = draft?.url === url ? draft.text : submittedKeyword;
  const useAiSearch = searchParams.get('ai') === '1';
  const [activePopover, setActivePopover] = useState<ActivePopover>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomSummaryResponse | null>(null);
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const gpsRequest = useRef<object | null>(null);
  useEffect(() => () => { gpsRequest.current = null; }, []);
  const popoverBarRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<MapViewport>(null);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const currentParams = useRef(searchParams);

  useEffect(() => {
    currentParams.current = searchParams;
  }, [searchParams]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!popoverBarRef.current?.contains(event.target as Node)) {
        setActivePopover(null);
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSuggestionText(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const { data: suggestions = [] } = useQuery({
    queryKey: ['location-suggestions', suggestionText],
    queryFn: ({ signal }) => roomService.suggestLocations(suggestionText, signal),
    enabled: suggestionsOpen && suggestionText.length >= 2 && suggestionText === searchInput.trim(),
  });
  const visibleSuggestions = suggestionsOpen && suggestionText === searchInput.trim() ? suggestions : [];

  function update(patch: Record<string, string | number | undefined>, replace = false) {
    const next = new URLSearchParams(currentParams.current);
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, String(value));
    }
    if (next.toString() === currentParams.current.toString()) return;
    currentParams.current = next;
    setSearchParams(next, { replace });
  }

  const numberParam = (key: string) => {
    const raw = searchParams.get(key);
    return raw !== null && raw.trim() !== '' && Number.isFinite(Number(raw)) ? Number(raw) : undefined;
  };
  const currentPage = Math.max(0, Math.floor(numberParam('page') ?? 0));
  const sortBy = searchParams.get('sort') ?? 'NEWEST';
  const centerLat = numberParam('lat');
  const centerLng = numberParam('lng');
  const center = centerLat !== undefined && centerLng !== undefined ? { lat: centerLat, lng: centerLng } : null;
  const cameraLat = numberParam('viewLat');
  const cameraLng = numberParam('viewLng');
  const cameraZoom = numberParam('zoom');
  const camera = cameraLat !== undefined && cameraLng !== undefined && cameraZoom !== undefined
    ? { lat: cameraLat, lng: cameraLng, zoom: cameraZoom } : null;
  const south = numberParam('south'), west = numberParam('west');
  const north = numberParam('north'), east = numberParam('east');
  const bbox = south !== undefined && west !== undefined && north !== undefined && east !== undefined
    ? { south, west, north, east } : undefined;
  const radiusKm = numberParam('radius');
  const location = searchParams.get('location') ?? undefined;
  const filterStore = {
    minPrice: numberParam('minPrice'),
    maxPrice: numberParam('maxPrice'),
    minArea: numberParam('minArea'),
    maxArea: numberParam('maxArea'),
    capacity: numberParam('capacity'),
    categoryId: searchParams.get('category') ?? undefined,
    selectedAmenities: searchParams.get('amenities')?.split(',').filter(Boolean) ?? [],
    radiusKm,
  };
  const { data: roomTypes = [] } = useQuery({
    queryKey: ['categories', 'room-types'], queryFn: roomService.getRoomTypes,
  });
  const { data: amenities = [] } = useQuery({
    queryKey: ['categories', 'amenities'], queryFn: roomService.getAmenities,
  });

  const filters: RoomFilterRequest = {
    location: bbox || radiusKm ? undefined : location,
    centerLat, centerLng, radiusKm, ...bbox,
    minGia: filterStore.minPrice, maxGia: filterStore.maxPrice,
    minDienTich: filterStore.minArea, maxDienTich: filterStore.maxArea,
    soNguoi: filterStore.capacity, maLpt: filterStore.categoryId,
    dsTienIch: filterStore.selectedAmenities,
    page: currentPage, size: 20,
    sortBy: sortBy === 'DISTANCE' && center ? 'distance' : sortBy.startsWith('PRICE') ? 'giaThue'
      : useAiSearch && !searchParams.has('sort') ? 'relevance' : 'thoiGianDang',
    sortDirection: sortBy === 'PRICE_ASC' ? 'ASC' : 'DESC',
  };
  const { data: queryResult, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['rooms', 'search', useAiSearch, submittedKeyword, filters],
    queryFn: async ({ signal }) => {
      if (useAiSearch && submittedKeyword.trim()) {
        const cacheKey = ['rooms', 'inferred', submittedKeyword];
        try {
          const response = await roomService.searchDetails(submittedKeyword, filters, signal);
          const inferred = response.inferred;
          if (inferred.location || inferred.minGia != null || inferred.maxGia != null
              || inferred.maLpt || inferred.dsTienIch?.length) {
            queryClient.setQueryData(cacheKey, inferred);
          }
          return { ...response.results, fallback: response.fallback ? 'keyword' : null };
        } catch (error) {
          if (signal.aborted) throw error;
          const known = queryClient.getQueryData<RoomFilterRequest>(cacheKey);
          const mappedArea = Boolean(bbox || radiusKm);
          const response = await roomService.searchRooms({
            ...filters,
            location: mappedArea ? undefined : filters.location ?? known?.location ?? undefined,
            minGia: filters.minGia ?? known?.minGia ?? undefined,
            maxGia: filters.maxGia ?? known?.maxGia ?? undefined,
            maLpt: filters.maLpt ?? known?.maLpt ?? undefined,
            dsTienIch: filters.dsTienIch?.length ? filters.dsTienIch : known?.dsTienIch,
            keyword: !known && !mappedArea ? submittedKeyword : undefined,
          });
          return { ...response, fallback: known ? 'criteria' : mappedArea ? 'area' : 'keyword' };
        }
      }
      const keyword = bbox || radiusKm ? undefined : submittedKeyword.trim() || undefined;
      return roomService.searchRooms({ ...filters, keyword }).then(result => ({ ...result, fallback: null }));
    },
  });

  const rooms = useMemo(() => queryResult?.content ?? [], [queryResult?.content]);
  const totalElements = queryResult?.totalElements ?? 0;
  const totalPages = queryResult?.totalPages ?? 0;
  const activeSelectedRoom = rooms.find(room => room.maPhongTro === selectedRoom?.maPhongTro) ?? null;
  const filteredRooms = rooms.map(room => {
    const coords = getValidCoords(room);
    const distanceInKm = center && coords ? getDistanceInKm(center.lat, center.lng, coords.lat, coords.lng) : null;
    return { room, distanceInKm };
  });

  const clearArea = { south: undefined, west: undefined, north: undefined, east: undefined };
  const clearCamera = { viewLat: undefined, viewLng: undefined, zoom: undefined };
  const [fit, setFit] = useState<{ bounds?: SearchBounds; radius?: number; lat: number; lng: number } | null>(null);

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    update({ keyword: searchInput.trim(), location: undefined, radius: undefined, lat: undefined,
      lng: undefined, ...clearArea, ...clearCamera, page: 0 });
    setFit(null);
    setSelectedRoom(null);
    setDraft(null);
    setSuggestionsOpen(false);
    setActivePopover(null);
  }

  function selectLocation(item: SearchLocation) {
    update({ keyword: undefined, location: item.name, lat: item.lat, lng: item.lng,
      radius: undefined, ...clearArea, ...clearCamera, page: 0 });
    setDraft(null);
    setSelectedRoom(null);
    setSuggestionsOpen(false);
    setFit({ lat: item.lat, lng: item.lng, bounds: item.bounds });
  }

  function selectRadius(radius?: number, preferredPosition?: { lat: number; lng: number }) {
    const position = preferredPosition ?? center ?? viewportRef.current ?? gpsCoords;
    if (radius && !position) return;
    update({ ...clearArea, ...clearCamera, radius, lat: position?.lat, lng: position?.lng, page: 0 });
    if (radius && position) setFit({ ...position, radius });
  }

  function handleLocateUser() {
    if (gpsRequest.current) return;
    if (!navigator.geolocation) {
      toast.error('Trình duyệt của bạn không hỗ trợ định vị GPS.');
      return;
    }
    const request = {};
    gpsRequest.current = request;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (gpsRequest.current !== request) return;
        gpsRequest.current = null;
        setIsLocating(false);
        const position = { lat: coords.latitude, lng: coords.longitude };
        setGpsCoords(position);
        setSelectedRoom(null);
        selectRadius(Number(currentParams.current.get('radius')) || 5, position);
      },
      (failure) => {
        if (gpsRequest.current !== request) return;
        gpsRequest.current = null;
        setIsLocating(false);
        toast.warning(failure.code === 3 ? 'Định vị quá thời gian. Hãy thử lại.'
          : 'Không thể lấy vị trí hiện tại. Hãy kiểm tra quyền định vị.');
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }

  function searchViewport() {
    const viewport = viewportRef.current;
    if (!viewport) return;
    update({ ...viewport.bounds, lat: viewport.lat, lng: viewport.lng, radius: undefined, page: 0 });
    setSelectedRoom(null);
  }

  function handleResetFilters() {
    update(Object.fromEntries([...currentParams.current.keys()].map(key => [key, undefined])));
    setDraft(null);
    setFit(null);
    setSelectedRoom(null);
    setActivePopover(null);
  }

  const selectedRoomId = activeSelectedRoom?.maPhongTro;
  useEffect(() => {
    if (!selectedRoomId) return;
    const list = listRef.current;
    const card = list?.querySelector<HTMLElement>(`[data-room-id="${CSS.escape(selectedRoomId)}"]`);
    if (list && card && list.clientHeight > 0) {
      list.scrollTo({
        top: list.scrollTop + card.getBoundingClientRect().top - list.getBoundingClientRect().top,
        behavior: 'smooth',
      });
    }
  }, [selectedRoomId, mobileView]);

  const hasPriceFilter =
    filterStore.minPrice !== undefined || filterStore.maxPrice !== undefined;
  const priceLabel = hasPriceFilter
    ? `${filterStore.minPrice ? `${filterStore.minPrice / 1e6}tr` : '0'} – ${
        filterStore.maxPrice ? `${filterStore.maxPrice / 1e6}tr` : 'Max'
      }`
    : 'Giá';

  const selectedCategoryObj = roomTypes.find(
    (c) => (c.maLpt || c.maLoaiPhong) === filterStore.categoryId,
  );
  const categoryLabel =
    selectedCategoryObj?.tenLoaiPhongTro || selectedCategoryObj?.tenLoaiPhong || 'Loại phòng';

  const hasAreaFilter =
    filterStore.minArea !== undefined || filterStore.maxArea !== undefined;
  const areaLabel = hasAreaFilter
    ? `${filterStore.minArea ?? 0} – ${filterStore.maxArea ?? 'Max'} m²`
    : 'Diện tích';

  const amenityCount = filterStore.selectedAmenities.length;
  const radiusLabel = filterStore.radiusKm ? `≤ ${filterStore.radiusKm} km` : 'Bán kính';

  return (
    <div className="flex-1 bg-slate-50 flex flex-col w-full h-full min-h-0 overflow-hidden">
      {/* THANH LỌC DẠNG CHIP NẰM NGANG CỐ ĐỊNH DƯỚI NAVBAR (FULL-BLEED) */}
      <section
        ref={popoverBarRef}
        className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 z-30 shrink-0"
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Ô tìm kiếm */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 lg:w-[440px] shrink-0">
            <div className="flex-1 relative flex items-center">
              <div className="absolute left-3.5 text-slate-500">
                {useAiSearch && isFetching ? (
                  <Sparkles className="w-4 h-4 text-teal-600 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setDraft({ url, text: e.target.value });
                  setSuggestionIndex(-1);
                  setSuggestionsOpen(true);
                }}
                onFocus={() => setSuggestionsOpen(true)}
                role="combobox"
                aria-label="Tìm khu vực hoặc phòng"
                aria-autocomplete="list"
                aria-expanded={visibleSuggestions.length > 0}
                aria-controls="location-suggestions"
                aria-activedescendant={visibleSuggestions[suggestionIndex] ? `location-option-${suggestionIndex}` : undefined}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setSuggestionsOpen(false);
                  if (visibleSuggestions.length === 0) return;
                  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    const count = visibleSuggestions.length;
                    const direction = event.key === 'ArrowDown' ? 1 : -1;
                    setSuggestionIndex(index => index < 0 ? direction === 1 ? 0 : count - 1 : (index + direction + count) % count);
                  }
                  if (event.key === 'Enter' && visibleSuggestions[suggestionIndex]) {
                    event.preventDefault();
                    selectLocation(visibleSuggestions[suggestionIndex]);
                  }
                }}
                placeholder="Quận, tên đường hoặc mô tả tự nhiên..."
                className="w-full h-10 pl-10 pr-24 bg-slate-50 focus:bg-white text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-teal-600 outline-none transition-colors placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => update({ ai: useAiSearch ? undefined : '1', page: 0 })}
                title="Tìm kiếm ngữ nghĩa AI"
                className={`absolute right-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  useAiSearch
                    ? 'bg-teal-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:text-teal-700'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI</span>
              </button>
              {visibleSuggestions.length > 0 && (
                <ul id="location-suggestions" role="listbox" className="absolute top-full mt-1 w-full bg-white rounded-xl border shadow-lg z-50">
                  {visibleSuggestions.map((item, index) => (
                    <li key={item.name} id={`location-option-${index}`} role="option"
                      aria-selected={index === suggestionIndex}
                      className={`cursor-pointer px-3 py-2 text-sm ${index === suggestionIndex ? 'bg-teal-100' : 'hover:bg-teal-50'}`}
                      onMouseDown={event => event.preventDefault()}
                      onClick={() => selectLocation(item)}>{item.name}</li>
                  ))}
                </ul>
              )}
            </div>

            <AppButton type="submit" variant="primary" size="md">
              Tìm
            </AppButton>
          </form>

          {/* Hàng Chip bộ lọc mở Popover */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* 1. Chip Giá */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActivePopover((p) => (p === 'price' ? null : 'price'))}
                className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  hasPriceFilter || activePopover === 'price'
                    ? 'bg-teal-50 text-teal-800 border-teal-500'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{priceLabel}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {activePopover === 'price' && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-lg p-3 z-50 space-y-1">
                  {PRICE_PRESETS.map((preset) => {
                    const selected =
                      filterStore.minPrice === preset.min && filterStore.maxPrice === preset.max;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          update({ minPrice: preset.min, maxPrice: preset.max, page: 0 });

                          setActivePopover(null);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium cursor-pointer ${
                          selected
                            ? 'bg-teal-50 text-teal-800 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{preset.label}</span>
                        {selected && <Check className="w-4 h-4 text-teal-700" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Chip Loại phòng */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActivePopover((p) => (p === 'category' ? null : 'category'))}
                className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  filterStore.categoryId || activePopover === 'category'
                    ? 'bg-teal-50 text-teal-800 border-teal-500'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{categoryLabel}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {activePopover === 'category' && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-lg p-3 z-50 space-y-1 max-h-72 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      update({ category: undefined, page: 0 });

                      setActivePopover(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium cursor-pointer ${
                      !filterStore.categoryId
                        ? 'bg-teal-50 text-teal-800 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>Tất cả loại phòng</span>
                    {!filterStore.categoryId && <Check className="w-4 h-4 text-teal-700" />}
                  </button>
                  {roomTypes.map((c) => {
                    const code = c.maLpt || c.maLoaiPhong || '';
                    const label = c.tenLoaiPhongTro || c.tenLoaiPhong || code;
                    const selected = filterStore.categoryId === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          update({ category: code, page: 0 });

                          setActivePopover(null);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium cursor-pointer text-left ${
                          selected
                            ? 'bg-teal-50 text-teal-800 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{label}</span>
                        {selected && <Check className="w-4 h-4 text-teal-700 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Chip Diện tích */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActivePopover((p) => (p === 'area' ? null : 'area'))}
                className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  hasAreaFilter || activePopover === 'area'
                    ? 'bg-teal-50 text-teal-800 border-teal-500'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{areaLabel}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {activePopover === 'area' && (
                <div className="absolute left-0 mt-2 w-60 bg-white rounded-2xl border border-slate-200 shadow-lg p-3 z-50 space-y-1">
                  {AREA_PRESETS.map((preset) => {
                    const selected =
                      filterStore.minArea === preset.min && filterStore.maxArea === preset.max;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          update({ minArea: preset.min, maxArea: preset.max, page: 0 });

                          setActivePopover(null);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium cursor-pointer ${
                          selected
                            ? 'bg-teal-50 text-teal-800 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{preset.label}</span>
                        {selected && <Check className="w-4 h-4 text-teal-700" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Chip Tiện ích */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActivePopover((p) => (p === 'amenities' ? null : 'amenities'))}
                className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  amenityCount > 0 || activePopover === 'amenities'
                    ? 'bg-teal-50 text-teal-800 border-teal-500'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{amenityCount > 0 ? `Tiện ích (${amenityCount})` : 'Tiện ích'}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {activePopover === 'amenities' && (
                <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-lg p-3 z-50 space-y-2">
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {amenities.map((am) => {
                      const active = filterStore.selectedAmenities.includes(am.maTienIch);
                      return (
                        <button
                          key={am.maTienIch}
                          type="button"
                          onClick={() => {
                            const next = active
                              ? filterStore.selectedAmenities.filter((id) => id !== am.maTienIch)
                              : [...filterStore.selectedAmenities, am.maTienIch];
                            update({ amenities: next.join(','), page: 0 });

                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm cursor-pointer text-left ${
                            active
                              ? 'bg-teal-50 text-teal-800 font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{am.tenTienIch}</span>
                          {active && <Check className="w-4 h-4 text-teal-700 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  {amenityCount > 0 && (
                    <div className="pt-2 border-t border-slate-100 flex justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          update({ amenities: undefined, page: 0 });

                        }}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        Bỏ chọn
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePopover(null)}
                        className="text-xs font-bold text-teal-700 hover:text-teal-800 cursor-pointer"
                      >
                        Xong
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 5. Chip Bán kính */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActivePopover((p) => (p === 'radius' ? null : 'radius'))}
                className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  filterStore.radiusKm || activePopover === 'radius'
                    ? 'bg-teal-50 text-teal-800 border-teal-500'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{radiusLabel}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {activePopover === 'radius' && (
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-2xl border border-slate-200 shadow-lg p-3 z-50 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      selectRadius(undefined);

                      setActivePopover(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm cursor-pointer ${
                      !filterStore.radiusKm
                        ? 'bg-teal-50 text-teal-800 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>Không giới hạn</span>
                    {!filterStore.radiusKm && <Check className="w-4 h-4 text-teal-700" />}
                  </button>
                  {RADIUS_OPTIONS.map((km) => (
                    <button
                      key={km}
                      type="button"
                      onClick={() => {
                        selectRadius(km);

                        setActivePopover(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm cursor-pointer ${
                        filterStore.radiusKm === km
                          ? 'bg-teal-50 text-teal-800 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>Trong {km} km</span>
                      {filterStore.radiusKm === km && (
                        <Check className="w-4 h-4 text-teal-700" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {(hasPriceFilter || hasAreaFilter || amenityCount > 0 || radiusKm || location || bbox || filterStore.categoryId) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 h-9 px-3 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* FULL-BLEED SPLIT 45/55 (DESKTOP) & LIST/MAP TOGGLE (MOBILE) */}
      <div className="flex-1 w-full min-h-0 grid grid-cols-1 lg:grid-cols-[45%_55%] h-full overflow-hidden">
        {/* CỘT TRÁI (45%): DANH SÁCH CARD ẢNH LỚN */}
        <div
          className={`${
            mobileView === 'map' ? 'hidden lg:flex' : 'flex'
          } flex-col h-full min-h-0 bg-slate-50 border-r border-slate-200 overflow-hidden`}
        >
          <div className="shrink-0 px-4 sm:px-6 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-2">
            <div>
              <h1 className="text-base font-bold text-slate-900">
                {totalElements} phòng phù hợp
                {bbox ? ' · Vùng bản đồ' : radiusKm ? ` · Bán kính ${radiusKm} km` : location || submittedKeyword ? ` · "${location ?? submittedKeyword}"` : ''}
              </h1>
              <p className="text-xs text-slate-600">
                {queryResult?.fallback === 'keyword' ? 'Tìm bằng từ khóa dự phòng'
                  : queryResult?.fallback === 'criteria' ? 'Đang dùng tiêu chí từ lần tìm trước'
                  : queryResult?.fallback === 'area' ? 'Đang tìm theo vùng và bộ lọc đã chọn'
                  : 'Di chuột vào phòng hoặc giá trên bản đồ để đối chiếu vị trí'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const distanceCenter = center ?? viewportRef.current;
                if (sortBy === 'PRICE_DESC' && distanceCenter) {
                  update({ page: 0, sort: 'DISTANCE', lat: distanceCenter.lat, lng: distanceCenter.lng });
                } else {
                  update({ page: 0, sort: sortBy === 'NEWEST' ? 'PRICE_ASC'
                    : sortBy === 'PRICE_ASC' ? 'PRICE_DESC' : 'NEWEST' });
                }
              }}
              className="h-9 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-600" />
              <span>
                {sortBy === 'NEWEST'
                  ? 'Mới nhất'
                  : sortBy === 'PRICE_ASC'
                    ? 'Giá tăng'
                    : sortBy === 'DISTANCE' ? 'Gần tâm tìm kiếm' : 'Giá giảm'}
              </span>
            </button>
          </div>

          <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 overscroll-contain">
            {error ? (
              <div className="bg-white rounded-2xl border border-red-200 p-6 text-center space-y-3 shadow-xs">
                <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
                <p className="text-sm font-bold text-slate-900">
                  Không thể tải danh sách phòng trọ
                </p>
                <p className="text-xs text-slate-600">
                  {error instanceof Error ? error.message : 'Vui lòng kiểm tra kết nối mạng.'}
                </p>
                <AppButton variant="primary" size="sm" onClick={() => void refetch()}>
                  Thử lại
                </AppButton>
              </div>
            ) : isLoading ? (
              <SkeletonList
                variant="cards"
                count={4}
                columnsClassName="grid-cols-1 sm:grid-cols-2"
              />
            ) : filteredRooms.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredRooms.map(({ room, distanceInKm }) => (
                  <div key={room.maPhongTro} data-room-id={room.maPhongTro}>
                  <RoomCard
                    room={room}
                    layout="vertical"
                    distanceInKm={distanceInKm}
                    onSelect={(r) => setSelectedRoom(r)}
                    isSelected={activeSelectedRoom?.maPhongTro === room.maPhongTro}
                    isHighlighted={hoveredRoomId === room.maPhongTro}
                    onHoverChange={setHoveredRoomId}
                  />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Không tìm thấy phòng phù hợp"
                description="Hãy xóa bớt tiêu chí lọc hoặc mở rộng bán kính tìm kiếm để xem thêm phòng gần khu vực này."
                action={
                  <>
                    <AppButton variant="primary" size="md" onClick={handleResetFilters}>
                      Xóa bộ lọc
                    </AppButton>
                    <AppButton variant="secondary" size="md" onClick={() => selectRadius(radiusKm === 20 ? undefined : radiusKm ? Math.min(20, radiusKm + 5) : 15)}>
                      Mở rộng bán kính
                    </AppButton>
                  </>
                }
              />
            )}
          </div>

          {/* Phân trang */}
          <div className="shrink-0 px-4 sm:px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-700">
            <span className="font-medium">
              {filteredRooms.length > 0
                ? `Trang ${currentPage + 1}/${totalPages} (${totalElements} phòng)`
                : '0 phòng'}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() => update({ page: Math.max(0, currentPage - 1) })}
                className="h-8 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Trước
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages - 1}
                onClick={() => update({ page: currentPage + 1 })}
                className="h-8 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 font-semibold flex items-center gap-1 cursor-pointer"
              >
                Tiếp <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (55%): BẢN ĐỒ TƯƠNG TÁC */}
        <div
          className={`${
            mobileView === 'list' ? 'hidden lg:block' : 'block'
          } h-full w-full bg-slate-100 relative overflow-hidden`}
        >
          <RoomMap
            rooms={rooms}
            selectedRoom={activeSelectedRoom}
            hoveredRoomId={hoveredRoomId}
            onSelectRoom={setSelectedRoom}
            onHoverRoom={setHoveredRoomId}
            userCoords={gpsCoords}
            searchCenter={center}
            radiusKm={radiusKm}
            camera={camera}
            fit={fit}
            resultKey={`${submittedKeyword}|${location ?? ''}`}
            panToSelection={false}
            onViewport={(viewport, persist) => {
              viewportRef.current = viewport;
              if (persist) update({ viewLat: viewport.lat, viewLng: viewport.lng, zoom: viewport.zoom }, true);
            }}
            onSearchViewport={searchViewport}
            onLocateUser={handleLocateUser}
            isLocating={isLocating}
          />
        </div>
      </div>

      {/* NÚT NỔI CHUYỂN VIEW DANH SÁCH <-> BẢN ĐỒ TRÊN MOBILE */}
      <div className="lg:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-30">
        <button
          type="button"
          onClick={() => setMobileView((v) => (v === 'list' ? 'map' : 'list'))}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-lg cursor-pointer"
        >
          {mobileView === 'list' ? (
            <>
              <MapIcon className="w-4 h-4" />
              <span>Bản đồ</span>
            </>
          ) : (
            <>
              <List className="w-4 h-4" />
              <span>Danh sách</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
