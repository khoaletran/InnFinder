import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, Home as HomeIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AppButton } from '@/components/common/AppButton';
import { EmptyState } from '@/components/common/EmptyState';
import { PageContainer } from '@/components/common/PageContainer';
import { SkeletonList } from '@/components/common/SkeletonList';
import { RoomCard } from '@/components/room/RoomCard';
import { roomService } from '@/services/room.service';

export const FeaturedRoomsSection: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  const { data: roomTypes = [] } = useQuery({
    queryKey: ['categories', 'room-types'],
    queryFn: roomService.getRoomTypes,
  });

  const {
    data: roomsPage,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['rooms', 'landing-featured', selectedCategoryId],
    queryFn: () =>
      roomService.searchRooms({
        page: 0,
        size: 8,
        maLpt: selectedCategoryId || undefined,
      }),
  });

  const rooms = roomsPage?.content || [];

  return (
    <PageContainer width="wide" className="pb-12 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Phòng mới đăng & đã kiểm duyệt
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Lọc nhanh theo loại phòng hoặc xem toàn bộ trên bản đồ tương tác
          </p>
        </div>
        <Link
          to="/search"
          className="text-sm font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 shrink-0"
        >
          <span>Xem tất cả</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Thanh lọc nhanh theo Loại phòng trọ */}
      {roomTypes.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategoryId('')}
            className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
              selectedCategoryId === ''
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white text-slate-700 border-slate-200 hover:border-teal-400 hover:text-teal-800'
            }`}
          >
            Tất cả loại phòng
          </button>
          {roomTypes.map((cat) => {
            const id = cat.maLpt || cat.maLoaiPhong || '';
            const label = cat.tenLoaiPhongTro || cat.tenLoaiPhong || 'Phòng trọ';
            if (!id) return null;
            const isActive = selectedCategoryId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedCategoryId(id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-teal-400 hover:text-teal-800'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {error ? (
        <div className="bg-white rounded-2xl border border-red-200 p-6 text-center space-y-3 shadow-xs">
          <AlertCircle className="w-7 h-7 text-red-600 mx-auto" />
          <p className="text-sm font-bold text-slate-900">Không thể tải danh sách phòng mới</p>
          <AppButton variant="primary" size="sm" onClick={() => void refetch()}>
            Thử lại
          </AppButton>
        </div>
      ) : isLoading ? (
        <SkeletonList
          variant="cards"
          count={4}
          columnsClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        />
      ) : rooms.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {rooms.map((room) => (
            <RoomCard key={room.maPhongTro} room={room} layout="vertical" />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Chưa có phòng phù hợp trong danh mục này"
          description="Bạn có thể chọn loại phòng khác hoặc mở trang Tìm phòng để xem toàn bộ trên bản đồ."
          icon={<HomeIcon className="w-6 h-6" />}
          action={
            selectedCategoryId ? (
              <AppButton variant="secondary" size="md" onClick={() => setSelectedCategoryId('')}>
                Xem tất cả loại phòng
              </AppButton>
            ) : (
              <AppButton variant="primary" size="md" onClick={() => navigate('/search')}>
                Tìm phòng trên bản đồ
              </AppButton>
            )
          }
        />
      )}
    </PageContainer>
  );
};
