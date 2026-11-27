import React, { useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppButton } from '@/components/common/AppButton';
import { EmptyState } from '@/components/common/EmptyState';
import { SkeletonList } from '@/components/common/SkeletonList';
import { RoomCard } from '@/components/room/RoomCard';
import {
  buildCapacityOptions,
  buildNumericBrackets,
  formatMillions,
  matchesProvinceAddress,
  ROOM_SORT_OPTIONS,
  resolveRoomSortParams,
  sortRoomsByOption,
  VIETNAM_PROVINCES,
} from '@/components/room/searchHelpers';
import { SearchModeTabs } from '@/components/room/SearchModeTabs';
import { roomService } from '@/services/room.service';
import { useRoomFilterStore } from '@/store/useRoomFilterStore';

type ActivePopover =
  | 'price'
  | 'category'
  | 'area'
  | 'capacity'
  | 'province'
  | 'amenities'
  | 'sort'
  | null;

export const SearchPage: React.FC = () => {
  const navigate = useNavigate();
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

  const {
    listCurrentPage: currentPage,
    setListCurrentPage: setCurrentPage,
    listSortBy: sortBy,
    setListSortBy: setSortBy,
    setLastSearchMode,
  } = filterStore;
  const [activePopover, setActivePopover] = useState<ActivePopover>(null);

  useEffect(() => {
    setLastSearchMode('list');
  }, [setLastSearchMode]);

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
  const [provinceSearch, setProvinceSearch] = useState('');
  const filteredProvinces = useMemo(() => {
    const q = provinceSearch.trim().toLowerCase();
    if (!q) return VIETNAM_PROVINCES;
    return VIETNAM_PROVINCES.filter((p) => p.toLowerCase().includes(q));
  }, [provinceSearch]);

  const setFilterKeyword = filterStore.setKeyword;
  useEffect(() => {
    if (searchInputDraft === null) return;
    const timer = window.setTimeout(() => {
      const trimmed = searchInputDraft.trim();
      setFilterKeyword(trimmed);
      setManualKeyword(trimmed);
      setCurrentPage(0);
      setSearchParams(trimmed ? { keyword: trimmed } : {}, { replace: true });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInputDraft, setFilterKeyword, setCurrentPage, setSearchParams]);

  const {
    data: queryResult,
    isLoading,
    isFetching,
    isPlaceholderData,
    error,
    refetch,
  } = useQuery({
    placeholderData: keepPreviousData,
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
        province: filterStore.province,
        categoryId: filterStore.categoryId,
        selectedAmenities: filterStore.selectedAmenities,
        currentPage,
        sortBy,
      },
    ],
    queryFn: async () => {
      const trimmed = submittedKeyword.trim();
      const { sortBy: sortField, sortDirection } = resolveRoomSortParams(sortBy);
      return roomService.searchRooms({
        keyword: isAreaSearch ? undefined : trimmed || undefined,
        area: filterStore.province || (isAreaSearch ? trimmed : undefined),
        minGia: filterStore.minPrice,
        maxGia: filterStore.maxPrice,
        minDienTich: filterStore.minArea,
        maxDienTich: filterStore.maxArea,
        soNguoi: filterStore.capacity,
        maLpt: filterStore.categoryId,
        dsTienIch: filterStore.selectedAmenities,
        page: currentPage,
        size: 24,
        sortBy: sortField,
        sortDirection,
      });
    },
  });

  const rooms = useMemo(() => {
    const content = queryResult?.content ?? [];
    const provinceFiltered = filterStore.province
      ? content.filter((r) => matchesProvinceAddress(r.diaChi, filterStore.province!))
      : content;
    return sortRoomsByOption(provinceFiltered, (r) => r, sortBy);
  }, [queryResult?.content, filterStore.province, sortBy]);
  const totalPages = queryResult?.totalPages ?? 1;

  const pageItems = useMemo<Array<number | 'ellipsis'>>(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i);
    }
    const items: Array<number | 'ellipsis'> = [0];
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(totalPages - 2, currentPage + 1);
    if (start > 1) items.push('ellipsis');
    for (let i = start; i <= end; i += 1) items.push(i);
    if (end < totalPages - 2) items.push('ellipsis');
    items.push(totalPages - 1);
    return items;
  }, [currentPage, totalPages]);

  const handlePageChange = (nextPage: number) => {
    setCurrentPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  const handleResetFilters = () => {
    filterStore.resetFilter();
    setManualKeyword('');
    setSearchInputDraft('');
    setSearchParams({});
    setCurrentPage(0);
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

  const provinceLabel = filterStore.province || 'Tỉnh / Thành';
  const capacityLabel = filterStore.capacity ? `Từ ${filterStore.capacity} người` : 'Số người';
  const amenityCount = filterStore.selectedAmenities.length;
  const showResetButton = filterStore.getActiveFilterCount() > 0 || hasTextQuery;

  return (
    <div className="flex-1 bg-slate-50 flex flex-col w-full">
      {/* THANH TÌM KIẾM NGÔN NGỮ TỰ NHIÊN, BỘ LỌC & CHUYỂN CHẾ ĐỘ */}
      <section
        ref={popoverBarRef}
        className="bg-white/95 backdrop-blur-md border-b border-slate-200 py-2.5 sticky top-[100px] z-30 shrink-0"
      >
        <div className="max-w-[1360px] w-full mx-auto px-4 sm:px-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 w-full lg:flex-1 lg:min-w-0">
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center w-full sm:w-[260px] lg:w-[320px] shrink-0"
            >
              <div className="flex-1 relative flex items-center">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInputDraft(e.target.value)}
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

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* 1. Chip Giá */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActivePopover((p) => (p === 'price' ? null : 'price'))}
                className={`inline-flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
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
                className={`inline-flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  filterStore.categoryId || activePopover === 'category'
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
                className={`inline-flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
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
                  className={`inline-flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                    filterStore.capacity !== undefined || activePopover === 'capacity'
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
                      const selected = filterStore.capacity === option.value;
                      return (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => {
                            filterStore.setCapacity(option.value);
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
                          {selected && <Check className="w-4 h-4 text-teal-700 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 5. Chip Tiện ích */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActivePopover((p) => (p === 'amenities' ? null : 'amenities'))}
                className={`inline-flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
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

            {/* 6. Chip Tỉnh / Thành phố (đặt cuối trước Sắp xếp) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProvinceSearch('');
                  setActivePopover((p) => (p === 'province' ? null : 'province'));
                }}
                className={`inline-flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  filterStore.province || activePopover === 'province'
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
                        filterStore.setProvince(undefined);
                        setProvinceSearch('');
                        setCurrentPage(0);
                        setActivePopover(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium cursor-pointer ${
                        !filterStore.province
                          ? 'bg-teal-50 text-teal-800 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>Tất cả tỉnh / thành</span>
                      {!filterStore.province && <Check className="w-4 h-4 text-teal-700 shrink-0" />}
                    </button>
                    {filteredProvinces.map((province) => {
                      const selected = filterStore.province === province;
                      return (
                        <button
                          key={province}
                          type="button"
                          onClick={() => {
                            filterStore.setProvince(province);
                            setProvinceSearch('');
                            setCurrentPage(0);
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
                <div className="fixed inset-x-4 mt-2 sm:inset-x-auto sm:absolute sm:left-0 sm:w-48 bg-white rounded-2xl border border-slate-200 shadow-lg p-2 z-50 space-y-1">
                  {ROOM_SORT_OPTIONS.map((option) => {
                    const selected = sortBy === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setSortBy(option.value);
                          setCurrentPage(0);
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

            {showResetButton && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 h-8 sm:h-9 px-2.5 sm:px-3 rounded-full text-[11px] sm:text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
              >
                <X className="w-3.5 h-3.5" />
                <span>Xóa lọc</span>
              </button>
            )}
            </div>
          </div>

          <div className="flex justify-end w-full lg:w-auto lg:ml-auto shrink-0">
            <SearchModeTabs activeMode="list" />
          </div>
        </div>
      </section>

      {/* DANH SÁCH KẾT QUẢ TOÀN CHIỀU RỘNG */}
      <div className="max-w-[1360px] mx-auto w-full px-4 sm:px-6 py-6 flex-1 flex flex-col gap-5">

        {error ? (
          <div className="bg-white rounded-2xl border border-red-200 p-6 text-center space-y-3 shadow-xs">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
            <p className="text-sm font-bold text-slate-900">Không thể tải danh sách phòng trọ</p>
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
            count={8}
            columnsClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          />
        ) : rooms.length > 0 ? (
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 transition-opacity duration-200 ${
              isPlaceholderData && isFetching ? 'opacity-60' : 'opacity-100'
            }`}
          >
            {rooms.map((room) => (
              <RoomCard key={room.maPhongTro} room={room} layout="vertical" />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Không tìm thấy phòng phù hợp"
            description="Hãy thử xóa bớt tiêu chí lọc hoặc chuyển sang chế độ bản đồ để quét phòng quanh khu vực bạn muốn."
            action={
              <>
                <AppButton variant="primary" size="md" onClick={handleResetFilters}>
                  Xóa bộ lọc
                </AppButton>
                <AppButton
                  variant="secondary"
                  size="md"
                  onClick={() => navigate('/search/map')}
                >
                  Tìm trên bản đồ
                </AppButton>
              </>
            }
          />
        )}

        {/* Phân trang */}
        {rooms.length > 0 && totalPages > 1 && (
          <nav
            aria-label="Phân trang"
            className="pt-2 flex items-center justify-center gap-1.5"
          >
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
              aria-label="Trang trước"
              className="w-9 h-9 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {pageItems.map((item, idx) =>
              item === 'ellipsis' ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-9 h-9 flex items-center justify-center text-sm text-slate-400 select-none"
                >
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => handlePageChange(item)}
                  aria-current={currentPage === item ? 'page' : undefined}
                  className={`w-9 h-9 rounded-full border text-xs font-bold flex items-center justify-center transition-colors cursor-pointer ${
                    currentPage === item
                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {item + 1}
                </button>
              ),
            )}

            <button
              type="button"
              disabled={currentPage >= totalPages - 1}
              onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
              aria-label="Trang tiếp"
              className="w-9 h-9 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
};
