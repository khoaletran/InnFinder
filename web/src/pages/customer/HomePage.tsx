import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  CalendarCheck,
  Eye,
  Home as HomeIcon,
  Search,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AppButton } from '@/components/common/AppButton';
import { EmptyState } from '@/components/common/EmptyState';
import { PageContainer } from '@/components/common/PageContainer';
import { SkeletonList } from '@/components/common/SkeletonList';
import { PopularAreaCard } from '@/components/room/PopularAreaCard';
import { RoomCard } from '@/components/room/RoomCard';
import { roomService } from '@/services/room.service';
import { useRoomFilterStore } from '@/store/useRoomFilterStore';
import { formatVNDShort } from '@/utils/formatters';

const POPULAR_AREAS = [
  {
    id: 'binh-thanh',
    name: 'Bình Thạnh',
    keyword: 'Bình Thạnh',
    defaultCount: 128,
    defaultMinPrice: '2,5tr',
    imageUrl: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=600',
  },
  {
    id: 'quan-10',
    name: 'Quận 10',
    keyword: 'Quận 10',
    defaultCount: 94,
    defaultMinPrice: '3,0tr',
    imageUrl: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=600',
  },
  {
    id: 'thu-duc',
    name: 'TP. Thủ Đức',
    keyword: 'Thủ Đức',
    defaultCount: 156,
    defaultMinPrice: '2,2tr',
    imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600',
  },
  {
    id: 'go-vap',
    name: 'Gò Vấp',
    keyword: 'Gò Vấp',
    defaultCount: 112,
    defaultMinPrice: '2,3tr',
    imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600',
  },
  {
    id: 'quan-5',
    name: 'Quận 5',
    keyword: 'Quận 5',
    defaultCount: 68,
    defaultMinPrice: '3,2tr',
    imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600',
  },
  {
    id: 'quan-1',
    name: 'Quận 1',
    keyword: 'Quận 1',
    defaultCount: 54,
    defaultMinPrice: '4,5tr',
    imageUrl: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600',
  },
];

const QUICK_TAGS = [
  'Bình Thạnh',
  'Quận 3',
  'TP. Thủ Đức',
  'Gần ĐH Bách Khoa',
  'Gần tuyến Metro',
];

