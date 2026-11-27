import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@heroui/react';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpDown,
  Calendar,
  Check,
  ChevronDown,
  Heart,
  Search,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AppButton } from '@/components/common/AppButton';
import { EmptyState } from '@/components/common/EmptyState';
import { PageContainer } from '@/components/common/PageContainer';
import {
  buildCapacityOptions,
  buildNumericBrackets,
  formatMillions,
  matchesProvinceAddress,
  ROOM_SORT_OPTIONS,
  sortRoomsByOption,
  VIETNAM_PROVINCES,
} from '@/components/room/searchHelpers';
import { roomService } from '@/services/room.service';
import { useAuthStore } from '@/store/useAuthStore';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import type { MapSortOption } from '@/store/useRoomFilterStore';
import type { RoomDetailResponse } from '@/types/room.types';
import { formatVND, formatVNDShort } from '@/utils/formatters';

type ActivePopover =
  | 'price'
  | 'category'
  | 'area'
  | 'capacity'
  | 'province'
  | 'amenities'
  | 'sort'
  | null;

const FALLBACK_ROOM_IMAGE =
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1000&q=85&auto=format';

function getHighResImageUrl(url: string): string {
  if (url.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('w', '1000');
      parsed.searchParams.set('q', '85');
      parsed.searchParams.set('auto', 'format');
      return parsed.toString();
    } catch {
      return url;
    }
  }
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    const marker = '/image/upload/';
    const idx = url.indexOf(marker);
    const after = url.slice(idx + marker.length);
    const firstSegment = after.split('/')[0] ?? '';
    if (!firstSegment.includes('w_') && !firstSegment.includes('q_')) {
      return `${url.slice(0, idx + marker.length)}f_auto,q_auto:best,w_800,c_limit/${after}`;
    }
  }
  return url;
}

