import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpDown,
  Check,
  ChevronDown,
  ExternalLink,
  List,
  Loader2,
  Map as MapIcon,
  MapPin,
  Search,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AppButton } from '@/components/common/AppButton';
import { EmptyState } from '@/components/common/EmptyState';
import { SkeletonList } from '@/components/common/SkeletonList';
import { RoomMap, type MapBounds } from '@/components/map/RoomMap';
import { MapRoomDetailCard } from '@/components/room/MapRoomDetailCard';
import {
  buildCapacityOptions,
  buildNumericBrackets,
  formatMillions,
  getDistanceInKm,
  ROOM_SORT_OPTIONS,
  resolveRoomSortParams,
  sortRoomsByOption,
} from '@/components/room/searchHelpers';
import { SearchModeTabs } from '@/components/room/SearchModeTabs';
import { UtilityFilterPopover } from '@/components/room/UtilityFilterPopover';
import { roomService } from '@/services/room.service';
import { useRoomFilterStore } from '@/store/useRoomFilterStore';
import type { RoomSummaryResponse } from '@/types/room.types';
import {
  formatElectricityPrice,
  formatVNDShort,
  formatWaterPrice,
  getValidCoords,
} from '@/utils/formatters';
import {
  getCachedAddressSuggestions,
  searchAddressSuggestions,
  type AddressSuggestion,
} from '@/utils/geocoding';

type ActivePopover = 'price' | 'utility' | 'category' | 'area' | 'capacity' | 'amenities' | 'sort' | null;