const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Tìm phòng minh bạch',
    description:
      'Lọc phòng theo giá, diện tích, tiện ích và đối chiếu vị trí thực tế trực tiếp trên bản đồ.',
    icon: Search,
  },
  {
    step: '02',
    title: 'Đặt lịch & Cọc giữ chân',
    description:
      'Chọn khung giờ xem phòng và đặt cọc giữ chân trên sàn để đảm bảo lịch hẹn không bị hủy ngang.',
    icon: CalendarCheck,
  },
  {
    step: '03',
    title: 'Xem phòng & Nhận lại cọc',
    description:
      'Gặp chủ trọ xem phòng thực tế và nhận lại 100% tiền cọc ngay tại buổi gặp trước khi quyết định thuê.',
    icon: Eye,
  },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { setKeyword, resetFilter } = useRoomFilterStore();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: roomsPage,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['rooms', 'home-recent'],
    queryFn: () => roomService.searchRooms({ page: 0, size: 8 }),
  });

  const recentRooms = roomsPage?.content || [];

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    resetFilter();
    setKeyword(trimmed);
    navigate(trimmed ? `/search?keyword=${encodeURIComponent(trimmed)}` : '/search');
  };

  const handleQuickTagClick = (tag: string) => {
    resetFilter();
    setKeyword(tag);
    navigate(`/search?keyword=${encodeURIComponent(tag)}`);
  };

  return (
    <div className="flex-1 bg-slate-50 flex flex-col">
      {/* HERO GỌN, Ô TÌM KIẾM DUY NHẤT Ở TRUNG TÂM */}
      <section className="bg-white border-b border-slate-200">
        <PageContainer width="wide" className="py-10 sm:py-12">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>100% phòng trọ đã qua kiểm duyệt thực tế</span>
            </div>

            <h1 className="text-[28px] sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Tìm phòng trọ phù hợp, đặt lịch xem an toàn
            </h1>

            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
              Xem giá thuê, ảnh thật và vị trí trên bản đồ. Đặt lịch hẹn minh bạch với cơ chế hoàn cọc giữ chân 100%.
            </p>

            {/* 1 ô tìm kiếm duy nhất */}
            <form
              onSubmit={handleHeroSearch}
              className="bg-white rounded-2xl p-2 border border-slate-300 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-2xl mx-auto focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-500/20"
            >
              <div className="flex-1 flex items-center gap-3 px-3">
                <Search className="w-5 h-5 text-teal-600 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nhập quận, tên đường, trường học hoặc mô tả phòng..."
                  className="w-full h-10 text-sm font-medium text-slate-900 bg-transparent outline-none placeholder:text-slate-500"
                />
              </div>
              <AppButton type="submit" variant="primary" size="lg">
                Tìm phòng ngay
              </AppButton>
            </form>

            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">Gợi ý:</span>
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleQuickTagClick(tag)}
                  className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-800 font-medium transition-colors cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </PageContainer>
      </section>

      {/* KHU VỰC PHỔ BIẾN */}
      <PageContainer width="wide" className="py-10 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Khu vực phổ biến
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Chọn nhanh khu vực tập trung nhiều phòng trống và tiện đi lại
            </p>
          </div>
          <Link
            to="/search"
            className="text-sm font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 shrink-0"
          >
            <span>Xem bản đồ</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {POPULAR_AREAS.map((area) => {
            const matched = recentRooms.filter((r) =>
              r.diaChi?.toLowerCase().includes(area.keyword.toLowerCase()),
            );
            const minPrice = matched.reduce(
              (min, r) => (r.giaThue > 0 && r.giaThue < min ? r.giaThue : min),
              Infinity,
            );
            const roomCountText =
              matched.length > 0 && minPrice < Infinity
                ? `${matched.length} phòng · từ ${formatVNDShort(minPrice)}`
                : `${area.defaultCount} phòng · từ ${area.defaultMinPrice}`;

            return (
              <PopularAreaCard
                key={area.id}
                id={area.id}
                name={area.name}
                roomCountText={roomCountText}
                keyword={area.keyword}
                imageUrl={area.imageUrl}
              />
            );
          })}
        </div>
      </PageContainer>

      {/* PHÒNG MỚI ĐĂNG */}
      <PageContainer width="wide" className="pb-10 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Phòng mới đăng
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Các tin phòng vừa được Quản trị viên kiểm duyệt thông tin và hình ảnh
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
        ) : recentRooms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentRooms.map((room) => (
              <RoomCard key={room.maPhongTro} room={room} layout="vertical" />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Chưa có phòng mới nào"
            description="Hãy chuyển sang trang Tìm phòng để xem toàn bộ phòng trên bản đồ."
            icon={<HomeIcon className="w-6 h-6" />}
            action={
              <AppButton variant="primary" size="md" onClick={() => navigate('/search')}>
                Tìm phòng trên bản đồ
              </AppButton>
            }
          />
        )}
      </PageContainer>

      {/* CÁCH HOẠT ĐỘNG (3 BƯỚC) & CAM KẾT HOÀN CỌC */}
      <section className="bg-white border-t border-slate-200 py-10">
        <PageContainer width="wide" className="space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Cách hoạt động trên InnFinder
            </h2>
            <p className="text-sm text-slate-600">
              Quy trình đặt lịch xem phòng rõ ràng chỉ với 3 bước
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS_STEPS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-mono font-bold text-teal-700">{item.step}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>

          {/* Cam kết hoàn cọc */}
          <div className="bg-teal-50 rounded-2xl border border-teal-200 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4 max-w-2xl">
              <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Cam kết hoàn trả 100% cọc giữ chân xem phòng
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Tiền cọc giữ chân chỉ nhằm xác nhận thiện chí lịch hẹn. Chủ trọ hoàn lại đủ 100% tiền cọc trực tiếp cho bạn tại buổi xem phòng; nếu không thuê, bạn không mất bất kỳ khoản phí sàn nào.
                </p>
              </div>
            </div>

            <AppButton
              variant="primary"
              size="lg"
              onClick={() => navigate('/search')}
              className="shrink-0"
            >
              Bắt đầu tìm phòng
            </AppButton>
          </div>
        </PageContainer>
      </section>
    </div>
  );
};
