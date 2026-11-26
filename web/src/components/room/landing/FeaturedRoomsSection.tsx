import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, Building2, ChevronRight, Home as HomeIcon, PawPrint, GraduationCap, Sofa } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AppButton } from '@/components/common/AppButton';
import { EmptyState } from '@/components/common/EmptyState';
import { PageContainer } from '@/components/common/PageContainer';
import { SkeletonList } from '@/components/common/SkeletonList';
import { RoomCard } from '@/components/room/RoomCard';
import { useRoomFilterStore } from '@/store/useRoomFilterStore';
import { roomService } from '@/services/room.service';

export const FeaturedRoomsSection: React.FC = () => {
  const navigate = useNavigate();
  const categoriesRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState('recommended');
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
    queryKey: ['rooms', 'landing-featured', selectedCategoryId, tab],
    queryFn: () =>
      roomService.searchRooms({
        page: 0,
        size: 12,
        sortBy: tab === 'price' ? 'giaThue' : tab === 'new' ? 'thoiGianDang' : undefined,
        sortDirection: tab === 'price' ? 'ASC' : tab === 'new' ? 'DESC' : undefined,
        maLpt: selectedCategoryId || undefined,
      }),
  });

  const rooms = roomsPage?.content || [];

  return (
    <PageContainer width="wide" className="space-y-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Phòng nổi bật
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

      <div className="flex items-center gap-2">
        <div ref={categoriesRef} className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-2" aria-label="Danh mục tìm phòng">
          {[{ id: '', label: 'Tất cả' }, ...roomTypes.map((cat) => ({
            id: cat.maLpt || cat.maLoaiPhong || '', label: cat.tenLoaiPhongTro || cat.tenLoaiPhong || 'Phòng trọ',
          })).filter(({ id }) => id)].map(({ id, label }) => (
            <button key={id} type="button" aria-pressed={selectedCategoryId === id} onClick={() => setSelectedCategoryId(id)}
              className="grid min-w-24 shrink-0 justify-items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 aria-pressed:border-teal-600 aria-pressed:bg-teal-50">
              <Building2 aria-hidden="true" className="size-5 text-teal-700" />{label}
            </button>
          ))}
          {[{ label: 'Có gác lửng', Icon: HomeIcon }, { label: 'Gần ĐH', Icon: GraduationCap }, { label: 'Nuôi thú cưng', Icon: PawPrint }, { label: 'Full nội thất', Icon: Sofa }, { label: 'Dưới 3 triệu', Icon: Building2 }, { label: 'Mới đăng', Icon: Building2 }].map(({ label, Icon }) => (
            <button key={label} type="button" className="grid min-w-24 shrink-0 justify-items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              onClick={() => {
                if (label === 'Mới đăng') { setTab('new'); return; }
                const filters = useRoomFilterStore.getState();
                filters.resetFilter();
                if (label === 'Dưới 3 triệu') { filters.setPriceRange(undefined, 3000000); navigate('/search'); return; }
                navigate('/search?keyword=' + encodeURIComponent(label));
              }}>
              <Icon aria-hidden="true" className="size-5 text-teal-700" />{label}
            </button>
          ))}
        </div>
        <button type="button" aria-label="Xem thêm danh mục" className="grid size-9 shrink-0 place-items-center rounded-full border bg-white text-teal-800" onClick={() => {
          const row = categoriesRef.current;
          if (row) row.scrollBy({ left: row.scrollLeft + row.clientWidth >= row.scrollWidth - 2 ? -row.scrollWidth : row.clientWidth });
        }}><ChevronRight aria-hidden="true" className="size-5" /></button>
      </div>
      <div role="group" aria-label="Thứ tự hiển thị phòng" className="flex flex-wrap gap-2 border-b border-slate-200">
        {[[ 'recommended', 'Dành cho bạn' ], [ 'new', 'Mới nhất' ], [ 'price', 'Giá tốt' ]].map(([key, label]) => (
          <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}
            className="border-b-2 border-transparent px-3 py-2 text-sm font-semibold text-slate-600 aria-pressed:border-teal-700 aria-pressed:text-teal-800">{label}</button>
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
