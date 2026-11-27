import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowUpDown,
  Check,
  ChevronDown,
  List,
  Map as MapIcon,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppButton } from '@/components/common/AppButton';
import { EmptyState } from '@/components/common/EmptyState';
import { SkeletonList } from '@/components/common/SkeletonList';
import { RoomMap } from '@/components/map/RoomMap';
import { MapRoomDetailCard } from '@/components/room/MapRoomDetailCard';
import {
  buildNumericBrackets,
  formatMillions,
  getDistanceInKm,
  ROOM_SORT_OPTIONS,
  resolveRoomSortParams,
  sortRoomsByOption,
} from '@/components/room/searchHelpers';
import { SearchModeTabs } from '@/components/room/SearchModeTabs';
import { roomService } from '@/services/room.service';
import { useRoomFilterStore } from '@/store/useRoomFilterStore';
import type { RoomSummaryResponse } from '@/types/room.types';
import { getValidCoords } from '@/utils/formatters';

type ActivePopover = 'price' | 'category' | 'area' | 'amenities' | 'sort' | null;

const PICKED_SCAN_RADIUS_KM = 15;

export const MapSearchPage: React.FC = () => {
  const filterStore = useRoomFilterStore();
  const {
    mapPickedCoords: pickedCoords,
    setMapPickedCoords: setPickedCoords,
    mapDynamicRadiusKm: dynamicRadiusKm,
    setMapDynamicRadiusKm: setDynamicRadiusKm,
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
      if (popoverBarRef.current && !popoverBarRef.current.contains(e.target as Node)) {
        setActivePopover(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
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
        minDienTich: filterStore.minArea,
        maxDienTich: filterStore.maxArea,
        soNguoi: filterStore.capacity,
        maLpt: filterStore.categoryId,
        dsTienIch: filterStore.selectedAmenities,
        page: 0,
        size: 50,
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
      const distanceFromPickedKm =
        pickedCoords && coords
          ? getDistanceInKm(pickedCoords.lat, pickedCoords.lng, coords.lat, coords.lng)
          : null;
      return { room, distanceFromUserKm, distanceFromPickedKm };
    });
  }, [rooms, activeCenterCoords, pickedCoords]);

  const effectiveRadius = dynamicRadiusKm;

  const filteredRooms = useMemo(() => {
    const results: Array<{ room: RoomSummaryResponse; distanceInKm: number | null }> = [];
    for (const item of roomsWithDistance) {
      const matchingDistances: number[] = [];
      if (item.distanceFromUserKm !== null && item.distanceFromUserKm <= effectiveRadius) {
        matchingDistances.push(item.distanceFromUserKm);
      }
      if (
        pickedCoords &&
        item.distanceFromPickedKm !== null &&
        item.distanceFromPickedKm <= PICKED_SCAN_RADIUS_KM
      ) {
        matchingDistances.push(item.distanceFromPickedKm);
      }
      if (matchingDistances.length > 0) {
        results.push({
          room: item.room,
          distanceInKm: Math.min(...matchingDistances),
        });
      }
    }
    return sortRoomsByOption(results, (item) => item.room, sortBy);
  }, [roomsWithDistance, effectiveRadius, pickedCoords, sortBy]);

  const scannedRooms = useMemo(() => filteredRooms.map((item) => item.room), [filteredRooms]);

  const detailQueries = useQueries({
    queries: scannedRooms.map((room) => ({
      queryKey: ['room', 'detail', room.maPhongTro],
      queryFn: () => roomService.getRoomDetail(room.maPhongTro),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const activeSelectedRoom = useMemo(() => {
    if (!selectedRoomId) return null;
    return scannedRooms.find((r) => r.maPhongTro === selectedRoomId) ?? null;
  }, [scannedRooms, selectedRoomId]);

  const handleSelectRoom = useCallback(
    (room: RoomSummaryResponse) => {
      setSelectedRoomId(room.maPhongTro);
    },
    [setSelectedRoomId],
  );

  const handleMapClick = useCallback(
    (coords: { lat: number; lng: number }) => {
      setPickedCoords(coords);
      setSelectedRoomId(null);
    },
    [setPickedCoords, setSelectedRoomId],
  );

  const handleClearPickedCoords = useCallback(() => {
    setPickedCoords(null);
  }, [setPickedCoords]);

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

  const amenityCount = filterStore.selectedAmenities.length;
  const hasAnyActiveFilter = filterStore.getActiveFilterCount() > 0 || pickedCoords !== null;

  return (
    <div className="flex-1 bg-slate-50 flex flex-col w-full h-full min-h-0 overflow-hidden">
      {/* THANH CÔNG CỤ BẢN ĐỒ: CHUYỂN CHẾ ĐỘ + BỘ LỌC + SẮP XẾP */}
      <section
        ref={popoverBarRef}
        className="bg-white border-b border-slate-200 py-2.5 z-30 shrink-0"
      >
        <div className="max-w-[1360px] w-full mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">

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
                <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-lg p-3 z-50 space-y-1">
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
                <div className="absolute left-0 mt-2 w-68 bg-white rounded-2xl border border-slate-200 shadow-lg p-3 z-50 space-y-1">
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
                    className={`inline-flex items-center justify-center w-9 h-9 rounded-full border transition-colors cursor-pointer shrink-0 ${
                      sortBy !== 'NEWEST' || activePopover === 'sort'
                        ? 'bg-teal-50 text-teal-800 border-teal-500'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                );
              })()}

              {activePopover === 'sort' && (
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-2xl border border-slate-200 shadow-lg p-2 z-50 space-y-1">
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
                className="inline-flex items-center gap-1 h-9 px-3 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>

          <div className="ml-auto shrink-0">
            <SearchModeTabs activeMode="map" />
          </div>
        </div>
      </section>

      {/* SPLIT 38/62 (DESKTOP) & LIST/MAP TOGGLE (MOBILE) */}
      <div className="flex-1 w-full max-w-[1360px] mx-auto min-h-0 lg:px-6 lg:py-4 overflow-hidden">
        <div className="w-full h-full min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,38fr)_minmax(0,62fr)] grid-rows-[minmax(0,1fr)] lg:gap-4 overflow-hidden">
          {/* CỘT TRÁI (38%): DANH SÁCH THẺ CHI TIẾT ĐẦY ĐỦ TRONG VÙNG QUÉT */}
          <div
            className={`${
              mobileView === 'map' ? 'hidden lg:flex' : 'flex'
            } flex-col h-full min-h-0 bg-slate-50 lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-xs overflow-hidden`}
          >
            <div className="shrink-0 px-4 sm:px-5 py-3.5 bg-white border-b border-slate-200">
              <h1 className="text-base font-bold text-slate-900">
                Tìm thấy {filteredRooms.length} phòng trong khu vực
              </h1>
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
              ) : filteredRooms.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {filteredRooms.map(({ room, distanceInKm }, idx) => {
                    const detailQuery = detailQueries[idx];
                    return (
                      <MapRoomDetailCard
                        key={room.maPhongTro}
                        room={room}
                        detail={detailQuery?.data}
                        isDetailLoading={Boolean(detailQuery?.isLoading)}
                        distanceInKm={distanceInKm}
                        isSelected={activeSelectedRoom?.maPhongTro === room.maPhongTro}
                        isHighlighted={hoveredRoomId === room.maPhongTro}
                        onSelect={handleSelectRoom}
                        onHoverChange={setHoveredRoomId}
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title="Chưa có phòng trong khu vực"
                  description="Hãy kéo/thu nhỏ bản đồ hoặc nhấn trực tiếp lên khu vực khác để quét thêm."
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
              radiusKm={effectiveRadius}
              onRadiusChange={setDynamicRadiusKm}
              onLocateUser={handleLocateUser}
              isLocating={isLocating}
              locateTrigger={locateTrigger}
              pickedCoords={pickedCoords}
              pickedRadiusKm={PICKED_SCAN_RADIUS_KM}
              onMapClick={handleMapClick}
              onClearPickedCoords={handleClearPickedCoords}
              initialViewport={mapViewport}
              onViewportChange={setMapViewport}
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
