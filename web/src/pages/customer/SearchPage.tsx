import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Header } from '@/components/common/Header';
import { RoomMap } from '@/components/map/RoomMap';
import { FilterModal } from '@/components/room/FilterModal';
import { RoomCard } from '@/components/room/RoomCard';
import { roomService } from '@/services/room.service';
import { useRoomFilterStore } from '@/store/useRoomFilterStore';
import type { RoomSummaryResponse } from '@/types/room.types';
import { getValidCoords } from '@/utils/formatters';

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

  const [useAiSearch, setUseAiSearch] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomSummaryResponse | null>(null);

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(
    filterStore.userLat && filterStore.userLng
      ? { lat: filterStore.userLat, lng: filterStore.userLng }
      : { lat: 10.7845, lng: 106.6844 },
  );
  const [isLocating, setIsLocating] = useState(false);
  const [sortBy, setSortBy] = useState<'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC'>('NEWEST');

  const { data: queryResult, isLoading, isFetching } = useQuery({
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
        const aiRooms = await roomService.aiSearchRooms(submittedKeyword.trim(), 20);
        const content = aiRooms || [];
        return {
          content,
          totalElements: content.length,
          totalPages: 1,
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
        size: 15,
        sortBy: sortField,
        sortDirection,
      });
      return {
        content: res.content || [],
        totalElements: res.totalElements || (res.content || []).length,
        totalPages: res.totalPages || 1,
      };
    },
  });

  const rooms = useMemo(() => queryResult?.content ?? [], [queryResult?.content]);
  const totalElements = queryResult?.totalElements || 0;
  const totalPages = queryResult?.totalPages || 1;

  const activeSelectedRoom = useMemo(() => {
    if (selectedRoom && rooms.some((r) => r.maPhongTro === selectedRoom.maPhongTro)) {
      return selectedRoom;
    }
    return rooms[0] ?? null;
  }, [rooms, selectedRoom]);

  const roomsWithDistance = useMemo(() => {
    return rooms.map((room) => {
      let distanceInKm: number | null = null;
      if (userCoords) {
        const coords = getValidCoords(room);
        if (coords) {
          distanceInKm = getDistanceInKm(
            userCoords.lat,
            userCoords.lng,
            coords.lat,
            coords.lng,
          );
        }
      }
      return { room, distanceInKm };
    });
  }, [rooms, userCoords]);

  const filteredRooms = useMemo(() => {
    if (!filterStore.radiusKm || !userCoords) return roomsWithDistance;
    return roomsWithDistance.filter((item) => {
      if (item.distanceInKm === null) return true;
      return item.distanceInKm <= (filterStore.radiusKm || 999);
    });
  }, [roomsWithDistance, filterStore.radiusKm, userCoords]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    filterStore.setKeyword(trimmed);
    setManualKeyword(trimmed);
    setSearchInputDraft(null);
    setCurrentPage(0);
    if (trimmed) {
      setSearchParams({ keyword: trimmed });
    } else {
      setSearchParams({});
    }
  };

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      toast.error('Trình duyệt của bạn không hỗ trợ định vị GPS.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        filterStore.setUserLocation(coords.lat, coords.lng);
        setIsLocating(false);
        toast.success('Đã cập nhật vị trí hiện tại của bạn');
      },
      () => {
        toast.warning('Không thể lấy vị trí hiện tại. Vui lòng cấp quyền định vị cho trình duyệt.');
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  const removeFilter = (type: string) => {
    if (type === 'price') filterStore.setPriceRange(undefined, undefined);
    if (type === 'area') filterStore.setAreaRange(undefined, undefined);
    if (type === 'capacity') filterStore.setCapacity(undefined);
    if (type === 'category') filterStore.setCategoryId(undefined);
    if (type === 'radius') filterStore.setRadiusKm(undefined);
    if (type === 'amenities') filterStore.setSelectedAmenities([]);
    setCurrentPage(0);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <section className="bg-white border-b border-slate-200/90 py-3.5 px-4 sm:px-6 lg:px-8 sticky top-16 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-4xl">
            <div className="flex-1 relative flex items-center">
              <div className="absolute left-3.5 text-slate-400">
                {useAiSearch && isFetching ? (
                  <Sparkles className="w-5 h-5 text-teal-600 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInputDraft(e.target.value)}
                placeholder="Nhập địa điểm, quận hoặc mô tả tự nhiên (AI Vector Search)..."
                className="w-full pl-11 pr-28 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-sm font-semibold text-slate-900 rounded-full border border-slate-200 focus:border-teal-600 outline-none transition-all placeholder:text-slate-400"
              />

              <button
                type="button"
                onClick={() => setUseAiSearch(!useAiSearch)}
                title="Bật tìm kiếm ngữ nghĩa AI Gemini"
                className={`absolute right-2 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  useAiSearch
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-teal-700'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Search</span>
              </button>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-full shadow-md shadow-blue-600/20 transition-all shrink-0 cursor-pointer"
            >
              Tìm kiếm
            </button>
          </form>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 shrink-0">
              <MapPin className="w-3.5 h-3.5 text-teal-600" />
              <span>{submittedKeyword || 'Toàn quốc'}</span>
            </div>

            {filterStore.minPrice !== undefined || filterStore.maxPrice !== undefined ? (
              <button
                type="button"
                onClick={() => removeFilter('price')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 shrink-0 cursor-pointer"
              >
                <span>
                  {filterStore.minPrice ? `${filterStore.minPrice / 1e6}tr` : '0'} –{' '}
                  {filterStore.maxPrice ? `${filterStore.maxPrice / 1e6}tr` : 'Max'}
                </span>
                <X className="w-3 h-3 text-teal-600" />
              </button>
            ) : null}

            {filterStore.minArea !== undefined || filterStore.maxArea !== undefined ? (
              <button
                type="button"
                onClick={() => removeFilter('area')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 shrink-0 cursor-pointer"
              >
                <span>
                  {filterStore.minArea || '0'} – {filterStore.maxArea || 'Max'} m²
                </span>
                <X className="w-3 h-3 text-teal-600" />
              </button>
            ) : null}

            {filterStore.selectedAmenities.length > 0 && (
              <button
                type="button"
                onClick={() => removeFilter('amenities')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 shrink-0 cursor-pointer"
              >
                <span>Tiện ích · {filterStore.selectedAmenities.length}</span>
                <X className="w-3 h-3 text-teal-600" />
              </button>
            )}

            {filterStore.radiusKm ? (
              <button
                type="button"
                onClick={() => removeFilter('radius')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 shrink-0 cursor-pointer"
              >
                <span>≤ {filterStore.radiusKm} km</span>
                <X className="w-3 h-3 text-teal-600" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setIsFilterModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Bộ lọc nâng cao</span>
              {filterStore.getActiveFilterCount() > 0 && (
                <span className="w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {filterStore.getActiveFilterCount()}
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-180px)] min-h-[600px]">
          <div className="lg:col-span-5 flex flex-col h-full bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  {filteredRooms.length} phòng phù hợp
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Đồng bộ trực tiếp với bản đồ tương tác
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
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {sortBy === 'NEWEST'
                    ? 'Mới nhất'
                    : sortBy === 'PRICE_ASC'
                      ? 'Giá tăng dần'
                      : 'Giá giảm dần'}
                </span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-200 animate-pulse flex gap-3"
                  >
                    <div className="w-36 h-28 bg-slate-200 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                      <div className="h-4 bg-slate-200 rounded w-1/3" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                    </div>
                  </div>
                ))
              ) : filteredRooms.length > 0 ? (
                filteredRooms.map(({ room, distanceInKm }) => (
                  <RoomCard
                    key={room.maPhongTro}
                    room={room}
                    layout="horizontal"
                    distanceInKm={distanceInKm}
                    onSelect={(r) => setSelectedRoom(r)}
                    isSelected={activeSelectedRoom?.maPhongTro === room.maPhongTro}
                  />
                ))
              ) : (
                <div className="py-16 text-center text-slate-500">
                  <p className="text-sm font-bold text-slate-700">Không tìm thấy phòng phù hợp</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Hãy thử nới lỏng bộ lọc hoặc tìm kiếm theo từ khóa khác.
                  </p>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
              <span>
                {filteredRooms.length > 0
                  ? `Trang ${currentPage + 1}/${totalPages} (${totalElements} phòng)`
                  : '0 phòng'}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-all font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Trước
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-all font-semibold flex items-center gap-1 cursor-pointer"
                >
                  Tiếp <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 h-full bg-slate-100 rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm relative">
            <RoomMap
              rooms={rooms}
              selectedRoom={activeSelectedRoom}
              onSelectRoom={(r) => setSelectedRoom(r)}
              userCoords={userCoords}
              radiusKm={filterStore.radiusKm}
              onLocateUser={handleLocateUser}
              isLocating={isLocating}
            />
          </div>
        </div>
      </div>

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={() => setCurrentPage(0)}
      />
    </div>
  );
};
