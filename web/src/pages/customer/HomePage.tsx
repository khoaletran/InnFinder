import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AppButton } from '@/components/common/AppButton';
import { PageContainer } from '@/components/common/PageContainer';
import { PopularAreaCard } from '@/components/room/PopularAreaCard';
import { DepositMechanismSection } from '@/components/room/landing/DepositMechanismSection';
import { FaqSection } from '@/components/room/landing/FaqSection';
import { FeaturedRoomsSection } from '@/components/room/landing/FeaturedRoomsSection';
import { HeroSection } from '@/components/room/landing/HeroSection';
import { TrustMetricsStrip } from '@/components/room/landing/TrustMetricsStrip';
import { roomService } from '@/services/room.service';
import { useAuthStore } from '@/store/useAuthStore';
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

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isChuTro } = useAuthStore();

  const { data: roomsPage } = useQuery({
    queryKey: ['rooms', 'home-area-stats'],
    queryFn: () => roomService.searchRooms({ page: 0, size: 16 }),
  });

  const allRooms = useMemo(() => roomsPage?.content || [], [roomsPage?.content]);

  const handleLandlordAction = () => {
    if (isAuthenticated && isChuTro) {
      navigate('/landlord/rooms/create');
      return;
    }
    if (isAuthenticated) {
      navigate('/profile');
      return;
    }
    navigate('/register');
  };

  return (
    <div className="flex-1 bg-slate-50 flex flex-col">
      {/* 1. Hero Section + Tìm kiếm thường / AI */}
      <HeroSection />

      {/* 2. Dải cam kết tin cậy */}
      <TrustMetricsStrip />

      {/* 3. Khu vực phổ biến */}
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
            const matched = allRooms.filter((r) =>
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

      {/* 4. Phòng mới đăng & Lọc theo Loại phòng */}
      <FeaturedRoomsSection />

      {/* 5. Quy trình đặt lịch & Bảo chứng cọc 4 bước */}
      <DepositMechanismSection />

      {/* 6. Câu hỏi thường gặp */}
      <FaqSection />

      {/* 8. Final Conversion CTA */}
      <section className="bg-slate-900 text-white py-12 border-t border-slate-800">
        <PageContainer width="wide">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Sẵn sàng tìm phòng ưng ý hoặc cho thuê phòng minh bạch?
              </h2>
              <p className="text-sm text-slate-300">
                Trải nghiệm tìm kiếm trên bản đồ, đặt lịch xem phòng an toàn và quản lý giao dịch rõ ràng ngay hôm nay.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <AppButton variant="primary" size="lg" onClick={() => navigate('/search')}>
                Tìm phòng ngay
              </AppButton>
              <AppButton variant="secondary" size="lg" onClick={handleLandlordAction}>
                Đăng tin cho thuê
              </AppButton>
            </div>
          </div>
        </PageContainer>
      </section>
    </div>
  );
};
