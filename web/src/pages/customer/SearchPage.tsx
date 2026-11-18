import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Radar,
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

  // Bán kính quét động (km) tự động thay đổi theo mức độ mở rộng / thu nhỏ của bản đồ
  const [dynamicRadiusKm, setDynamicRadiusKm] = useState<number>(5);

  // Vị trí GPS thật khi người dùng bấm định vị hoặc cấp quyền
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(
    filterStore.userLat && filterStore.userLng
      ? { lat: filterStore.userLat, lng: filterStore.userLng }
      : null,
  );
  const [isLocating, setIsLocating] = useState(false);
  const [sortBy, setSortBy] = useState<'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC'>('NEWEST');

  // 1. Tự động nhận diện GPS thực tế của người dùng khi vừa mở trang
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

  // 2. Tải danh sách phòng trọ từ Backend
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
        const aiRooms = await roomService.aiSearchRooms(submittedKeyword.trim(), 30);
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
        size: 50, // Tải tối đa 50 phòng để khi mở rộng bản đồ vẫn hiển thị đầy đủ
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

  // 3. Tâm quét hiệu lực: Ưu tiên GPS thật, nếu chưa có thì tự động căn vào phòng đầu tiên đang xem
  const activeCenterCoords = useMemo(() => {
    if (gpsCoords) return gpsCoords;
    if (rooms.length > 0) {
      const firstValid = getValidCoords(rooms[0]);
      if (firstValid) return firstValid;
    }
    return { lat: 21.0285, lng: 105.8542 };
  }, [gpsCoords, rooms]);

  const activeSelectedRoom = useMemo(() => {
    if (selectedRoom && rooms.some((r) => r.maPhongTro === selectedRoom.maPhongTro)) {
      return selectedRoom;
    }
    return rooms[0] ?? null;
  }, [rooms, selectedRoom]);

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

  // Lọc các phòng nằm trong bán kính quét hiện tại
  const filteredRooms = useMemo(() => {
    if (!activeCenterCoords) return roomsWithDistance;
    return roomsWithDistance.filter((item) => {
      if (item.distanceInKm === null) return true;
      return item.distanceInKm <= effectiveRadius;
    });
  }, [roomsWithDistance, effectiveRadius, activeCenterCoords]);

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
        setGpsCoords(coords);
        setUserLocation(coords.lat, coords.lng);
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
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans">
      {/* Header hệ thống cố định ở đỉnh */}
      <Header />

      {/* Thanh tìm kiếm & bộ lọc nhanh thu gọn gàng gàng, không chiếm nhiều diện tích */}
      <section className="bg-white border-b border-slate-200/90 py-2.5 px-4 sm:px-6 shrink-0 z-30 shadow-2xs">
        <div className="max-w-[1440px] mx-auto space-y-2">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-4xl">
            <div className="flex-1 relative flex items-center">
              <div className="absolute left-3.5 text-slate-400">
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
                placeholder="Nhập địa điểm, quận hoặc mô tả tự nhiên (AI Vector Search)..."
                className="w-full pl-10 pr-26 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs sm:text-sm font-semibold text-slate-900 rounded-full border border-slate-200 focus:border-teal-600 outline-none transition-all placeholder:text-slate-400"
              />

              <button
                type="button"
                onClick={() => setUseAiSearch(!useAiSearch)}
                title="Bật tìm kiếm ngữ nghĩa AI Gemini"
                className={`absolute right-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  useAiSearch
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-teal-700'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>AI Search</span>
              </button>
            </div>

            <button
              type="submit"
              className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-full shadow-md shadow-blue-600/20 transition-all shrink-0 cursor-pointer"
            >
              Tìm kiếm
            </button>
          </form>

          {/* Dãy nhãn bộ lọc nhanh */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200 shrink-0">
              <MapPin className="w-3 h-3 text-teal-600" />
              <span>{submittedKeyword || 'Toàn quốc'}</span>
            </div>

            {filterStore.minPrice !== undefined || filterStore.maxPrice !== undefined ? (
              <button
                type="button"
                onClick={() => removeFilter('price')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200 shrink-0 cursor-pointer"
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
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200 shrink-0 cursor-pointer"
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
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200 shrink-0 cursor-pointer"
              >
                <span>Tiện ích · {filterStore.selectedAmenities.length}</span>
                <X className="w-3 h-3 text-teal-600" />
              </button>
            )}

            {/* Chip bán kính quét (Cố định hoặc Động theo bản đồ) */}
            {filterStore.radiusKm ? (
              <button
                type="button"
                onClick={() => removeFilter('radius')}
                title="Bấm để chuyển về quét động theo mức mở rộng bản đồ"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200 shrink-0 cursor-pointer"
              >
                <Radar className="w-3 h-3 text-teal-600" />
                <span>Cố định: ≤ {filterStore.radiusKm} km</span>
                <X className="w-3 h-3 text-teal-600" />
              </button>
            ) : (
              <div
                title="Bán kính tự động mở rộng khi bạn thu nhỏ hoặc phóng to bản đồ"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200 shrink-0"
              >
                <Radar className="w-3 h-3 text-teal-600 animate-pulse" />
                <span>Quét bản đồ: ≤ {dynamicRadiusKm} km</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsFilterModalOpen(true)}
              className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Bộ lọc nâng cao</span>
              {filterStore.getActiveFilterCount() > 0 && (
                <span className="w-3.5 h-3.5 rounded-full bg-teal-600 text-white text-[9px] flex items-center justify-center font-bold">
                  {filterStore.getActiveFilterCount()}
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Khung nội dung 2 cột: Danh sách phòng bên trái (cuộn độc lập) & Bản đồ bên phải */}
      <div className="flex-1 min-h-0 w-full max-w-[1440px] mx-auto px-3 sm:px-6 py-2.5 sm:py-3 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 h-full">
          {/* Cột trái: Danh sách phòng trọ */}
          <div className="lg:col-span-5 flex flex-col h-full bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  {filteredRooms.length} phòng phù hợp
                </h2>
                <p className="text-[10px] text-slate-400">
                  Đồng bộ với bản đồ (Bán kính ≤ {effectiveRadius} km)
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
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowUpDown className="w-3 h-3 text-slate-500" />
                <span>
                  {sortBy === 'NEWEST'
                    ? 'Mới nhất'
                    : sortBy === 'PRICE_ASC'
                      ? 'Giá tăng'
                      : 'Giá giảm'}
                </span>
              </button>
            </div>

            {/* Danh sách phòng cuộn độc lập bên trong */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2.5">
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 animate-pulse flex gap-3"
                  >
                    <div className="w-32 h-24 bg-slate-200 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                      <div className="h-3.5 bg-slate-200 rounded w-1/3" />
                      <div className="h-2.5 bg-slate-200 rounded w-1/2" />
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
                <div className="py-14 text-center text-slate-500">
                  <p className="text-xs font-bold text-slate-700">Không tìm thấy phòng phù hợp</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Hãy thử nới lỏng bộ lọc hoặc mở rộng bản đồ để tìm thêm phòng.
                  </p>
                </div>
              )}
            </div>

            {/* Phân trang chân danh sách */}
            <div className="px-4 py-1.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-600 shrink-0">
              <span>
                {filteredRooms.length > 0
                  ? `Trang ${currentPage + 1}/${totalPages} (${totalElements} phòng tải về)`
                  : '0 phòng'}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  className="px-2 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-all font-semibold flex items-center gap-0.5 cursor-pointer text-[11px]"
                >
                  <ChevronLeft className="w-3 h-3" /> Trước
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="px-2 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-all font-semibold flex items-center gap-0.5 cursor-pointer text-[11px]"
                >
                  Tiếp <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Cột phải: Bản đồ tương tác với Chấm tròn xanh GPS & Vòng tròn quét */}
          <div className="lg:col-span-7 h-full bg-slate-100 rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs relative">
            <RoomMap
              rooms={rooms}
              selectedRoom={activeSelectedRoom}
              onSelectRoom={(r) => setSelectedRoom(r)}
              userCoords={activeCenterCoords}
              radiusKm={effectiveRadius}
              onRadiusChange={(r) => setDynamicRadiusKm(r)}
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