export const MapSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const filterStore = useRoomFilterStore();
  const {
    mapSortBy: sortBy,
    setMapSortBy: setSortBy,
    mapSelectedRoomId: selectedRoomId,
    setMapSelectedRoomId: setSelectedRoomId,
    mapViewport,
    setMapViewport,
    mapMobileView: mobileView,
    setMapMobileView: setMobileView,
    setLastSearchMode,
    setUserLocation,
  } = filterStore;

  useEffect(() => {
    setLastSearchMode('map');
  }, [setLastSearchMode]);

  const [activePopover, setActivePopover] = useState<ActivePopover>(null);
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);

  const [locationQuery, setLocationQuery] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<AddressSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [focusTarget, setFocusTarget] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
    seq: number;
  } | null>(null);
  const locationSearchRef = useRef<HTMLDivElement>(null);
  const skipNextGeocodeRef = useRef(false);

  const handleBoundsChange = useCallback((next: MapBounds) => {
    setMapBounds((prev) => {
      if (
        prev &&
        Math.abs(prev.north - next.north) < 1e-6 &&
        Math.abs(prev.south - next.south) < 1e-6 &&
        Math.abs(prev.east - next.east) < 1e-6 &&
        Math.abs(prev.west - next.west) < 1e-6
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const popoverBarRef = useRef<HTMLDivElement>(null);

  const gpsCoords = useMemo(
    () =>
      filterStore.userLat !== undefined && filterStore.userLng !== undefined
        ? { lat: filterStore.userLat, lng: filterStore.userLng }
        : null,
    [filterStore.userLat, filterStore.userLng],
  );
  const [isLocating, setIsLocating] = useState(false);
  const [locateTrigger, setLocateTrigger] = useState(0);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverBarRef.current && !popoverBarRef.current.contains(target)) {
        setActivePopover(null);
      }
      if (locationSearchRef.current && !locationSearchRef.current.contains(target)) {
        setShowLocationSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    if (skipNextGeocodeRef.current) {
      skipNextGeocodeRef.current = false;
      return;
    }

    const trimmed = locationQuery.trim();
    if (trimmed.length < 2) {
      return;
    }

    const cached = getCachedAddressSuggestions(trimmed);
    if (cached) {
      const cacheTimer = setTimeout(() => {
        setLocationSuggestions(cached);
        setShowLocationSuggestions(cached.length > 0);
      }, 0);
      return () => clearTimeout(cacheTimer);
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setIsGeocoding(true);
        const results = await searchAddressSuggestions(trimmed, controller.signal);
        setLocationSuggestions(results);
        setShowLocationSuggestions(results.length > 0);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      } finally {
        setIsGeocoding(false);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [locationQuery]);

  const handleSelectLocationSuggestion = useCallback(
    (item: AddressSuggestion) => {
      skipNextGeocodeRef.current = true;
      setLocationQuery(item.fullAddress);
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      setSelectedRoomId(null);
      setFocusTarget((prev) => ({
        lat: item.lat,
        lng: item.lng,
        zoom: 14,
        seq: (prev?.seq ?? 0) + 1,
      }));
      toast.success(`Đã di chuyển bản đồ đến ${item.title}`);
    },
    [setSelectedRoomId],
  );

  const handleLocationSearchSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (locationSuggestions.length > 0) {
        handleSelectLocationSuggestion(locationSuggestions[0]);
        return;
      }
      const trimmed = locationQuery.trim();
      if (trimmed.length < 2) return;
      try {
        setIsGeocoding(true);
        const results = await searchAddressSuggestions(trimmed);
        if (results.length > 0) {
          handleSelectLocationSuggestion(results[0]);
        } else {
          toast.info('Không tìm thấy vị trí phù hợp, hãy thử tên đường hoặc quận/huyện khác.');
        }
      } finally {
        setIsGeocoding(false);
      }
    },
    [handleSelectLocationSuggestion, locationQuery, locationSuggestions],
  );

  useEffect(() => {
    if (!navigator.geolocation) return;
    const { userLat, userLng } = useRoomFilterStore.getState();
    if (userLat !== undefined && userLng !== undefined) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.warn('Geolocation tự động không khả dụng hoặc bị từ chối:', err);
      },
      { timeout: 8000, enableHighAccuracy: true },
    );
  }, [setUserLocation]);

  const { data: roomTypes = [] } = useQuery({
    queryKey: ['categories', 'room-types'],
    queryFn: roomService.getRoomTypes,
  });

  const { data: amenities = [] } = useQuery({
    queryKey: ['categories', 'amenities'],
    queryFn: roomService.getAmenities,
  });

  const { data: catalogForFilters } = useQuery({
    queryKey: ['rooms', 'filter-metadata'],
    queryFn: () => roomService.searchRooms({ page: 0, size: 100 }),
    staleTime: 5 * 60 * 1000,
  });
  const catalogRooms = useMemo(() => catalogForFilters?.content ?? [], [catalogForFilters?.content]);

  const priceOptions = useMemo(
    () =>
      buildNumericBrackets(
        catalogRooms.map((r) => r.giaThue),
        500_000,
        'Tất cả mức giá',
        (n) => `Giá ${formatMillions(n)}`,
        (n) => `Dưới ${formatMillions(n)}`,
        (a, b) => `${formatMillions(a)} – ${formatMillions(b)}`,
        (n) => `Từ ${formatMillions(n)} trở lên`,
      ),
    [catalogRooms],
  );

  const areaOptions = useMemo(
    () =>
      buildNumericBrackets(
        catalogRooms.map((r) => r.dienTich),
        5,
        'Tất cả diện tích',
        (n) => `${n} m²`,
        (n) => `Dưới ${n} m²`,
        (a, b) => `${a} – ${b} m²`,
        (n) => `Từ ${n} m² trở lên`,
      ),
    [catalogRooms],
  );

  const capacityOptions = useMemo(() => buildCapacityOptions(catalogRooms), [catalogRooms]);

  const {
    data: rooms = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'rooms',
      'map-search',
      {
        minPrice: filterStore.minPrice,
        maxPrice: filterStore.maxPrice,
        minElectricityPrice: filterStore.minElectricityPrice,
        maxElectricityPrice: filterStore.maxElectricityPrice,
        minWaterPrice: filterStore.minWaterPrice,
        maxWaterPrice: filterStore.maxWaterPrice,
        waterByPerson: filterStore.waterByPerson,
        minArea: filterStore.minArea,
        maxArea: filterStore.maxArea,
        capacity: filterStore.capacity,
        categoryId: filterStore.categoryId,
        selectedAmenities: filterStore.selectedAmenities,
        sortBy,
      },
    ],
    queryFn: async () => {
      const { sortBy: sortField, sortDirection } = resolveRoomSortParams(sortBy);
      const res = await roomService.searchRooms({
        minGia: filterStore.minPrice,
        maxGia: filterStore.maxPrice,
        minGiaDien: filterStore.minElectricityPrice,
        maxGiaDien: filterStore.maxElectricityPrice,
        minGiaNuoc: filterStore.minWaterPrice,
        maxGiaNuoc: filterStore.maxWaterPrice,
        nuocTheoNguoi: filterStore.waterByPerson,
        minDienTich: filterStore.minArea,
        maxDienTich: filterStore.maxArea,
        soNguoi: filterStore.capacity,
        maLpt: filterStore.categoryId,
        dsTienIch: filterStore.selectedAmenities,
        page: 0,
        size: 100,
        sortBy: sortField,
        sortDirection,
      });
      return res.content || [];
    },
  });

  const activeCenterCoords = useMemo(() => {
    if (gpsCoords) return gpsCoords;
    const sourceList = rooms.length > 0 ? rooms : catalogRooms;
    if (sourceList.length > 0) {
      const firstValid = getValidCoords(sourceList[0]);
      if (firstValid) return firstValid;
    }
    return { lat: 21.0285, lng: 105.8542 };
  }, [gpsCoords, rooms, catalogRooms]);

  const roomsWithDistance = useMemo(() => {
    return rooms.map((room) => {
      const coords = getValidCoords(room);
      const distanceFromUserKm = coords
        ? getDistanceInKm(activeCenterCoords.lat, activeCenterCoords.lng, coords.lat, coords.lng)
        : null;
      return { room, coords, distanceFromUserKm };
    });
  }, [rooms, activeCenterCoords]);

  const filteredRooms = useMemo(() => {
    const results: Array<{ room: RoomSummaryResponse; distanceInKm: number | null }> = [];
    for (const item of roomsWithDistance) {
      if (!item.coords) continue;

      if (
        !mapBounds ||
        (item.coords.lat >= mapBounds.south &&
          item.coords.lat <= mapBounds.north &&
          item.coords.lng >= mapBounds.west &&
          item.coords.lng <= mapBounds.east)
      ) {
        results.push({
          room: item.room,
          distanceInKm: item.distanceFromUserKm,
        });
      }
    }
    return sortRoomsByOption(results, (item) => item.room, sortBy);
  }, [roomsWithDistance, mapBounds, sortBy]);

  const scannedRooms = useMemo(() => filteredRooms.map((item) => item.room), [filteredRooms]);

  const activeSelectedEntry = useMemo(() => {
    if (!selectedRoomId) return null;
    return filteredRooms.find((item) => item.room.maPhongTro === selectedRoomId) ?? null;
  }, [filteredRooms, selectedRoomId]);

  const activeSelectedRoom = activeSelectedEntry?.room ?? null;

  const { data: selectedRoomDetail, isLoading: isSelectedDetailLoading } = useQuery({
    queryKey: ['room', 'detail', activeSelectedRoom?.maPhongTro],
    queryFn: () => roomService.getRoomDetail(activeSelectedRoom!.maPhongTro),
    enabled: Boolean(activeSelectedRoom?.maPhongTro),
    staleTime: 5 * 60 * 1000,
  });

  const handleSelectRoom = useCallback(
    (room: RoomSummaryResponse) => {
      setSelectedRoomId(room.maPhongTro);
    },
    [setSelectedRoomId],
  );

  const handleClearSelectedRoom = useCallback(() => {
    setSelectedRoomId(null);
  }, [setSelectedRoomId]);

  const handleLocateUser = useCallback(() => {
    setSelectedRoomId(null);
    if (gpsCoords) {
      setLocateTrigger((c) => c + 1);
    }
    if (!navigator.geolocation) {
      toast.error('Trình duyệt của bạn không hỗ trợ định vị GPS.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation(pos.coords.latitude, pos.coords.longitude);
        setLocateTrigger((c) => c + 1);
        setIsLocating(false);
        toast.success('Đã di chuyển tới vị trí hiện tại của bạn');
      },
      () => {
        setLocateTrigger((c) => c + 1);
        toast.warning('Không thể lấy GPS mới. Đã đưa bản đồ về tâm vị trí hiện tại.');
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }, [gpsCoords, setSelectedRoomId, setUserLocation]);

  const handleResetFilters = () => {
    filterStore.resetFilter();
    setActivePopover(null);
  };

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

  const capacityLabel = filterStore.capacity ? `Từ ${filterStore.capacity} người` : 'Số người';
  const amenityCount = filterStore.selectedAmenities.length;
  const hasAnyActiveFilter = filterStore.getActiveFilterCount() > 0;

  return (
    <div className="flex-1 bg-slate-50 flex flex-col w-full h-full min-h-0 overflow-hidden">
      {/* THANH CÔNG CỤ BẢN ĐỒ: CHUYỂN CHẾ ĐỘ + BỘ LỌC + SẮP XẾP */}
      <section
        ref={popoverBarRef}
        className="bg-white border-b border-slate-200 py-2.5 z-30 shrink-0"
      >
        <div className="max-w-[1360px] w-full mx-auto px-4 sm:px-6 flex flex-col lg:flex-row lg:flex-nowrap lg:items-center lg:justify-between gap-2">
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-1 xl:gap-1.5 w-full lg:flex-1 lg:min-w-0">
            {/* 0. Thanh tìm kiếm vị trí theo nhu cầu */}
            <div ref={locationSearchRef} className="relative w-full sm:w-64 lg:flex-1 lg:min-w-[145px] lg:max-w-[235px]">
              <form onSubmit={handleLocationSearchSubmit} className="relative flex items-center">
                <input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocationQuery(val);
                    if (val.trim().length < 2) {
                      setLocationSuggestions([]);
                      setShowLocationSuggestions(false);
                    }
                  }}
                  onFocus={() => {
                    setActivePopover(null);
                    if (locationSuggestions.length > 0) {
                      setShowLocationSuggestions(true);
                    }
                  }}
                  placeholder="Tìm vị trí (đường, quận, thành phố...)"
                  aria-label="Tìm vị trí trên bản đồ"
                  className={`w-full h-9 pl-3.5 ${
                    locationQuery ? 'pr-16' : 'pr-10'
                  } bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-teal-600 outline-none transition-colors placeholder:text-slate-500`}
                />
                {locationQuery && (
                  <button
                    type="button"
                    aria-label="Xóa từ khóa tìm vị trí"
                    onClick={() => {
                      setLocationQuery('');
                      setLocationSuggestions([]);
                      setShowLocationSuggestions(false);
                    }}
                    className="absolute right-9 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  aria-label="Tìm vị trí"
                  title="Tìm vị trí"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50 flex items-center justify-center transition-colors cursor-pointer"
                >
                  {isGeocoding ? (
                    <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </button>
              </form>

              {showLocationSuggestions && locationSuggestions.length > 0 && (
                <div className="fixed inset-x-4 mt-2 sm:inset-x-auto sm:absolute sm:left-0 sm:w-80 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  <div className="px-3.5 py-1.5 bg-slate-50 text-[11px] font-semibold text-slate-500">
                    Gợi ý địa điểm (Bấm để di chuyển bản đồ)
                  </div>
                  {locationSuggestions.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => handleSelectLocationSuggestion(item)}
                      className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-teal-50/70 hover:text-teal-900 transition-colors flex items-start gap-3 cursor-pointer group"
                    >
                      <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-xs truncate">
                          {item.title}
                        </p>
                        {item.subtitle && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 1. Chip Giá */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActivePopover((p) => (p === 'price' ? null : 'price'))}
                className={`inline-flex items-center gap-1 h-8 sm:h-9 px-2 xl:px-2.5 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  hasPriceFilter || activePopover === 'price'
                    ? 'bg-teal-50 text-teal-800 border-teal-500'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="max-w-[82px] xl:max-w-[104px] truncate">{priceLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
              </button>

              {activePopover === 'price' && (
                <div className="fixed inset-x-4 mt-2 sm:inset-x-auto sm:absolute sm:left-0 sm:w-72 bg-white rounded-2xl border border-slate-200 shadow-lg p-3 z-50 space-y-1">
                  {priceOptions.map((option) => {
                    const selected =
                      filterStore.minPrice === option.min && filterStore.maxPrice === option.max;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => {
                          filterStore.setPriceRange(option.min, option.max);
                          setActivePopover(null);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer ${
                          selected
                            ? 'bg-teal-50 text-teal-800 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{option.label}</span>
                        {selected && <Check className="w-4 h-4 text-teal-700 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 1b. Chip Điện / Nước */}
            <UtilityFilterPopover
              isOpen={activePopover === 'utility'}
              onToggle={() => setActivePopover((p) => (p === 'utility' ? null : 'utility'))}
              onClose={() => setActivePopover(null)}
              value={{
                minElectricityPrice: filterStore.minElectricityPrice,
                maxElectricityPrice: filterStore.maxElectricityPrice,
                minWaterPrice: filterStore.minWaterPrice,
                maxWaterPrice: filterStore.maxWaterPrice,
                waterByPerson: filterStore.waterByPerson,
              }}
              onApply={(next) => {
                filterStore.setElectricityRange(next.minElectricityPrice, next.maxElectricityPrice);
                filterStore.setWaterFilter(
                  next.minWaterPrice,
                  next.maxWaterPrice,
                  next.waterByPerson,
                );
              }}
              buttonPaddingClass="px-2 xl:px-2.5"
            />

            {/* 2. Chip Loại phòng */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActivePopover((p) => (p === 'category' ? null : 'category'))}
                className={`inline-flex items-center gap-1 h-8 sm:h-9 px-2 xl:px-2.5 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  filterStore.categoryId || activePopover === 'category'
                    ? 'bg-teal-50 text-teal-800 border-teal-500'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="max-w-[82px] xl:max-w-[104px] truncate">{categoryLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
              </button>

              {activePopover === 'category' && (
                <div className="fixed inset-x-4 mt-2 sm:inset-x-auto sm:absolute sm:left-0 sm:w-64 bg-white rounded-2xl border border-slate-200 shadow-lg p-3 z-50 space-y-1 max-h-72 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      filterStore.setCategoryId(undefined);
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
                          filterStore.setCategoryId(code);
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
                className={`inline-flex items-center gap-1 h-8 sm:h-9 px-2 xl:px-2.5 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  hasAreaFilter || activePopover === 'area'
                    ? 'bg-teal-50 text-teal-800 border-teal-500'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="max-w-[78px] xl:max-w-[100px] truncate">{areaLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
              </button>

              {activePopover === 'area' && (
                <div className="fixed inset-x-4 mt-2 sm:inset-x-auto sm:absolute sm:left-0 sm:w-68 bg-white rounded-2xl border border-slate-200 shadow-lg p-3 z-50 space-y-1">
                  {areaOptions.map((option) => {
                    const selected =
                      filterStore.minArea === option.min && filterStore.maxArea === option.max;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => {
                          filterStore.setAreaRange(option.min, option.max);
                          setActivePopover(null);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer ${
                          selected
                            ? 'bg-teal-50 text-teal-800 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{option.label}</span>
                        {selected && <Check className="w-4 h-4 text-teal-700 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3b. Chip Số người */}
            {capacityOptions.length > 1 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActivePopover((p) => (p === 'capacity' ? null : 'capacity'))}
                  className={`inline-flex items-center gap-1 h-8 sm:h-9 px-2 xl:px-2.5 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                    filterStore.capacity !== undefined || activePopover === 'capacity'
                      ? 'bg-teal-50 text-teal-800 border-teal-500'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="max-w-[74px] xl:max-w-[92px] truncate">{capacityLabel}</span>
                  <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                </button>

                {activePopover === 'capacity' && (
                  <div className="fixed inset-x-4 mt-2 sm:inset-x-auto sm:absolute sm:left-0 sm:w-60 bg-white rounded-2xl border border-slate-200 shadow-lg p-3 z-50 space-y-1">
                    {capacityOptions.map((option) => {
                      const selected = filterStore.capacity === option.value;
                      return (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => {
                            filterStore.setCapacity(option.value);
                            setActivePopover(null);
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer ${
                            selected
                              ? 'bg-teal-50 text-teal-800 font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate">{option.label}</span>
                          {selected && <Check className="w-4 h-4 text-teal-700 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 4. Chip Tiện ích */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActivePopover((p) => (p === 'amenities' ? null : 'amenities'))}
                className={`inline-flex items-center gap-1 h-8 sm:h-9 px-2 xl:px-2.5 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  amenityCount > 0 || activePopover === 'amenities'
                    ? 'bg-teal-50 text-teal-800 border-teal-500'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{amenityCount > 0 ? `Tiện ích (${amenityCount})` : 'Tiện ích'}</span>
                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
              </button>

              {activePopover === 'amenities' && (
                <div className="fixed inset-x-4 mt-2 sm:inset-x-auto sm:absolute sm:left-0 sm:w-72 bg-white rounded-2xl border border-slate-200 shadow-lg p-3 z-50 space-y-2">
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
                            filterStore.setSelectedAmenities(next);
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
                        onClick={() => filterStore.setSelectedAmenities([])}
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

            <div className="relative">
              {(() => {
                const currentSortLabel =
                  ROOM_SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label ?? 'Mới nhất';
                return (
                  <button
                    type="button"
                    aria-label={`Sắp xếp: ${currentSortLabel}`}
                    title={`Sắp xếp: ${currentSortLabel}`}
                    aria-expanded={activePopover === 'sort'}
                    onClick={() => setActivePopover((p) => (p === 'sort' ? null : 'sort'))}
                    className={`inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full border transition-colors cursor-pointer shrink-0 ${
                      sortBy !== 'NEWEST' || activePopover === 'sort'
                        ? 'bg-teal-50 text-teal-800 border-teal-500'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                );
              })()}

              {activePopover === 'sort' && (
                <div className="fixed inset-x-4 mt-2 sm:inset-x-auto sm:absolute sm:left-0 sm:w-56 bg-white rounded-2xl border border-slate-200 shadow-lg p-2 z-50 space-y-1">
                  {ROOM_SORT_OPTIONS.map((option) => {
                    const selected = sortBy === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setSortBy(option.value);
                          setActivePopover(null);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium cursor-pointer ${
                          selected
                            ? 'bg-teal-50 text-teal-800 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{option.label}</span>
                        {selected && <Check className="w-4 h-4 text-teal-700 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {hasAnyActiveFilter && (
              <button
                type="button"
                onClick={handleResetFilters}
                title="Xóa bộ lọc"
                aria-label="Xóa bộ lọc"
                className="inline-flex items-center gap-1 h-8 sm:h-9 px-2 rounded-full text-[11px] sm:text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer whitespace-nowrap shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                <span>Xóa</span>
              </button>
            )}
          </div>

          <div className="flex justify-end w-full lg:w-auto lg:ml-auto shrink-0">
            <SearchModeTabs activeMode="map" />
          </div>
        </div>
      </section>

      {/* SPLIT 38/62 (DESKTOP) & LIST/MAP TOGGLE (MOBILE) */}
      <div className="flex-1 w-full max-w-[1360px] mx-auto min-h-0 lg:px-6 lg:py-4 overflow-hidden">
        <div className="w-full h-full min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,38fr)_minmax(0,62fr)] grid-rows-[minmax(0,1fr)] lg:gap-4 overflow-hidden">
          {/* CỘT TRÁI (38%): DANH SÁCH CARD NHỎ KHI QUÉT & CARD CHI TIẾT KHI CHỌN PHÒNG */}
          <div
            className={`${
              mobileView === 'map' ? 'hidden lg:flex' : 'flex'
            } flex-col h-full min-h-0 bg-slate-50 lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-xs overflow-hidden`}
          >
            <div className="shrink-0 px-4 sm:px-5 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-2">
              {activeSelectedEntry ? (
                <button
                  type="button"
                  onClick={handleClearSelectedRoom}
                  className="inline-flex items-center gap-2 text-sm font-bold text-slate-800 hover:text-teal-700 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 shrink-0" />
                  <span>Quay lại danh sách ({filteredRooms.length})</span>
                </button>
              ) : (
                <h1 className="text-base font-bold text-slate-900">
                  Tìm thấy {filteredRooms.length} phòng trong khu vực
                </h1>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 overscroll-contain">
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
                <SkeletonList variant="cards" count={3} columnsClassName="grid-cols-1" />
              ) : activeSelectedEntry ? (
                <MapRoomDetailCard
                  key={activeSelectedEntry.room.maPhongTro}
                  room={activeSelectedEntry.room}
                  detail={selectedRoomDetail}
                  isDetailLoading={isSelectedDetailLoading}
                  distanceInKm={activeSelectedEntry.distanceInKm}
                  isSelected
                  isHighlighted={hoveredRoomId === activeSelectedEntry.room.maPhongTro}
                  onSelect={handleSelectRoom}
                  onHoverChange={setHoveredRoomId}
                />
              ) : filteredRooms.length > 0 ? (
                <div className="space-y-2.5">
                  {filteredRooms.map(({ room, distanceInKm }) => {
                    const thumb =
                      room.anhDaiDien ||
                      (room.hinhAnh && room.hinhAnh.length > 0 ? room.hinhAnh[0].duongDan : null) ||
                      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500';
                    const cardTitle =
                      room.tieuDe ||
                      `${room.tenLoaiPhong || 'Phòng trọ'} - ${room.diaChi.split(',')[0] || ''}`;
                    const isHovered = hoveredRoomId === room.maPhongTro;

                    return (
                      <div
                        key={room.maPhongTro}
                        onClick={() => handleSelectRoom(room)}
                        onMouseEnter={() => setHoveredRoomId(room.maPhongTro)}
                        onMouseLeave={() => setHoveredRoomId(null)}
                        className={`group bg-white rounded-2xl border p-2.5 flex items-center gap-3 cursor-pointer transition-all ${
                          isHovered
                            ? 'border-teal-600 ring-4 ring-teal-500/20 shadow-[0_10px_22px_rgba(13,148,136,0.25)] -translate-y-0.5'
                            : 'border-slate-200/90 shadow-xs hover:border-teal-600'
                        }`}
                      >
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                          <img
                            src={thumb}
                            alt={cardTitle}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700 text-[10px] font-bold truncate">
                              {distanceInKm !== null
                                ? `Cách ${distanceInKm.toFixed(1)} km`
                                : room.tenLoaiPhong || 'Phòng trọ'}
                            </span>
                            <span className="text-[11px] text-slate-400 shrink-0">
                              {room.dienTich} m²
                            </span>
                          </div>

                          <h4 className="font-bold text-slate-900 text-xs line-clamp-1 group-hover:text-teal-700 transition-colors">
                            {cardTitle}
                          </h4>

                          <p className="text-xs font-extrabold text-teal-700 mt-0.5">
                            {formatVNDShort(room.giaThue)}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            Điện: {formatElectricityPrice(room.giaDien)} · Nước:{' '}
                            {formatWaterPrice(room.giaNuoc)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/room/${room.maPhongTro}`);
                          }}
                          title="Xem trang chi tiết"
                          aria-label="Xem trang chi tiết"
                          className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title="Chưa có phòng trong khu vực"
                  description="Hãy kéo/thu nhỏ bản đồ hoặc tìm kiếm vị trí khác để xem thêm phòng."
                  action={
                    <AppButton variant="primary" size="md" onClick={handleResetFilters}>
                      Xóa bộ lọc
                    </AppButton>
                  }
                />
              )}
            </div>
          </div>

          {/* CỘT PHẢI (62%): BẢN ĐỒ TƯƠNG TÁC */}
          <div
            className={`${
              mobileView === 'list' ? 'hidden lg:block' : 'block'
            } h-full w-full bg-slate-100 lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-xs relative overflow-hidden`}
          >
            <RoomMap
              rooms={scannedRooms}
              selectedRoom={activeSelectedRoom}
              hoveredRoomId={hoveredRoomId}
              onSelectRoom={handleSelectRoom}
              onHoverRoom={setHoveredRoomId}
              userCoords={activeCenterCoords}
              onLocateUser={handleLocateUser}
              isLocating={isLocating}
              locateTrigger={locateTrigger}
              interactivePreview={false}
              onMapClick={handleClearSelectedRoom}
              initialViewport={mapViewport}
              onViewportChange={setMapViewport}
              onBoundsChange={handleBoundsChange}
              focusTarget={focusTarget}
            />
          </div>
        </div>
      </div>

      {/* NÚT NỔI CHUYỂN VIEW BẢN ĐỒ <-> DANH SÁCH TRÊN MOBILE */}
      <div className="lg:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-30">
        <button
          type="button"
          onClick={() => setMobileView(mobileView === 'list' ? 'map' : 'list')}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-lg cursor-pointer"
        >
          {mobileView === 'map' ? (
            <>
              <List className="w-4 h-4" />
              <span>Danh sách ({filteredRooms.length})</span>
            </>
          ) : (
            <>
              <MapIcon className="w-4 h-4" />
              <span>Bản đồ</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
