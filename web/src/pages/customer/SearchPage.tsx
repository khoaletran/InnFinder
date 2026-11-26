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

interface NumericBracketOption {
  label: string;
  min?: number;
  max?: number;
  count: number;
}

function formatMillions(amount: number): string {
  const millions = amount / 1_000_000;
  return `${Number.isInteger(millions) ? millions : millions.toFixed(1).replace('.', ',')}tr`;
}

function buildNumericBrackets(
  rawValues: number[],
  step: number,
  allLabel: string,
  formatSingle: (n: number) => string,
  formatUnder: (n: number) => string,
  formatRange: (a: number, b: number) => string,
  formatOver: (n: number) => string,
): NumericBracketOption[] {
  const sorted = [...rawValues].filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  const allOption: NumericBracketOption = { label: allLabel, count: sorted.length };
  if (sorted.length === 0) return [allOption];

  const minVal = sorted[0];
  const maxVal = sorted[sorted.length - 1];
  if (minVal === maxVal) {
    return [allOption, { label: formatSingle(minVal), min: minVal, max: minVal, count: sorted.length }];
  }

  const rawSplits = [0.25, 0.5, 0.75]
    .map((q) => Math.round(sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)))] / step) * step)
    .filter((b) => b > minVal && b < maxVal);
  const splits = Array.from(new Set(rawSplits)).sort((a, b) => a - b);

  if (splits.length === 0) {
    const mid = Math.round((minVal + maxVal) / 2 / step) * step;
    if (mid > minVal && mid < maxVal) {
      splits.push(mid);
    } else {
      return [
        allOption,
        { label: formatRange(minVal, maxVal), min: minVal, max: maxVal, count: sorted.length },
      ];
    }
  }

  const segments: Array<{ min?: number; max?: number; label: string }> = [
    { min: undefined, max: splits[0], label: formatUnder(splits[0]) },
  ];
  for (let i = 0; i < splits.length - 1; i++) {
    segments.push({
      min: splits[i],
      max: splits[i + 1],
      label: formatRange(splits[i], splits[i + 1]),
    });
  }
  const lastSplit = splits[splits.length - 1];
  segments.push({ min: lastSplit, max: undefined, label: formatOver(lastSplit) });

  const dynamicOptions = segments
    .map((seg) => ({
      ...seg,
      count: sorted.filter(
        (v) => (seg.min === undefined || v >= seg.min) && (seg.max === undefined || v <= seg.max),
      ).length,
    }))
    .filter((opt) => opt.count > 0);

  return [allOption, ...dynamicOptions];
}

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
  const hasTextQuery = submittedKeyword.trim().length > 0;
  const isAreaSearch = searchParams.get('mode') === 'area';

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

  // Tải danh sách phòng thực tế trong hệ thống để dựng các option bộ lọc động (không hardcode)
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
        keyword: submittedKeyword,
        isAreaSearch,
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
      const trimmed = submittedKeyword.trim();
      if (trimmed && !isAreaSearch) {
        try {
          const result = await roomService.aiSearchWithDetails(trimmed, {
            minGia: filterStore.minPrice,
            maxGia: filterStore.maxPrice,
            minDienTich: filterStore.minArea,
            maxDienTich: filterStore.maxArea,
            soNguoi: filterStore.capacity,
            maLpt: filterStore.categoryId,
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
        } catch {
          // Graceful fallback về tìm kiếm từ khóa + bộ lọc DB nếu AI tạm gián đoạn
        }
      }
      const sortField = sortBy === 'NEWEST' ? 'thoiGianDang' : 'giaThue';
      const sortDirection = sortBy === 'PRICE_ASC' ? ('ASC' as const) : ('DESC' as const);
      const res = await roomService.searchRooms({
        keyword: isAreaSearch ? undefined : trimmed || undefined,
        area: isAreaSearch ? trimmed : undefined,
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
    const sourceList = rooms.length > 0 ? rooms : catalogRooms;
    if (sourceList.length > 0) {
      const firstValid = getValidCoords(sourceList[0]);
      if (firstValid) return firstValid;
    }
    return { lat: 21.0285, lng: 105.8542 };
  }, [gpsCoords, rooms, catalogRooms]);

  // Các mốc bán kính động dựa theo khoảng cách thực tế của các phòng trong dữ liệu
  const radiusOptions = useMemo(() => {
    const dists = catalogRooms
      .map((r) => {
        const c = getValidCoords(r);
        return c ? getDistanceInKm(activeCenterCoords.lat, activeCenterCoords.lng, c.lat, c.lng) : null;
      })
      .filter((d): d is number => d !== null && Number.isFinite(d))
      .sort((a, b) => a - b);

    if (dists.length === 0) return [];

    const milestones = Array.from(
      new Set(
        dists.map((d) => {
          if (d <= 1) return 1;
          if (d <= 5) return Math.ceil(d);
          return Math.ceil(d / 5) * 5;
        }),
      ),
    ).sort((a, b) => a - b);

    const options: Array<{ km: number; label: string; count: number }> = [];
    let prevCount = 0;
    for (const km of milestones) {
      const count = dists.filter((d) => d <= km).length;
      if (count > prevCount) {
        options.push({ km, label: `Trong ${km} km`, count });
        prevCount = count;
        if (options.length >= 6) break;
      }
    }
    return options;
  }, [catalogRooms, activeCenterCoords]);

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
  const useRadiusFilter = !hasTextQuery || filterStore.radiusKm !== undefined;

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
      setSearchParams({ keyword: trimmed });
    } else {
      setSearchParams({});
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
    const nextOption = radiusOptions.find(
      (opt) => !filterStore.radiusKm || opt.km > filterStore.radiusKm,
    );
    if (nextOption && (!filterStore.radiusKm || filterStore.radiusKm < nextOption.km)) {
      filterStore.setRadiusKm(nextOption.km);
      toast.info(`Đã mở rộng phạm vi tìm kiếm lên ${nextOption.km} km quanh khu vực hiện tại`);
    } else {
      filterStore.setRadiusKm(undefined);
      toast.info('Đã chuyển về bán kính tự động theo bản đồ');
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
      {/* THANH LỌC DẠNG CHIP NẰM NGANG CĂN THẲNG HÀNG VỚI HEADER & BREADCRUMB */}
      <section
        ref={popoverBarRef}
        className="bg-white border-b border-slate-200 py-3 z-30 shrink-0"
      >
        <div className="max-w-[1200px] w-full mx-auto px-4 sm:px-6 flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Ô tìm kiếm tích hợp sẵn AI ngôn ngữ tự nhiên */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 lg:w-[440px] shrink-0">
            <div className="flex-1 relative flex items-center">
              <div className="absolute left-3.5 text-teal-600">
                <Sparkles className={`w-4 h-4 ${isFetching && hasTextQuery ? 'animate-spin' : ''}`} />
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInputDraft(e.target.value)}
                placeholder="Mô tả phòng cần tìm bằng ngôn ngữ tự nhiên (VD: Gò Vấp dưới 3tr có máy lạnh)..."
                className="w-full h-10 pl-10 pr-4 bg-slate-50 focus:bg-white text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-teal-600 outline-none transition-colors placeholder:text-slate-500"
              />
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
                          setCurrentPage(0);
                          setActivePopover(null);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer ${
                          selected
                            ? 'bg-teal-50 text-teal-800 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{option.label}</span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs text-slate-400">{option.count} phòng</span>
                          {selected && <Check className="w-4 h-4 text-teal-700" />}
                        </span>
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
                          setCurrentPage(0);
                          setActivePopover(null);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer ${
                          selected
                            ? 'bg-teal-50 text-teal-800 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{option.label}</span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs text-slate-400">{option.count} phòng</span>
                          {selected && <Check className="w-4 h-4 text-teal-700" />}
                        </span>
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
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-lg p-3 z-50 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      filterStore.setRadiusKm(undefined);
                      setCurrentPage(0);
                      setActivePopover(null);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm cursor-pointer ${
                      !filterStore.radiusKm
                        ? 'bg-teal-50 text-teal-800 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>Tự động theo bản đồ</span>
                    {!filterStore.radiusKm && <Check className="w-4 h-4 text-teal-700" />}
                  </button>
                  {radiusOptions.map((opt) => (
                    <button
                      key={opt.km}
                      type="button"
                      onClick={() => {
                        filterStore.setRadiusKm(opt.km);
                        setCurrentPage(0);
                        setActivePopover(null);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm cursor-pointer ${
                        filterStore.radiusKm === opt.km
                          ? 'bg-teal-50 text-teal-800 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{opt.label}</span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-slate-400">{opt.count} phòng</span>
                        {filterStore.radiusKm === opt.km && (
                          <Check className="w-4 h-4 text-teal-700" />
                        )}
                      </span>
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

      {/* SPLIT 54/46 TRONG KHUNG CĂN GIỮA MAX-W-[1360PX] (DESKTOP) & LIST/MAP TOGGLE (MOBILE) */}
      <div className="flex-1 w-full max-w-[1360px] mx-auto min-h-0 lg:px-6 lg:py-4 overflow-hidden">
        <div className="w-full h-full min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,54fr)_minmax(0,46fr)] grid-rows-[minmax(0,1fr)] lg:gap-4 overflow-hidden">
          {/* CỘT TRÁI (54%): DANH SÁCH CARD ẢNH LỚN */}
          <div
            className={`${
              mobileView === 'map' ? 'hidden lg:flex' : 'flex'
            } flex-col h-full min-h-0 bg-slate-50 lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-xs overflow-hidden`}
          >
          <div className="shrink-0 px-4 sm:px-6 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-2">
            <div>
              <h1 className="text-base font-bold text-slate-900">
                {filteredRooms.length} phòng phù hợp
                {submittedKeyword ? ` · "${submittedKeyword}"` : ''}
              </h1>
              <p className="text-xs text-slate-600">
                {hasTextQuery && queryResult?.searchMode === 'FILTERED'
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

        {/* CỘT PHẢI (46%): BẢN ĐỒ TƯƠNG TÁC */}
        <div
          className={`${
            mobileView === 'list' ? 'hidden lg:block' : 'block'
          } h-full w-full bg-slate-100 lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-xs relative overflow-hidden`}
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