export const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { favoriteIds, localFavoriteRooms, loadFavorites, removeFavorite } = useFavoriteStore();

  const [searchInput, setSearchInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [minArea, setMinArea] = useState<number | undefined>(undefined);
  const [maxArea, setMaxArea] = useState<number | undefined>(undefined);
  const [capacity, setCapacity] = useState<number | undefined>(undefined);
  const [selectedProvince, setSelectedProvince] = useState<string | undefined>(undefined);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<MapSortOption>('NEWEST');
  const [activePopover, setActivePopover] = useState<ActivePopover>(null);
  const popoverBarRef = useRef<HTMLDivElement>(null);

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
    const timer = window.setTimeout(() => {
      setSubmittedQuery(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadFavorites(isAuthenticated);
  }, [isAuthenticated, loadFavorites]);

  const {
    data: catalogPage,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['rooms', 'favorites-sync', favoriteIds],
    queryFn: () => roomService.searchRooms({ page: 0, size: 50 }),
    enabled: favoriteIds.length > 0,
  });

  const rooms = useMemo(() => {
    const serverRooms = (catalogPage?.content || []).filter((r) =>
      favoriteIds.includes(r.maPhongTro),
    );
    const mergedMap = new Map(localFavoriteRooms.map((r) => [r.maPhongTro, r]));
    serverRooms.forEach((r) => mergedMap.set(r.maPhongTro, r));
    return Array.from(mergedMap.values()).filter((r) => favoriteIds.includes(r.maPhongTro));
  }, [catalogPage, favoriteIds, localFavoriteRooms]);

  // Tải thông tin chi tiết thật (mô tả, tiện ích, tiền cọc, chủ trọ, đánh giá) từ API cho từng phòng yêu thích
  const roomDetailsMap = useQueries({
    queries: rooms.map((r) => ({
      queryKey: ['rooms', 'detail', r.maPhongTro],
      queryFn: () => roomService.getRoomDetail(r.maPhongTro),
      staleTime: 5 * 60 * 1000,
      retry: false,
    })),
    combine: (results) => {
      const map = new Map<string, RoomDetailResponse>();
      results.forEach((res) => {
        if (res.data) {
          map.set(res.data.maPhongTro, res.data);
        }
      });
      return map;
    },
  });

  // Tìm kiếm bằng DB query (hỗ trợ parse ngôn ngữ tự nhiên) trên các phòng đã lưu
  const { data: dbMatchedIds = undefined } = useQuery({
    queryKey: ['rooms', 'favorites-db-search', submittedQuery],
    queryFn: async (): Promise<string[] | null> => {
      try {
        const res = await roomService.searchRooms({
          keyword: submittedQuery.trim(),
          page: 0,
          size: 100,
        });
        return (res.content || []).map((r) => r.maPhongTro);
      } catch {
        return null;
      }
    },
    enabled: submittedQuery.trim().length > 0,
    staleTime: 60 * 1000,
    retry: false,
  });

  const priceOptions = useMemo(
    () =>
      buildNumericBrackets(
        rooms.map((r) => r.giaThue),
        500_000,
        'Tất cả mức giá',
        (n) => `Giá ${formatMillions(n)}`,
        (n) => `Dưới ${formatMillions(n)}`,
        (a, b) => `${formatMillions(a)} – ${formatMillions(b)}`,
        (n) => `Từ ${formatMillions(n)} trở lên`,
      ),
    [rooms],
  );

  const areaOptions = useMemo(
    () =>
      buildNumericBrackets(
        rooms.map((r) => r.dienTich),
        5,
        'Tất cả diện tích',
        (n) => `${n} m²`,
        (n) => `Dưới ${n} m²`,
        (a, b) => `${a} – ${b} m²`,
        (n) => `Từ ${n} m² trở lên`,
      ),
    [rooms],
  );

  const capacityOptions = useMemo(() => buildCapacityOptions(rooms), [rooms]);
  const [provinceSearch, setProvinceSearch] = useState('');
  const filteredProvinces = useMemo(() => {
    const q = provinceSearch.trim().toLowerCase();
    if (!q) return VIETNAM_PROVINCES;
    return VIETNAM_PROVINCES.filter((p) => p.toLowerCase().includes(q));
  }, [provinceSearch]);

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    rooms.forEach((r) => {
      const detail = roomDetailsMap.get(r.maPhongTro);
      const label =
        detail?.loaiPhong?.tenLoaiPhongTro ||
        detail?.loaiPhong?.tenLoaiPhong ||
        r.tenLoaiPhong ||
        'Phòng trọ';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  }, [rooms, roomDetailsMap]);

  const amenityOptions = useMemo(() => {
    const counts = new Map<string, number>();
    rooms.forEach((r) => {
      const detail = roomDetailsMap.get(r.maPhongTro);
      const detailAmenities =
        detail?.dsTienIch
          ?.map((a) => (typeof a === 'string' ? a : a.tenTienIch))
          .filter(Boolean) ?? [];
      const summaryAmenities = r.dsTienIch?.filter(Boolean) ?? [];
      const uniqueNames = Array.from(
        new Set(detailAmenities.length > 0 ? detailAmenities : summaryAmenities),
      );
      uniqueNames.forEach((name) => counts.set(name, (counts.get(name) ?? 0) + 1));
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [rooms, roomDetailsMap]);

  const filteredRooms = useMemo(() => {
    const trimmedQuery = submittedQuery.trim().toLowerCase();

    const list = rooms.filter((r) => {
      const detail = roomDetailsMap.get(r.maPhongTro);
      const roomTypeLabel =
        detail?.loaiPhong?.tenLoaiPhongTro ||
        detail?.loaiPhong?.tenLoaiPhong ||
        r.tenLoaiPhong ||
        'Phòng trọ';
      const detailAmenities =
        detail?.dsTienIch
          ?.map((a) => (typeof a === 'string' ? a : a.tenTienIch))
          .filter(Boolean) ?? [];
      const summaryAmenities = r.dsTienIch?.filter(Boolean) ?? [];
      const roomAmenities = detailAmenities.length > 0 ? detailAmenities : summaryAmenities;

      let matchSearch = true;
      if (trimmedQuery) {
        if (Array.isArray(dbMatchedIds)) {
          matchSearch = dbMatchedIds.includes(r.maPhongTro);
        } else if (dbMatchedIds === null) {
          const title = detail?.tieuDe || detail?.tenPhong || r.tieuDe || r.diaChi;
          const desc = detail?.moTa || '';
          matchSearch =
            title.toLowerCase().includes(trimmedQuery) ||
            r.diaChi.toLowerCase().includes(trimmedQuery) ||
            roomTypeLabel.toLowerCase().includes(trimmedQuery) ||
            desc.toLowerCase().includes(trimmedQuery) ||
            roomAmenities.join(' ').toLowerCase().includes(trimmedQuery);
        }
      }

      const matchPrice =
        (minPrice === undefined || r.giaThue >= minPrice) &&
        (maxPrice === undefined || r.giaThue <= maxPrice);

      const matchCategory = !selectedCategory || roomTypeLabel === selectedCategory;

      const matchArea =
        (minArea === undefined || r.dienTich >= minArea) &&
        (maxArea === undefined || r.dienTich <= maxArea);

      const matchCapacity = capacity === undefined || (r.soNguoi ?? 0) >= capacity;

      const matchProvince =
        !selectedProvince || matchesProvinceAddress(r.diaChi, selectedProvince);

      const matchAmenities =
        selectedAmenities.length === 0 ||
        selectedAmenities.every((am) => roomAmenities.includes(am));

      return (
        matchSearch &&
        matchPrice &&
        matchCategory &&
        matchArea &&
        matchCapacity &&
        matchProvince &&
        matchAmenities
      );
    });

    return sortRoomsByOption(list, (r) => r, sortOption);
  }, [
    rooms,
    roomDetailsMap,
    submittedQuery,
    dbMatchedIds,
    minPrice,
    maxPrice,
    selectedCategory,
    minArea,
    maxArea,
    capacity,
    selectedProvince,
    selectedAmenities,
    sortOption,
  ]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedQuery(searchInput.trim());
    setActivePopover(null);
  };

  const handleRemoveFavorite = async (roomId: string) => {
    await removeFavorite(roomId, isAuthenticated);
    toast.success('Đã xóa phòng khỏi danh sách yêu thích');
  };

  const handleBookRoom = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    const targetPath = `/appointments/schedule/${roomId}`;
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để đặt lịch hẹn xem phòng');
      navigate('/login', { state: { from: { pathname: targetPath } } });
      return;
    }
    navigate(targetPath);
  };

  const resetFilters = () => {
    setSearchInput('');
    setSubmittedQuery('');
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setSelectedCategory(undefined);
    setMinArea(undefined);
    setMaxArea(undefined);
    setCapacity(undefined);
    setSelectedProvince(undefined);
    setSelectedAmenities([]);
    setSortOption('NEWEST');
    setActivePopover(null);
  };

  const hasPriceFilter = minPrice !== undefined || maxPrice !== undefined;
  const priceLabel = hasPriceFilter
    ? `${minPrice ? `${minPrice / 1e6}tr` : '0'} – ${maxPrice ? `${maxPrice / 1e6}tr` : 'Max'}`
    : 'Giá';
  const categoryLabel = selectedCategory || 'Loại phòng';
  const hasAreaFilter = minArea !== undefined || maxArea !== undefined;
  const areaLabel = hasAreaFilter
    ? `${minArea ?? 0} – ${maxArea ?? '∞'} m²`
    : 'Diện tích';
  const provinceLabel = selectedProvince || 'Tỉnh / Thành';
  const capacityLabel = capacity !== undefined ? `Từ ${capacity} người` : 'Số người';
  const amenityCount = selectedAmenities.length;
  const currentSortLabel =
    ROOM_SORT_OPTIONS.find((opt) => opt.value === sortOption)?.label ?? 'Mới nhất';
  const hasAnyActiveFilter =
    Boolean(submittedQuery.trim()) ||
    Boolean(searchInput.trim()) ||
    hasPriceFilter ||
    Boolean(selectedCategory) ||
    hasAreaFilter ||
    capacity !== undefined ||
    Boolean(selectedProvince) ||
    amenityCount > 0 ||
    sortOption !== 'NEWEST';

  return (
    <PageContainer width="wide" className="space-y-5">
      {rooms.length > 0 && (
        <div
          ref={popoverBarRef}
          className="bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-slate-200 shadow-xs sticky top-[104px] z-30 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5"
        >
          <div className="flex flex-col lg:flex-row lg:items-center gap-1.5 w-full lg:flex-1 lg:min-w-0">
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center w-full lg:w-[200px] xl:w-[220px] shrink-0"
            >
              <div className="flex-1 relative flex items-center">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Mô tả phòng cần tìm"
                  className="w-full h-9 pl-3.5 pr-10 bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-teal-600 outline-none transition-colors placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  aria-label="Tìm kiếm"
                  title="Tìm kiếm"
                  className="absolute right-1.5 w-7 h-7 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="flex flex-wrap lg:flex-nowrap items-center gap-1.5">
            {/* 1. Chip Giá */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActivePopover((p) => (p === 'price' ? null : 'price'))}
                className={`inline-flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2.5 xl:px-3 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  hasPriceFilter || activePopover === 'price'
                    ? 'bg-teal-50 text-teal-800 border-teal-500'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{priceLabel}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {activePopover === 'price' && (
                <div className="fixed inset-x-4 mt-2 sm:inset-x-auto sm:absolute sm:left-0 sm:w-72 bg-white rounded-2xl border border-slate-200 shadow-lg p-3 z-50 space-y-1">
                  {priceOptions.map((option) => {
                    const selected = minPrice === option.min && maxPrice === option.max;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => {
                          setMinPrice(option.min);
                          setMaxPrice(option.max);
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
                className={`inline-flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2.5 xl:px-3 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCategory || activePopover === 'category'
                    ? 'bg-teal-50 text-teal-800 border-teal-500'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{categoryLabel}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {activePopover === 'category' && (
                <div className="fixed inset-x-4 mt-2 sm:inset-x-auto sm:absolute sm:left-0 sm:w-64 bg-white rounded-2xl border border-slate-200 shadow-lg p-3 z-50 space-y-1 max-h-72 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory(undefined);
                      setActivePopover(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium cursor-pointer ${
                      !selectedCategory
                        ? 'bg-teal-50 text-teal-800 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>Tất cả loại phòng</span>
                    {!selectedCategory && <Check className="w-4 h-4 text-teal-700" />}
                  </button>
                  {categoryOptions.map((c) => {
                    const selected = selectedCategory === c.label;
                    return (
                      <button
                        key={c.label}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(c.label);
                          setActivePopover(null);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer text-left ${
                          selected
                            ? 'bg-teal-50 text-teal-800 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{c.label}</span>
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
                className={`inline-flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2.5 xl:px-3 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  hasAreaFilter || activePopover === 'area'
                    ? 'bg-teal-50 text-teal-800 border-teal-500'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{areaLabel}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {activePopover === 'area' && (
                <div className="fixed inset-x-4 mt-2 sm:inset-x-auto sm:absolute sm:left-0 sm:w-68 bg-white rounded-2xl border border-slate-200 shadow-lg p-3 z-50 space-y-1">
                  {areaOptions.map((option) => {
                    const selected = minArea === option.min && maxArea === option.max;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => {
                          setMinArea(option.min);
                          setMaxArea(option.max);
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

            {/* 4. Chip Số người */}
            {capacityOptions.length > 1 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActivePopover((p) => (p === 'capacity' ? null : 'capacity'))}
                  className={`inline-flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2.5 xl:px-3 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                    capacity !== undefined || activePopover === 'capacity'
                      ? 'bg-teal-50 text-teal-800 border-teal-500'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>{capacityLabel}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {activePopover === 'capacity' && (
                  <div className="fixed inset-x-4 mt-2 sm:inset-x-auto sm:absolute sm:left-0 sm:w-60 bg-white rounded-2xl border border-slate-200 shadow-lg p-3 z-50 space-y-1">
                    {capacityOptions.map((option) => {
                      const selected = capacity === option.value;
                      return (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => {
                            setCapacity(option.value);
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

            {/* 5. Chip Tiện ích */}
            {amenityOptions.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActivePopover((p) => (p === 'amenities' ? null : 'amenities'))}
                  className={`inline-flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2.5 xl:px-3 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                    amenityCount > 0 || activePopover === 'amenities'
                      ? 'bg-teal-50 text-teal-800 border-teal-500'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>{amenityCount > 0 ? `Tiện ích (${amenityCount})` : 'Tiện ích'}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {activePopover === 'amenities' && (
                  <div className="fixed inset-x-4 mt-2 sm:inset-x-auto sm:absolute sm:left-0 sm:w-72 bg-white rounded-2xl border border-slate-200 shadow-lg p-3 z-50 space-y-2">
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {amenityOptions.map((am) => {
                        const active = selectedAmenities.includes(am.name);
                        return (
                          <button
                            key={am.name}
                            type="button"
                            onClick={() => {
                              setSelectedAmenities((prev) =>
                                active ? prev.filter((item) => item !== am.name) : [...prev, am.name],
                              );
                            }}
                            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm cursor-pointer text-left ${
                              active
                                ? 'bg-teal-50 text-teal-800 font-semibold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="truncate">{am.name}</span>
                            {active && <Check className="w-4 h-4 text-teal-700 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                    {amenityCount > 0 && (
                      <div className="pt-2 border-t border-slate-100 flex justify-between">
                        <button
                          type="button"
                          onClick={() => setSelectedAmenities([])}
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
            )}

            {/* 6. Chip Tỉnh / Thành phố (đặt cuối trước Sắp xếp) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProvinceSearch('');
                  setActivePopover((p) => (p === 'province' ? null : 'province'));
                }}
                className={`inline-flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2.5 xl:px-3 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  selectedProvince || activePopover === 'province'
                    ? 'bg-teal-50 text-teal-800 border-teal-500'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{provinceLabel}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {activePopover === 'province' && (
                <div className="fixed inset-x-4 mt-2 sm:inset-x-auto sm:absolute sm:left-0 sm:w-64 bg-white rounded-2xl border border-slate-200 shadow-lg p-3 z-50 space-y-2">
                  <input
                    type="text"
                    value={provinceSearch}
                    onChange={(e) => setProvinceSearch(e.target.value)}
                    placeholder="Tìm tỉnh, thành phố..."
                    className="w-full h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:border-teal-500"
                  />
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProvince(undefined);
                        setProvinceSearch('');
                        setActivePopover(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium cursor-pointer ${
                        !selectedProvince
                          ? 'bg-teal-50 text-teal-800 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>Tất cả tỉnh / thành</span>
                      {!selectedProvince && <Check className="w-4 h-4 text-teal-700 shrink-0" />}
                    </button>
                    {filteredProvinces.map((province) => {
                      const selected = selectedProvince === province;
                      return (
                        <button
                          key={province}
                          type="button"
                          onClick={() => {
                            setSelectedProvince(province);
                            setProvinceSearch('');
                            setActivePopover(null);
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer text-left ${
                            selected
                              ? 'bg-teal-50 text-teal-800 font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate">{province}</span>
                          {selected && <Check className="w-4 h-4 text-teal-700 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 5. Nút Sắp xếp */}
            <div className="relative">
              <button
                type="button"
                aria-label={`Sắp xếp: ${currentSortLabel}`}
                title={`Sắp xếp: ${currentSortLabel}`}
                aria-expanded={activePopover === 'sort'}
                onClick={() => setActivePopover((p) => (p === 'sort' ? null : 'sort'))}
                className={`inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full border transition-colors cursor-pointer shrink-0 ${
                  sortOption !== 'NEWEST' || activePopover === 'sort'
                    ? 'bg-teal-50 text-teal-800 border-teal-500'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {activePopover === 'sort' && (
                <div className="fixed inset-x-4 mt-2 sm:inset-x-auto sm:absolute sm:left-0 sm:w-48 bg-white rounded-2xl border border-slate-200 shadow-lg p-2 z-50 space-y-1">
                  {ROOM_SORT_OPTIONS.map((option) => {
                    const selected = sortOption === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setSortOption(option.value);
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
                onClick={resetFilters}
                className="inline-flex items-center gap-1 h-8 sm:h-9 px-2 xl:px-2.5 rounded-full text-[11px] sm:text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
              >
                <X className="w-3.5 h-3.5" />
                <span>Xóa lọc</span>
              </button>
            )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/search')}
            className="w-full sm:w-auto lg:ml-auto inline-flex items-center justify-center gap-1.5 h-9 px-3 xl:px-3.5 rounded-full bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200/80 text-xs font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Tìm thêm phòng</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error ? (
        <div className="bg-white rounded-2xl border border-red-200 p-6 text-center space-y-3 shadow-xs">
          <AlertCircle className="w-7 h-7 text-red-600 mx-auto" />
          <p className="text-sm font-bold text-slate-900">Không thể đồng bộ danh sách yêu thích</p>
          <AppButton variant="primary" size="sm" onClick={() => void refetch()}>
            Thử lại
          </AppButton>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row md:h-[212px] animate-pulse"
            >
              <div className="w-full h-48 md:w-[270px] lg:w-[290px] md:h-full bg-slate-200 shrink-0" />
              <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between gap-2">
                <div className="space-y-2.5">
                  <div className="h-5 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="h-6 bg-slate-100 rounded w-2/3" />
                  <div className="h-4 bg-slate-100 rounded w-4/5" />
                </div>
                <div className="h-4 bg-slate-100 rounded w-1/3" />
              </div>
              <div className="md:w-[235px] lg:w-[250px] md:h-full p-4 sm:p-5 bg-slate-50 border-t md:border-t-0 md:border-l border-slate-100 flex flex-col justify-end gap-3.5">
                <div className="space-y-1.5 md:flex md:flex-col md:items-end">
                  <div className="h-7 bg-slate-200 rounded w-28" />
                  <div className="h-4 bg-slate-100 rounded w-32" />
                </div>
                <div className="h-11 bg-slate-200 rounded-xl w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredRooms.length > 0 ? (
        <Card className="bg-surface rounded-xl border border-border overflow-hidden p-0">
          <Card.Content className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Phòng trọ</th>
                  <th className="py-3 px-4">Địa chỉ & Thông số</th>
                  <th className="py-3 px-4">Tiện ích</th>
                  <th className="py-3 px-4">Giá thuê / Cọc</th>
                  <th className="py-3 px-4">Chủ trọ</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRooms.map((room) => {
                  const detail = roomDetailsMap.get(room.maPhongTro);
                  const rawRoomImage =
                    detail?.dsHinhAnh?.find((i) => i.laDaiDien)?.url ||
                    detail?.dsHinhAnh?.[0]?.url ||
                    room.anhDaiDien ||
                    detail?.hinhAnh?.[0]?.duongDan ||
                    room.hinhAnh?.[0]?.duongDan ||
                    FALLBACK_ROOM_IMAGE;
                  const roomImage = getHighResImageUrl(rawRoomImage);
                  const roomTypeLabel =
                    detail?.loaiPhong?.tenLoaiPhongTro ||
                    detail?.loaiPhong?.tenLoaiPhong ||
                    room.tenLoaiPhong ||
                    'Phòng trọ';
                  const roomTitle =
                    detail?.tieuDe ||
                    detail?.tenPhong ||
                    room.tieuDe ||
                    `${roomTypeLabel} - ${room.diaChi.split(',')[0] || ''}`;
                  const reputation = detail?.chuTro?.diemUyTin ?? room.diemUyTinChuTro;
                  const detailAmenities =
                    detail?.dsTienIch
                      ?.map((a) => (typeof a === 'string' ? a : a.tenTienIch))
                      .filter(Boolean) ?? [];
                  const summaryAmenities = room.dsTienIch?.filter(Boolean) ?? [];
                  const amenities = detailAmenities.length > 0 ? detailAmenities : summaryAmenities;
                  const landlordName = detail?.chuTro?.hoVaTen || detail?.chuTro?.hoTen;
                  const contractDeposit = detail?.cocPhong ?? detail?.coc ?? room.giaThue;

                  return (
                    <tr
                      key={room.maPhongTro}
                      onClick={() => navigate(`/room/${room.maPhongTro}`)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3 min-w-[220px] max-w-[300px]">
                          <img
                            src={roomImage}
                            alt={roomTitle}
                            loading="lazy"
                            className="w-14 h-11 rounded-lg object-cover bg-slate-100 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{roomTitle}</p>
                            <p className="text-[11px] text-slate-500 truncate">{roomTypeLabel}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-[260px]">
                        <p className="text-slate-700 truncate">{room.diaChi}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {room.dienTich} m² · {room.soNguoi || 2} người
                        </p>
                      </td>
                      <td className="py-3.5 px-4 max-w-[220px]">
                        {amenities.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {amenities.slice(0, 2).map((a, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium"
                              >
                                {a}
                              </span>
                            ))}
                            {amenities.length > 2 && (
                              <span className="text-[11px] text-slate-500">+{amenities.length - 2}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-bold text-teal-700">
                          {formatVNDShort(room.giaThue, '')}/tháng
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Cọc: {formatVND(contractDeposit)}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-semibold text-slate-800">{landlordName || 'Chủ trọ'}</p>
                        {reputation !== undefined && (
                          <p className="text-[11px] text-amber-700 font-semibold">
                            Uy tín {reputation}
                          </p>
                        )}
                      </td>
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleBookRoom(e, room.maPhongTro)}
                            className="px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Calendar className="w-3 h-3" />
                            Đặt lịch
                          </button>
                          <Link
                            to={`/room/${room.maPhongTro}`}
                            className="px-2.5 py-1.5 rounded-lg border border-border bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold"
                          >
                            Chi tiết
                          </Link>
                          <button
                            type="button"
                            title="Bỏ yêu thích"
                            onClick={() => void handleRemoveFavorite(room.maPhongTro)}
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                          >
                            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card.Content>
        </Card>
      ) : rooms.length > 0 ? (
        <EmptyState
          title="Không có phòng khớp bộ lọc"
          description="Hãy xóa bộ lọc để xem lại tất cả các phòng bạn đã lưu."
          icon={<Heart className="w-6 h-6" />}
          action={
            <AppButton variant="primary" size="md" onClick={resetFilters}>
              Xóa bộ lọc
            </AppButton>
          }
        />
      ) : (
        <EmptyState
          title="Bạn chưa lưu phòng yêu thích nào"
          description="Nhấn biểu tượng trái tim trên bất kỳ tin phòng nào để lưu lại so sánh và đặt lịch xem nhanh."
          icon={<Heart className="w-6 h-6 text-red-500" />}
          action={
            <AppButton variant="primary" size="md" onClick={() => navigate('/search')}>
              Khám phá phòng ngay
            </AppButton>
          }
        />
      )}
    </PageContainer>
  );
};
