// web/src/pages/SearchMapPage.tsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Sparkles,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronRight,
  ChevronLeft,
  X,
  MapPin,
} from "lucide-react";
import { Navbar } from "../components/layout/Navbar";
import { RoomCard } from "../components/room/RoomCard";
import { MapView, getValidCoords } from "../components/search/MapView";
import { FilterModal } from "../components/search/FilterModal";
import { roomService } from "../services/room.service";
import type { RoomSummaryResponse, RoomFilterRequest } from "../types/room.types";
import { useFilterStore } from "../store/useFilterStore";

function getDistanceInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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

export const SearchMapPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterStore = useFilterStore();

  const [searchInput, setSearchInput] = useState(
    searchParams.get("keyword") || filterStore.keyword || "Quận 3, TP. Hồ Chí Minh"
  );
  const [useAiSearch, setUseAiSearch] = useState(false);
  const [isAiSearching, setIsAiSearching] = useState(false);

  // Danh sách phòng & phân trang
  const [rooms, setRooms] = useState<RoomSummaryResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);

  // Lọc nâng cao & Map state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomSummaryResponse | null>(null);

  // Vị trí người dùng (GPS)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(
    filterStore.userLat && filterStore.userLng
      ? { lat: filterStore.userLat, lng: filterStore.userLng }
      : { lat: 10.7845, lng: 106.6844 } // Mặc định Quận 3 TP.HCM
  );
  const [isLocating, setIsLocating] = useState(false);

  // Sắp xếp
  const [sortBy, setSortBy] = useState<"NEWEST" | "PRICE_ASC" | "PRICE_DESC">("NEWEST");

  // Hàm tải dữ liệu phòng
  const fetchRooms = useCallback(async (page = 0) => {
    setLoading(true);
    try {
      if (useAiSearch && searchInput.trim()) {
        setIsAiSearching(true);
        const aiRooms = await roomService.aiSearchRooms(searchInput.trim(), 20);
        const content = aiRooms || [];
        setRooms(content);
        setTotalElements(content.length);
        setTotalPages(1);
        setCurrentPage(0);
        if (content.length > 0) {
          setSelectedRoom(content[0]);
        }
      } else {
        const filterReq: RoomFilterRequest = {
          keyword: searchInput.trim() || undefined,
          minGia: filterStore.minPrice,
          maxGia: filterStore.maxPrice,
          minDienTich: filterStore.minArea,
          maxDienTich: filterStore.maxArea,
          soNguoi: filterStore.capacity,
          maLpt: filterStore.categoryId,
          dsTienIch: filterStore.selectedAmenities,
          page: page,
          size: 15,
        };

        const res = await roomService.searchRooms(filterReq);
        const content = res.content || [];
        setRooms(content);
        setTotalElements(res.totalElements || content.length);
        setTotalPages(res.totalPages || 1);
        setCurrentPage(page);

        if (content.length > 0 && !selectedRoom) {
          setSelectedRoom(content[0]);
        }
      }
    } catch (error) {
      console.error("Lỗi khi tải phòng trọ:", error);
    } finally {
      setLoading(false);
      setIsAiSearching(false);
    }
  }, [searchInput, useAiSearch, filterStore, selectedRoom]);

  // Khởi động tải dữ liệu
  useEffect(() => {
    const kw = searchParams.get("keyword");
    if (kw) {
      setSearchInput(kw);
      filterStore.setKeyword(kw);
    }
    fetchRooms(0);
  }, []);

  // Đính kèm khoảng cách GPS cho từng phòng
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
            coords.lng
          );
        }
      }
      return { room, distanceInKm };
    });
  }, [rooms, userCoords]);

  // Bộ lọc bán kính theo userCoords (nếu filterStore.radiusKm có giá trị)
  const filteredRooms = useMemo(() => {
    if (!filterStore.radiusKm || !userCoords) return roomsWithDistance;
    return roomsWithDistance.filter((item) => {
      if (item.distanceInKm === null) return true;
      return item.distanceInKm <= (filterStore.radiusKm || 999);
    });
  }, [roomsWithDistance, filterStore.radiusKm, userCoords]);

  // Xử lý submit tìm kiếm
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    filterStore.setKeyword(searchInput);
    setSearchParams({ keyword: searchInput });
    fetchRooms(0);
  };

  // Định vị GPS thực tế
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert("Trình duyệt của bạn không hỗ trợ định vị GPS.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        filterStore.setUserLocation(coords.lat, coords.lng);
        setIsLocating(false);
      },
      (err) => {
        console.warn("Lỗi GPS:", err.message);
        alert("Không thể lấy vị trí hiện tại của bạn. Vui lòng cấp quyền vị trí.");
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Xóa bớt từng chip filter
  const removeFilter = (type: string) => {
    if (type === "price") filterStore.setPriceRange(undefined, undefined);
    if (type === "area") filterStore.setAreaRange(undefined, undefined);
    if (type === "capacity") filterStore.setCapacity(undefined);
    if (type === "category") filterStore.setCategoryId(undefined);
    if (type === "radius") filterStore.setRadiusKm(undefined);
    if (type === "amenities") filterStore.setSelectedAmenities([]);
    fetchRooms(0);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      {/* 1. Header Search & Filter Chips Bar (Khớp thiết kế chuẩn ảnh 2) */}
      <section className="bg-white border-b border-slate-200/90 py-3.5 px-4 sm:px-6 lg:px-8 sticky top-18 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto space-y-3">
          {/* Thanh Search Input */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 max-w-4xl"
          >
            <div className="flex-1 relative flex items-center">
              <div className="absolute left-3.5 text-slate-400">
                {isAiSearching ? (
                  <Sparkles className="w-5 h-5 text-teal-600 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Nhập địa điểm, quận hoặc mô tả bằng ngôn ngữ tự nhiên (AI)..."
                className="w-full pl-11 pr-28 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-sm font-semibold text-slate-900 rounded-full border border-slate-200 focus:border-teal-600 outline-none transition-all placeholder:text-slate-400"
              />

              {/* Nút bật/tắt AI Semantic Search */}
              <button
                type="button"
                onClick={() => setUseAiSearch(!useAiSearch)}
                title="Bật tìm kiếm thông minh bằng AI"
                className={`absolute right-2 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${
                  useAiSearch
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:text-teal-700"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Search</span>
              </button>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-full shadow-md shadow-blue-600/20 transition-all shrink-0"
            >
              Tìm kiếm
            </button>
          </form>

          {/* Dải Filter Chips (Hiển thị các tiêu chí lọc theo ảnh 2) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {/* Địa điểm chip */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 shrink-0">
              <MapPin className="w-3.5 h-3.5 text-teal-600" />
              <span>{searchInput || "Tất cả địa điểm"}</span>
            </div>

            {/* Giá chip */}
            {filterStore.minPrice !== undefined || filterStore.maxPrice !== undefined ? (
              <button
                type="button"
                onClick={() => removeFilter("price")}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 shrink-0"
              >
                <span>
                  {filterStore.minPrice ? `${filterStore.minPrice / 1e6}tr` : "0"} -{" "}
                  {filterStore.maxPrice ? `${filterStore.maxPrice / 1e6}tr` : "Max"}
                </span>
                <X className="w-3 h-3 text-teal-600" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(true)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
              >
                3–5 triệu
              </button>
            )}

            {/* Diện tích chip */}
            {filterStore.minArea !== undefined || filterStore.maxArea !== undefined ? (
              <button
                type="button"
                onClick={() => removeFilter("area")}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 shrink-0"
              >
                <span>
                  {filterStore.minArea || "0"} - {filterStore.maxArea || "Max"} m²
                </span>
                <X className="w-3 h-3 text-teal-600" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(true)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
              >
                15–35 m²
              </button>
            )}

            {/* Loại phòng chip */}
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(true)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
            >
              Phòng trọ
            </button>

            {/* Số người chip */}
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(true)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
            >
              1–2 người
            </button>

            {/* Tiện ích chip */}
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(true)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
            >
              Tiện ích · {filterStore.selectedAmenities.length || 3}
            </button>

            {/* Bán kính chip */}
            {filterStore.radiusKm ? (
              <button
                type="button"
                onClick={() => removeFilter("radius")}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 shrink-0"
              >
                <span>≤ {filterStore.radiusKm} km</span>
                <X className="w-3 h-3 text-teal-600" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(true)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
              >
                ≤ 3 km
              </button>
            )}

            {/* Nút Thêm bộ lọc (Mở FilterModal) */}
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Thêm bộ lọc</span>
              {filterStore.getActiveFilterCount() > 0 && (
                <span className="w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {filterStore.getActiveFilterCount()}
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* 2. Main Split View: Danh sách phòng bên trái (45%) & Bản đồ bên phải (55%) */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-180px)] min-h-[600px]">
          {/* CỘT TRÁI (45%): Danh sách phòng trọ */}
          <div className="lg:col-span-5 flex flex-col h-full bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            {/* Header thông tin kết quả */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  {totalElements} phòng tại {searchInput.split(",")[0] || "khu vực"}
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Cập nhật vừa xong · bản đồ tự động làm mới
                </p>
              </div>

              {/* Nút sắp xếp */}
              <button
                type="button"
                onClick={() =>
                  setSortBy((prev) =>
                    prev === "NEWEST"
                      ? "PRICE_ASC"
                      : prev === "PRICE_ASC"
                      ? "PRICE_DESC"
                      : "NEWEST"
                  )
                }
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {sortBy === "NEWEST"
                    ? "Mới nhất"
                    : sortBy === "PRICE_ASC"
                    ? "Giá tăng dần"
                    : "Giá giảm dần"}
                </span>
              </button>
            </div>

            {/* Danh sách phòng cuộn dọc */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {loading ? (
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
                    isSelected={selectedRoom?.maPhongTro === room.maPhongTro}
                  />
                ))
              ) : (
                <div className="py-16 text-center text-slate-500">
                  <p className="text-sm font-bold text-slate-700">
                    Không tìm thấy phòng phù hợp
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Hãy thử nới lỏng bộ lọc hoặc tìm kiếm theo từ khóa khác.
                  </p>
                </div>
              )}
            </div>

            {/* Thanh phân trang ở đáy danh sách */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
              <span>
                {filteredRooms.length > 0
                  ? `1–${filteredRooms.length} / ${totalElements} phòng`
                  : "0 phòng"}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 0}
                  onClick={() => fetchRooms(currentPage - 1)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-all font-semibold flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Trước
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => fetchRooms(currentPage + 1)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-all font-semibold flex items-center gap-1"
                >
                  Trang tiếp <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (55%): Bản đồ tương tác Leaflet Map */}
          <div className="lg:col-span-7 h-full bg-slate-100 rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm relative">
            <MapView
              rooms={rooms}
              selectedRoom={selectedRoom}
              onSelectRoom={(r) => setSelectedRoom(r)}
              userCoords={userCoords}
              radiusKm={filterStore.radiusKm}
              onLocateUser={handleLocateUser}
              isLocating={isLocating}
            />
          </div>
        </div>
      </div>

      {/* Modal bộ lọc nâng cao */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={() => fetchRooms(0)}
      />
    </div>
  );
};
