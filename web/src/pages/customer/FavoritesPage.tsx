import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Heart, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AppButton } from '@/components/common/AppButton';
import { EmptyState } from '@/components/common/EmptyState';
import { PageContainer, PageHeader } from '@/components/common/PageContainer';
import { SkeletonList } from '@/components/common/SkeletonList';
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

  const resetFilters = () => {
    setSearchTerm('');
    setCityFilter('Tất cả');
    setPriceFilter('Tất cả');
    setSortOption('NEWEST');
  };

  return (
    <PageContainer width="narrow" className="space-y-6">
      <PageHeader
        title="Phòng yêu thích"
        subtitle={`${rooms.length} phòng đã lưu · đồng bộ tự động giá và trạng thái còn trống`}
        action={
          <AppButton variant="primary" size="md" onClick={() => navigate('/search')}>
            Tìm thêm phòng
          </AppButton>
        }
      />

      {rooms.length > 0 && (
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 relative flex items-center">
            <Search className="w-4 h-4 text-slate-500 absolute left-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên phòng, quận, địa chỉ..."
              className="w-full h-10 pl-9 pr-3 text-sm text-slate-900 bg-transparent outline-none placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="h-9 px-3 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 outline-none cursor-pointer"
            >
              <option value="Tất cả">Khu vực: Tất cả</option>
              <option value="Hồ Chí Minh">TP.HCM</option>
              <option value="Hà Nội">Hà Nội</option>
              <option value="Đà Nẵng">Đà Nẵng</option>
            </select>

            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="h-9 px-3 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 outline-none cursor-pointer"
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
              className="h-9 px-3 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 outline-none cursor-pointer"
            >
              <option value="NEWEST">Mới lưu nhất</option>
              <option value="PRICE_ASC">Giá thấp đến cao</option>
              <option value="PRICE_DESC">Giá cao đến thấp</option>
            </select>
          </div>
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
        <SkeletonList
          variant="cards"
          count={2}
          columnsClassName="grid-cols-1 sm:grid-cols-2"
        />
      ) : filteredRooms.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
