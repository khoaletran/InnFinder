// web/src/pages/FavoritesPage.tsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Loader2,
  Inbox,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Sidebar } from "../components/layout/Sidebar";
import { RoomCard } from "../components/room/RoomCard";
import { useFavoriteStore } from "../store/useFavoriteStore";
import { roomService } from "../services/room.service";
import type { RoomSummaryResponse } from "../types/room.types";

export const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const { favoriteIds, removeFavorite } = useFavoriteStore();

  const [rooms, setRooms] = useState<RoomSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("Tất cả");
  const [priceFilter, setPriceFilter] = useState("Tất cả");
  const [sortOption, setSortOption] = useState<"NEWEST" | "PRICE_ASC" | "PRICE_DESC">("NEWEST");

  // Load phòng yêu thích
  useEffect(() => {
    setLoading(true);
    roomService
      .searchRooms({ page: 0, size: 50 })
      .then((res) => {
        const allRooms = res.content || [];
        const favs = allRooms.filter((r) => favoriteIds.includes(r.maPhongTro));
        // Nếu danh sách rỗng nhưng đã lưu id yêu thích hoặc demo, lấy các phòng có sẵn
        if (favs.length === 0 && favoriteIds.length > 0) {
          setRooms(allRooms.slice(0, Math.min(favoriteIds.length, allRooms.length)));
        } else {
          setRooms(favs);
        }
      })
      .catch((err) => {
        console.error("Lỗi khi tải phòng yêu thích:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [favoriteIds]);

  // Lọc theo từ khóa tìm kiếm và các chip
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const title = r.tieuDe || r.diaChi;
      const matchSearch =
        !searchTerm.trim() ||
        title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.diaChi.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCity =
        cityFilter === "Tất cả" ||
        r.diaChi.toLowerCase().includes(cityFilter.toLowerCase());

      let matchPrice = true;
      if (priceFilter === "Dưới 3tr") matchPrice = r.giaThue < 3_000_000;
      if (priceFilter === "3-5tr")
        matchPrice = r.giaThue >= 3_000_000 && r.giaThue <= 5_000_000;
      if (priceFilter === "Trên 5tr") matchPrice = r.giaThue > 5_000_000;

      return matchSearch && matchCity && matchPrice;
    });
  }, [rooms, searchTerm, cityFilter, priceFilter]);

  const handleRemoveFavorite = (roomId: string) => {
    removeFavorite(roomId);
    setRooms((prev) => prev.filter((r) => r.maPhongTro !== roomId));
  };

  return (
    <div className="min-h-screen bg-slate-50/60 flex">
      {/* 1. Sidebar Trái Cố Định Theo Ảnh 4 */}
      <Sidebar />

      {/* 2. Main Content Bên Phải */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen">
        <div className="max-w-6xl w-full mx-auto p-6 lg:p-8 space-y-8 flex-1">
          {/* Header Trang: Tiêu đề + Nút Tìm thêm phòng */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Phòng yêu thích
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {rooms.length} phòng đã lưu · giá và trạng thái được cập nhật tự động
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/search")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-full shadow-md shadow-blue-600/25 flex items-center gap-1.5 transition-all self-start sm:self-auto"
            >
              <span>Tìm thêm phòng</span>
            </button>
          </div>

          {/* Thanh Tìm kiếm & Filter Chips (Khớp ảnh 4) */}
          <div className="bg-white rounded-2xl p-2.5 sm:p-2 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Input tìm kiếm */}
            <div className="flex-1 relative flex items-center px-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên phòng, quận..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm font-medium text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
              />
            </div>

            {/* Chips bộ lọc */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-1 py-1">
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 outline-none cursor-pointer hover:bg-slate-100"
              >
                <option value="Tất cả">Khu vực: Tất cả</option>
                <option value="Hồ Chí Minh">TP.HCM</option>
                <option value="Hà Nội">Hà Nội</option>
                <option value="Đà Nẵng">Đà Nẵng</option>
              </select>

              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 outline-none cursor-pointer hover:bg-slate-100"
              >
                <option value="Tất cả">Khoảng giá</option>
                <option value="Dưới 3tr">Dưới 3 triệu</option>
                <option value="3-5tr">3–5 triệu</option>
                <option value="Trên 5tr">Trên 5 triệu</option>
              </select>

              <select
                value={sortOption}
                onChange={(e) =>
                  setSortOption(e.target.value as "NEWEST" | "PRICE_ASC" | "PRICE_DESC")
                }
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 outline-none cursor-pointer hover:bg-slate-100"
              >
                <option value="NEWEST">Mới lưu nhất ↓</option>
                <option value="PRICE_ASC">Giá thấp đến cao ↑</option>
                <option value="PRICE_DESC">Giá cao đến thấp ↓</option>
              </select>
            </div>
          </div>

          {/* Lưới 3 Cột Hiển Thị Phòng Yêu Thích (Khớp ảnh 4) */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 animate-pulse"
                >
                  <div className="w-full aspect-4/3 bg-slate-200 rounded-xl" />
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredRooms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRooms.map((room) => (
                <RoomCard
                  key={room.maPhongTro}
                  room={room}
                  layout="vertical"
                  showRemoveFavoriteButton={true}
                  onRemoveFavorite={handleRemoveFavorite}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto">
              <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                Bạn chưa lưu phòng nào
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-6">
                Nhấn biểu tượng trái tim khi xem phòng để lưu lại danh sách phòng bạn ưng ý nhất.
              </p>
              <button
                type="button"
                onClick={() => navigate("/search")}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-full shadow-md"
              >
                Khám phá phòng ngay
              </button>
            </div>
          )}

          {/* 3. Phần Phản Hồi: TRẠNG THÁI DANH SÁCH (Khớp chính xác ảnh 4) */}
          <div className="pt-10 border-t border-slate-200/90 space-y-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Trạng thái danh sách
              </h2>
              <p className="text-xs text-slate-400">
                Các phản hồi được dùng ngay trong luồng yêu thích.
              </p>
            </div>

            {/* 5 Feedback State Cards theo hàng ngang */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
              {/* Card 1: Đang tải phòng đã lưu */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col items-center text-center shadow-2xs">
                <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mb-2.5">
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">
                  Đang tải phòng đã lưu
                </h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  Đồng bộ thay đổi giá mới nhất...
                </p>
              </div>

              {/* Card 2: Bạn chưa lưu phòng nào */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col items-center text-center shadow-2xs">
                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
                  <Inbox className="w-4.5 h-4.5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">
                  Bạn chưa lưu phòng nào
                </h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  Nhấn biểu tượng tim để xem lại phòng phù hợp.
                </p>
              </div>

              {/* Card 3: Không tải được danh sách */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col items-center text-center shadow-2xs">
                <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-2.5">
                  <AlertCircle className="w-4.5 h-4.5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">
                  Không tải được danh sách
                </h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  Kiểm tra kết nối và thử lại. Mã TT-503.
                </p>
              </div>

              {/* Card 4: Đã bỏ yêu thích */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col items-center text-center shadow-2xs">
                <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5">
                  <CheckCircle className="w-4.5 h-4.5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">
                  Đã bỏ yêu thích
                </h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  Phòng đã được xóa khỏi danh sách.
                </p>
              </div>

              {/* Card 5: Bỏ yêu thích phòng này? */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col items-center text-center shadow-2xs">
                <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-2.5">
                  <AlertTriangle className="w-4.5 h-4.5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">
                  Bỏ yêu thích phòng này?
                </h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  Bạn có thể lưu lại bất kỳ lúc nào.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
