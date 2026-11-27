import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@heroui/react';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpDown,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Heart,
  Images,
  MapPin,
  Search,
  Star,
  User,
  Users,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AppButton } from '@/components/common/AppButton';
import { EmptyState } from '@/components/common/EmptyState';
import { PageContainer, PageHeader } from '@/components/common/PageContainer';
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
    <PageContainer width="wide" className="space-y-6">
      <PageHeader title="Phòng yêu thích" />

      {rooms.length > 0 && (
        <div
          ref={popoverBarRef}
          className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2"
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
        <div className="space-y-4">
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
            const photoCount =
              detail?.dsHinhAnh?.length || detail?.hinhAnh?.length || room.hinhAnh?.length || 0;
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
            const status = detail?.trangThai ?? room.trangThai ?? 'DA_DUYET';
            const reputation = detail?.chuTro?.diemUyTin ?? room.diemUyTinChuTro;
            const ratingAvg = detail?.diemDanhGiaTrungBinh;
            const ratingCount = detail?.tongSoDanhGia ?? 0;
            const detailAmenities =
              detail?.dsTienIch
                ?.map((a) => (typeof a === 'string' ? a : a.tenTienIch))
                .filter(Boolean) ?? [];
            const summaryAmenities = room.dsTienIch?.filter(Boolean) ?? [];
            const amenities = detailAmenities.length > 0 ? detailAmenities : summaryAmenities;
            const landlordName = detail?.chuTro?.hoVaTen || detail?.chuTro?.hoTen;
            const contractDeposit = detail?.cocPhong ?? detail?.coc ?? room.giaThue;

            return (
              <Card
                key={room.maPhongTro}
                onClick={() => navigate(`/room/${room.maPhongTro}`)}
                className="group flex flex-col md:flex-row md:h-[212px] overflow-hidden p-0 gap-0 rounded-2xl border border-slate-200/90 hover:border-teal-500/70 bg-white shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                {/* CỘT TRÁI: ẢNH PHÒNG ĐỒNG NHẤT KÍCH THƯỚC & SẮC NÉT */}
                <div className="w-full h-48 md:w-[270px] lg:w-[290px] md:h-full shrink-0 relative bg-slate-100 overflow-hidden">
                  <img
                    src={roomImage}
                    alt={roomTitle}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-900/75 backdrop-blur-xs text-white text-[11px] font-bold shadow-xs">
                    {roomTypeLabel}
                  </span>
                  {photoCount > 0 && (
                    <span className="inline-flex items-center gap-1 absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-slate-900/75 backdrop-blur-xs text-white text-[11px] font-semibold shadow-xs">
                      <Images className="w-3.5 h-3.5 text-teal-300" />
                      <span>{photoCount} ảnh</span>
                    </span>
                  )}
                </div>

                {/* CỘT GIỮA: THÔNG TIN TÓM TẮT & TIỆN ÍCH CHÍNH */}
                <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0 gap-2 overflow-hidden">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-1">
                        {roomTitle}
                      </h3>
                      {status === 'DA_DUYET' && (
                        <span className="shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                          Còn trống
                        </span>
                      )}
                    </div>

                    <div className="flex items-start gap-1.5 text-xs sm:text-sm text-slate-600 min-w-0">
                      <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{room.diaChi}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                        {room.dienTich} m²
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        {room.soNguoi || 2} người
                      </span>
                      {reputation !== undefined && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-800 font-semibold">
                          <Award className="w-3.5 h-3.5 text-amber-600" />
                          Uy tín {reputation}
                        </span>
                      )}
                      {ratingCount > 0 && ratingAvg !== undefined && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50/70 border border-amber-200/60 text-slate-800 font-semibold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span>
                            {ratingAvg.toFixed(1)} ({ratingCount})
                          </span>
                        </span>
                      )}
                    </div>

                    {amenities.length > 0 && (
                      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 max-h-6 overflow-hidden">
                        {amenities.slice(0, 3).map((amenity, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 whitespace-nowrap"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{amenity}</span>
                          </span>
                        ))}
                        {amenities.length > 3 && (
                          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                            +{amenities.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
                    <div className="min-w-0">
                      {landlordName && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 truncate max-w-full">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">Chủ trọ: {landlordName}</span>
                        </span>
                      )}
                    </div>
                    <Link
                      to={`/room/${room.maPhongTro}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-teal-700 hover:text-teal-800 shrink-0"
                    >
                      <span>Xem chi tiết</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* CỘT PHẢI: GIÁ THUÊ, TIỀN CỌC & HÀNH ĐỘNG */}
                <div className="md:w-[235px] lg:w-[250px] md:h-full shrink-0 p-4 sm:p-5 bg-slate-50/70 border-t md:border-t-0 md:border-l border-slate-100 flex flex-col justify-between gap-3.5">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      title="Bỏ yêu thích"
                      aria-label="Bỏ yêu thích"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleRemoveFavorite(room.maPhongTro);
                      }}
                      className="w-9 h-9 shrink-0 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="md:text-right space-y-1">
                      <div className="text-2xl font-black text-teal-700 tracking-tight">
                        {formatVNDShort(room.giaThue, '')}
                        <span className="text-xs font-semibold text-slate-500 ml-1">/tháng</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Cọc:{' '}
                        <span className="font-semibold text-slate-700">
                          {formatVND(contractDeposit)}
                        </span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleBookRoom(e, room.maPhongTro)}
                      className="w-full h-11 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold shadow-sm shadow-teal-600/20 inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span>Đặt lịch xem</span>
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
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
