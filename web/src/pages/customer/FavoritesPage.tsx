import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Heart, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { RoomCard } from '@/components/room/RoomCard';
import { roomService } from '@/services/room.service';
import { useAuthStore } from '@/store/useAuthStore';
import { useFavoriteStore } from '@/store/useFavoriteStore';

export const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { favoriteIds, localFavoriteRooms, loadFavorites, removeFavorite } = useFavoriteStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('Tất cả');
  const [priceFilter, setPriceFilter] = useState('Tất cả');
  const [sortOption, setSortOption] = useState<'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC'>('NEWEST');

  useEffect(() => {
    loadFavorites(isAuthenticated);
  }, [isAuthenticated, loadFavorites]);

  const { data: catalogPage, isLoading } = useQuery({
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

  const filteredRooms = useMemo(() => {
    const list = rooms.filter((r) => {
      const title = r.tieuDe || r.diaChi;
      const matchSearch =
        !searchTerm.trim() ||
        title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.diaChi.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCity =
        cityFilter === 'Tất cả' || r.diaChi.toLowerCase().includes(cityFilter.toLowerCase());

      let matchPrice = true;
      if (priceFilter === 'Dưới 3tr') matchPrice = r.giaThue < 3_000_000;
      if (priceFilter === '3-5tr') matchPrice = r.giaThue >= 3_000_000 && r.giaThue <= 5_000_000;
      if (priceFilter === 'Trên 5tr') matchPrice = r.giaThue > 5_000_000;

      return matchSearch && matchCity && matchPrice;
    });

    if (sortOption === 'PRICE_ASC') {
      return [...list].sort((a, b) => a.giaThue - b.giaThue);
    }
    if (sortOption === 'PRICE_DESC') {
      return [...list].sort((a, b) => b.giaThue - a.giaThue);
    }
    return list;
  }, [rooms, searchTerm, cityFilter, priceFilter, sortOption]);

  const handleRemoveFavorite = async (roomId: string) => {
    await removeFavorite(roomId, isAuthenticated);
    toast.success('Đã xóa phòng khỏi danh sách yêu thích');
  };

  return (
    <div className="max-w-6xl w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Phòng yêu thích</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {rooms.length} phòng đã lưu · đồng bộ tự động giá và trạng thái còn trống
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/search')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-full shadow-md shadow-blue-600/25 flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
        >
          <span>Tìm thêm phòng</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl p-2.5 sm:p-2 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="flex-1 relative flex items-center px-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên phòng, quận, địa chỉ..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm font-medium text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
          />
        </div>

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
              setSortOption(e.target.value as 'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC')
            }
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 outline-none cursor-pointer hover:bg-slate-100"
          >
            <option value="NEWEST">Mới lưu nhất</option>
            <option value="PRICE_ASC">Giá thấp đến cao</option>
            <option value="PRICE_DESC">Giá cao đến thấp</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Đang đồng bộ danh sách phòng yêu thích..." />
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
        <EmptyState
          title="Bạn chưa lưu phòng yêu thích nào"
          description="Nhấn biểu tượng trái tim trên bất kỳ tin phòng nào để lưu lại so sánh và đặt lịch xem nhanh."
          icon={<Heart className="w-7 h-7 text-rose-400" />}
          action={
            <button
              type="button"
              onClick={() => navigate('/search')}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-full shadow-md cursor-pointer"
            >
              Khám phá phòng ngay
            </button>
          }
        />
      )}
    </div>
  );
};
