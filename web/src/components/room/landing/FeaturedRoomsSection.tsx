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

type FeaturedTab = 'recommended' | 'new' | 'price';

export const FeaturedRoomsSection: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<FeaturedTab>('recommended');

  const {
    data: roomsPage,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['rooms', 'landing-featured', tab],
    staleTime: 2 * 60 * 1000,
    queryFn: () =>
      roomService.searchRooms({
        page: 0,
        size: 30,
        minDiemUyTin: 81,
        sortBy: tab === 'price' ? 'giaThue' : 'thoiGianDang',
        sortDirection: tab === 'price' ? 'ASC' : 'DESC',
      }),
  });

  const baseRooms = (roomsPage?.content || []).filter((room) => (room.diemUyTinChuTro ?? 0) > 80);
  const rooms = [...baseRooms]
    .sort((a, b) => {
      if (tab === 'price') {
        return (a.giaThue ?? 0) - (b.giaThue ?? 0);
      }
      if (tab === 'new') {
        const timeA = a.thoiGianDang ? new Date(a.thoiGianDang).getTime() : 0;
        const timeB = b.thoiGianDang ? new Date(b.thoiGianDang).getTime() : 0;
        return timeB - timeA;
      }
      const repDiff = (b.diemUyTinChuTro ?? 0) - (a.diemUyTinChuTro ?? 0);
      if (repDiff !== 0) return repDiff;
      const timeA = a.thoiGianDang ? new Date(a.thoiGianDang).getTime() : 0;
      const timeB = b.thoiGianDang ? new Date(b.thoiGianDang).getTime() : 0;
      return timeB - timeA;
    })
    .slice(0, 30);

  return (
    <PageContainer width="wide" className="space-y-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Phòng nổi bật
          </h2>
        </div>
        <Link
          to="/search"
          className="text-sm font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 shrink-0"
        >
          <span>Xem tất cả</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div role="group" aria-label="Thứ tự hiển thị phòng" className="flex flex-wrap gap-2 border-b border-slate-200">
        {([
          ['recommended', 'Dành cho bạn'],
          ['new', 'Mới nhất'],
          ['price', 'Giá tốt'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
            className="border-b-2 border-transparent px-3 py-2 text-sm font-semibold text-slate-600 aria-pressed:border-teal-700 aria-pressed:text-teal-800 cursor-pointer"
          >
            {label}
          </button>
        ))}
      </div>

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
          columnsClassName="grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6"
        />
      ) : rooms.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {rooms.map((room) => (
            <RoomCard key={room.maPhongTro} room={room} layout="vertical" homeCompact />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Chưa có phòng nổi bật phù hợp"
          description="Bạn có thể mở trang Tìm phòng để xem toàn bộ phòng trên danh sách hoặc bản đồ."
          icon={<HomeIcon className="w-6 h-6" />}
          action={
            <AppButton variant="primary" size="md" onClick={() => navigate('/search/map')}>
              Tìm phòng trên bản đồ
            </AppButton>
          }
        />
      )}
    </PageContainer>
  );
};
