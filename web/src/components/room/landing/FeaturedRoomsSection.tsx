import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, Building2, ChevronRight, Home as HomeIcon, PawPrint, GraduationCap, Sofa } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AppButton } from '@/components/common/AppButton';
import { EmptyState } from '@/components/common/EmptyState';
import { PageContainer } from '@/components/common/PageContainer';
import { SkeletonList } from '@/components/common/SkeletonList';
import { RoomCard } from '@/components/room/RoomCard';
import { roomService } from '@/services/room.service';

type QuickFilterKey = 'gac_lung' | 'gan_dh' | 'thu_cung' | 'full_noi_that' | 'duoi_3tr' | null;

const QUICK_FILTER_KEYWORDS: Record<Exclude<QuickFilterKey, null | 'duoi_3tr'>, string> = {
  gac_lung: 'gác lửng',
  gan_dh: 'đại học',
  thu_cung: 'thú cưng',
  full_noi_that: 'full nội thất',
};

const QUICK_FILTER_ITEMS: { key: Exclude<QuickFilterKey, null>; label: string; Icon: LucideIcon }[] = [
  { key: 'gac_lung', label: 'Có gác lửng', Icon: HomeIcon },
  { key: 'gan_dh', label: 'Gần ĐH', Icon: GraduationCap },
  { key: 'thu_cung', label: 'Nuôi thú cưng', Icon: PawPrint },
  { key: 'full_noi_that', label: 'Full nội thất', Icon: Sofa },
  { key: 'duoi_3tr', label: 'Dưới 3 triệu', Icon: Building2 },
];

export const FeaturedRoomsSection: React.FC = () => {
  const navigate = useNavigate();
  const categoriesRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState('recommended');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<QuickFilterKey>(null);

  const { data: roomTypes = [] } = useQuery({
    queryKey: ['categories', 'room-types'],
    queryFn: roomService.getRoomTypes,
    staleTime: 10 * 60 * 1000,
  });

  const quickKeyword =
    selectedQuickFilter && selectedQuickFilter !== 'duoi_3tr'
      ? QUICK_FILTER_KEYWORDS[selectedQuickFilter]
      : undefined;

  const {
    data: roomsPage,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['rooms', 'landing-featured', selectedCategoryId, selectedQuickFilter, tab],
    staleTime: 2 * 60 * 1000,
    queryFn: () =>
      roomService.searchRooms({
        page: 0,
        size: 25,
        minDiemUyTin: 81,
        sortBy: tab === 'price' ? 'giaThue' : tab === 'new' ? 'thoiGianDang' : undefined,
        sortDirection: tab === 'price' ? 'ASC' : tab === 'new' ? 'DESC' : undefined,
        maLpt: selectedCategoryId || undefined,
        keyword: quickKeyword,
        maxGia: selectedQuickFilter === 'duoi_3tr' ? 3000000 : undefined,
      }),
  });

  const baseRooms = (roomsPage?.content || []).filter((room) => (room.diemUyTinChuTro ?? 0) > 80);
  const rooms = (
    tab === 'recommended'
      ? [...baseRooms].sort((a, b) => (b.diemUyTinChuTro ?? 0) - (a.diemUyTinChuTro ?? 0))
      : baseRooms
  ).slice(0, 25);

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

      <div className="flex items-center gap-2">
        <div ref={categoriesRef} className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-2" aria-label="Danh mục tìm phòng">
          {[{ id: '', label: 'Tất cả' }, ...roomTypes.map((cat) => ({
            id: cat.maLpt || cat.maLoaiPhong || '', label: cat.tenLoaiPhongTro || cat.tenLoaiPhong || 'Phòng trọ',
          })).filter(({ id }) => id)].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={id === '' ? !selectedCategoryId && !selectedQuickFilter : selectedCategoryId === id}
              onClick={() => {
                if (id === '') {
                  setSelectedCategoryId('');
                  setSelectedQuickFilter(null);
                  return;
                }
                setSelectedCategoryId(id);
              }}
              className="grid min-w-24 shrink-0 justify-items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 aria-pressed:border-teal-600 aria-pressed:bg-teal-50 cursor-pointer"
            >
              <Building2 aria-hidden="true" className="size-5 text-teal-700" />{label}
            </button>
          ))}
          {QUICK_FILTER_ITEMS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              aria-pressed={selectedQuickFilter === key}
              onClick={() => setSelectedQuickFilter((prev) => (prev === key ? null : key))}
              className="grid min-w-24 shrink-0 justify-items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 aria-pressed:border-teal-600 aria-pressed:bg-teal-50 cursor-pointer"
            >
              <Icon aria-hidden="true" className="size-5 text-teal-700" />{label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={tab === 'new'}
            onClick={() => setTab((prev) => (prev === 'new' ? 'recommended' : 'new'))}
            className="grid min-w-24 shrink-0 justify-items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 aria-pressed:border-teal-600 aria-pressed:bg-teal-50 cursor-pointer"
          >
            <Building2 aria-hidden="true" className="size-5 text-teal-700" />Mới đăng
          </button>
        </div>
        <button type="button" aria-label="Xem thêm danh mục" className="grid size-9 shrink-0 place-items-center rounded-full border bg-white text-teal-800 cursor-pointer" onClick={() => {
          const row = categoriesRef.current;
          if (row) row.scrollBy({ left: row.scrollLeft + row.clientWidth >= row.scrollWidth - 2 ? -row.scrollWidth : row.clientWidth });
        }}><ChevronRight aria-hidden="true" className="size-5" /></button>
      </div>
      <div role="group" aria-label="Thứ tự hiển thị phòng" className="flex flex-wrap gap-2 border-b border-slate-200">
        {[[ 'recommended', 'Dành cho bạn' ], [ 'new', 'Mới nhất' ], [ 'price', 'Giá tốt' ]].map(([key, label]) => (
          <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}
            className="border-b-2 border-transparent px-3 py-2 text-sm font-semibold text-slate-600 aria-pressed:border-teal-700 aria-pressed:text-teal-800 cursor-pointer">{label}</button>
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
          description="Bạn có thể chọn tiêu chí khác hoặc mở trang Tìm phòng để xem toàn bộ danh sách."
          icon={<HomeIcon className="w-6 h-6" />}
          action={
            selectedCategoryId || selectedQuickFilter ? (
              <AppButton
                variant="secondary"
                size="md"
                onClick={() => {
                  setSelectedCategoryId('');
                  setSelectedQuickFilter(null);
                }}
              >
                Xem tất cả phòng nổi bật
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
