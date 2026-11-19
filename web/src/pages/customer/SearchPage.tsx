import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { RoomMap } from '@/components/map/RoomMap';
import { RoomCard } from '@/components/room/RoomCard';
import { roomService } from '@/services/room.service';
import { useRoomFilterStore } from '@/store/useRoomFilterStore';
import type { RoomSummaryResponse } from '@/types/room.types';
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
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterStore = useRoomFilterStore();

  const [manualKeyword, setManualKeyword] = useState(
    () => searchParams.get('keyword') || filterStore.keyword || '',
  );
  const [searchInputDraft, setSearchInputDraft] = useState<string | null>(null);
  const submittedKeyword = searchParams.get('keyword') ?? manualKeyword;
  const searchInput = searchInputDraft ?? submittedKeyword;

  const [useAiSearch, setUseAiSearch] = useState(() => searchParams.get('ai') === '1');
  const [currentPage, setCurrentPage] = useState(0);
  const [activePopover, setActivePopover] = useState<ActivePopover>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomSummaryResponse | null>(null);
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');

  const popoverBarRef = useRef<HTMLDivElement>(null);

  // Bán kính quét động (km) tự động thay đổi theo mức độ mở rộng / thu nhỏ của bản đồ
  const [dynamicRadiusKm, setDynamicRadiusKm] = useState<number>(5);

  // Vị trí GPS thật khi người dùng bấm định vị hoặc cấp quyền
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(
    filterStore.userLat && filterStore.userLng
      ? { lat: filterStore.userLat, lng: filterStore.userLng }
      : null,
  );
  const [isLocating, setIsLocating] = useState(false);
  const [locateTrigger, setLocateTrigger] = useState(0);
  const [sortBy, setSortBy] = useState<'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC'>('NEWEST');

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (popoverBarRef.current && !popoverBarRef.current.contains(e.target as Node)) {
        setActivePopover(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Tự động nhận diện GPS thực tế của người dùng khi vừa mở trang
  const setUserLocation = filterStore.setUserLocation;
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsCoords(coords);
        setUserLocation(coords.lat, coords.lng);
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

  const {
    data: queryResult,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'rooms',
      'search',
      {
        useAiSearch,
        keyword: submittedKeyword,
        minPrice: filterStore.minPrice,
        maxPrice: filterStore.maxPrice,
        minArea: filterStore.minArea,
        maxArea: filterStore.maxArea,
        capacity: filterStore.capacity,
        categoryId: filterStore.categoryId,
        selectedAmenities: filterStore.selectedAmenities,
        currentPage,
        sortBy,
      },
    ],
    queryFn: async () => {
      if (useAiSearch && submittedKeyword.trim()) {
        const result = await roomService.aiSearchWithDetails(submittedKeyword.trim(), {
          minGia: filterStore.minPrice, maxGia: filterStore.maxPrice,
          minDienTich: filterStore.minArea, maxDienTich: filterStore.maxArea,
          soNguoi: filterStore.capacity, maLpt: filterStore.categoryId,
          dsTienIch: filterStore.selectedAmenities,
          sortBy: sortBy === 'NEWEST' ? undefined : 'giaThue',
          sortDirection: sortBy === 'PRICE_ASC' ? 'ASC' : 'DESC',
        });
        const content = result.rooms || [];
        return {
          content,
          totalElements: content.length,
          totalPages: 1,
          searchMode: result.searchMode,
        };
      }
      const sortField = sortBy === 'NEWEST' ? 'thoiGianDang' : 'giaThue';
      const sortDirection = sortBy === 'PRICE_ASC' ? ('ASC' as const) : ('DESC' as const);
      const res = await roomService.searchRooms({
        keyword: submittedKeyword.trim() || undefined,
        minGia: filterStore.minPrice,
        maxGia: filterStore.maxPrice,
        minDienTich: filterStore.minArea,
        maxDienTich: filterStore.maxArea,
        soNguoi: filterStore.capacity,
        maLpt: filterStore.categoryId,
        dsTienIch: filterStore.selectedAmenities,
        page: currentPage,
        size: 50,
        sortBy: sortField,
        sortDirection,
      });
      return {
        content: res.content || [],
        totalElements: res.totalElements || (res.content || []).length,
        totalPages: res.totalPages || 1,
        searchMode: 'FILTERED' as const,
      };
    },
  });

  const rooms = useMemo(() => queryResult?.content ?? [], [queryResult?.content]);
  const totalElements = queryResult?.totalElements || 0;
  const totalPages = queryResult?.totalPages || 1;

  // 3. Tâm quét hiệu lực: Ưu tiên GPS thật, nếu chưa có thì tự động căn vào phòng đầu tiên đang xem
  const activeCenterCoords = useMemo(() => {
    if (gpsCoords) return gpsCoords;
    if (rooms.length > 0) {
      const firstValid = getValidCoords(rooms[0]);
      if (firstValid) return firstValid;
    }
    return { lat: 21.0285, lng: 105.8542 };
  }, [gpsCoords, rooms]);

  // Tính khoảng cách từng phòng so với chấm tròn vị trí hiện tại
  const roomsWithDistance = useMemo(() => {
    return rooms.map((room) => {
      let distanceInKm: number | null = null;
      if (activeCenterCoords) {
        const coords = getValidCoords(room);
        if (coords) {
          distanceInKm = getDistanceInKm(
            activeCenterCoords.lat,
            activeCenterCoords.lng,
            coords.lat,
            coords.lng,
          );
        }
      }
      return { room, distanceInKm };
    });
  }, [rooms, activeCenterCoords]);

  // Bán kính hiệu lực: Nếu người dùng cố định trong modal thì lấy giá trị đó, ngược lại lấy bán kính động theo bản đồ
  const effectiveRadius = filterStore.radiusKm ?? dynamicRadiusKm;
  // Natural-language searches may name a different city; only restrict by GPS when explicitly requested.
  const useRadiusFilter = !useAiSearch || filterStore.radiusKm !== undefined;

  // Lọc CHỈ lấy các phòng nằm trong phạm vi vòng tròn quét hiện tại (chưa quét tới thì không hiện)
  const filteredRooms = useMemo(() => {
    if (!useRadiusFilter || !activeCenterCoords) return roomsWithDistance;
    return roomsWithDistance.filter((item) => {
      if (item.distanceInKm === null) return false;
      return item.distanceInKm <= effectiveRadius;
    });
  }, [roomsWithDistance, effectiveRadius, activeCenterCoords, useRadiusFilter]);

  const scannedRooms = useMemo(() => filteredRooms.map((item) => item.room), [filteredRooms]);

  const activeSelectedRoom = useMemo(() => {
    if (selectedRoom && scannedRooms.some((r) => r.maPhongTro === selectedRoom.maPhongTro)) {
      return selectedRoom;
    }
    return null;
  }, [scannedRooms, selectedRoom]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    filterStore.setKeyword(trimmed);
    setManualKeyword(trimmed);
    setSearchInputDraft(null);
    setCurrentPage(0);
    setActivePopover(null);
    if (trimmed) {
      setSearchParams({ keyword: trimmed, ...(useAiSearch ? { ai: '1' } : {}) });
    } else {
      setSearchParams(useAiSearch ? { ai: '1' } : {});
    }
  };

  const handleLocateUser = () => {
    setSelectedRoom(null);
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
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsCoords(coords);
        setUserLocation(coords.lat, coords.lng);
        setLocateTrigger((c) => c + 1);
        setIsLocating(false);
        toast.success('Đã di chuyển tới vị trí hiện tại của bạn');
      },
      () => {
        if (activeCenterCoords) {
          setLocateTrigger((c) => c + 1);
        }
        toast.warning('Không thể lấy GPS mới. Đã đưa bản đồ về tâm vị trí hiện tại.');
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  const handleResetFilters = () => {
    filterStore.resetFilter();
    setManualKeyword('');
    setSearchInputDraft('');
    setSearchParams({});
    setCurrentPage(0);
    setActivePopover(null);
  };

  const handleExpandRadius = () => {
    if (!filterStore.radiusKm) {
      filterStore.setRadiusKm(15);
      toast.info('Đã mở rộng phạm vi tìm kiếm lên 15 km quanh khu vực hiện tại');
    } else if (filterStore.radiusKm < 20) {
      const nextRadius = Math.min(20, filterStore.radiusKm + 5);
      filterStore.setRadiusKm(nextRadius);
      toast.info(`Đã mở rộng bán kính lên ${nextRadius} km`);
    } else {
      filterStore.setRadiusKm(undefined);
      toast.info('Đã bỏ giới hạn bán kính để hiển thị tất cả khu vực');
    }
    setCurrentPage(0);
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
                onChange={(e) => setSearchInputDraft(e.target.value)}
                placeholder="Quận, tên đường hoặc mô tả tự nhiên..."
                className="w-full h-10 pl-10 pr-24 bg-slate-50 focus:bg-white text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-teal-600 outline-none transition-colors placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => {
                  const next = !useAiSearch;
                  setUseAiSearch(next);
                  setCurrentPage(0);
                  setSearchParams((previous) => {
                    const params = new URLSearchParams(previous);
                    if (next) params.set('ai', '1'); else params.delete('ai');
                    return params;
                  });
                }}
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
                          filterStore.setPriceRange(preset.min, preset.max);
                          setCurrentPage(0);
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
                      filterStore.setCategoryId(undefined);
                      setCurrentPage(0);
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
                          setCurrentPage(0);
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
                          filterStore.setAreaRange(preset.min, preset.max);
                          setCurrentPage(0);
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
                            filterStore.setSelectedAmenities(next);
                            setCurrentPage(0);
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
                          filterStore.setSelectedAmenities([]);
                          setCurrentPage(0);
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
                      filterStore.setRadiusKm(undefined);
                      setCurrentPage(0);
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
                        filterStore.setRadiusKm(km);
                        setCurrentPage(0);
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

            {filterStore.getActiveFilterCount() > 0 && (
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
                {filteredRooms.length} phòng phù hợp
                {submittedKeyword ? ` · "${submittedKeyword}"` : ''}
              </h1>
              <p className="text-xs text-slate-600">
                {useAiSearch && queryResult?.searchMode === 'FILTERED'
                  ? 'AI đã hiểu tiêu chí; đang gợi ý theo bộ lọc và từ khóa'
                  : 'Di chuột vào phòng hoặc giá trên bản đồ để đối chiếu vị trí'}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setSortBy((prev) =>
                  prev === 'NEWEST'
                    ? 'PRICE_ASC'
                    : prev === 'PRICE_ASC'
                      ? 'PRICE_DESC'
                      : 'NEWEST',
                )
              }
              className="h-9 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-600" />
              <span>
                {sortBy === 'NEWEST'
                  ? 'Mới nhất'
                  : sortBy === 'PRICE_ASC'
                    ? 'Giá tăng'
                    : 'Giá giảm'}
              </span>
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 overscroll-contain">
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
                  <RoomCard
                    key={room.maPhongTro}
                    room={room}
                    layout="vertical"
                    distanceInKm={distanceInKm}
                    onSelect={(r) => setSelectedRoom(r)}
                    isSelected={activeSelectedRoom?.maPhongTro === room.maPhongTro}
                    isHighlighted={hoveredRoomId === room.maPhongTro}
                    onHoverChange={setHoveredRoomId}
                  />
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
                    <AppButton variant="secondary" size="md" onClick={handleExpandRadius}>
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
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                className="h-8 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Trước
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage((p) => p + 1)}
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
            rooms={scannedRooms}
            selectedRoom={activeSelectedRoom}
            hoveredRoomId={hoveredRoomId}
            onSelectRoom={(r) => setSelectedRoom(r)}
            onHoverRoom={setHoveredRoomId}
            userCoords={useRadiusFilter ? activeCenterCoords : null}
            radiusKm={effectiveRadius}
            onRadiusChange={(r) => setDynamicRadiusKm(r)}
            onLocateUser={handleLocateUser}
            isLocating={isLocating}
            locateTrigger={locateTrigger}
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
