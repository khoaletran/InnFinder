import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, Home as HomeIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AppButton } from '@/components/common/AppButton';
import { EmptyState } from '@/components/common/EmptyState';
import { PageContainer } from '@/components/common/PageContainer';
import { SkeletonList } from '@/components/common/SkeletonList';
import { RoomCard } from '@/components/room/RoomCard';
import { getDistanceInKm } from '@/components/room/searchHelpers';
import { getRecentRoomIds } from '@/services/recommendationHistory';
import { recommendationService, roomService } from '@/services/room.service';
import { useAuthStore } from '@/store/useAuthStore';
import { useRoomFilterStore } from '@/store/useRoomFilterStore';
import type { RoomSummaryResponse } from '@/types/room.types';
import { getValidCoords } from '@/utils/formatters';

type FeaturedTab = 'recommended' | 'new' | 'price';

export const FeaturedRoomsSection: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<FeaturedTab>('recommended');
  const userId = useAuthStore((s) => s.user?.maNguoiDung ?? 'guest');
  const userLat = useRoomFilterStore((s) => s.userLat);
  const userLng = useRoomFilterStore((s) => s.userLng);
  const recentIds = useMemo(() => getRecentRoomIds(userId), [userId]);

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
        size: 100,
        minDiemUyTin: tab === 'recommended' ? 81 : undefined,
        sortBy: tab === 'price' ? 'giaThue' : 'thoiGianDang',
        sortDirection: tab === 'price' ? 'ASC' : 'DESC',
      }),
  });

  const { data: personalizedRooms } = useQuery({
    queryKey: ['rooms', 'recommendations', 'personalized', userId, recentIds.join(','), 24],
    queryFn: () => recommendationService.getPersonalized(recentIds, 24),
    enabled: tab === 'recommended',
    staleTime: 60_000,
  });

  const rooms = useMemo(() => {
    const rawRooms = roomsPage?.content || [];
    const baseRooms =
      tab === 'recommended'
        ? rawRooms.filter((room) => (room.diemUyTinChuTro ?? 0) > 80)
        : rawRooms;

    const recommendedRank = new Map<string, number>();
    personalizedRooms?.forEach((room, index) => {
      recommendedRank.set(room.maPhongTro, index);
    });

    const getRoomDistance = (room: RoomSummaryResponse): number => {
      if (userLat === undefined || userLng === undefined) return Number.POSITIVE_INFINITY;
      const coords = getValidCoords(room);
      if (!coords) return Number.POSITIVE_INFINITY;
      return getDistanceInKm(userLat, userLng, coords.lat, coords.lng);
    };

    const compareDistance = (a: RoomSummaryResponse, b: RoomSummaryResponse): number => {
      const distA = getRoomDistance(a);
      const distB = getRoomDistance(b);
      if (distA === distB) return 0;
      if (!Number.isFinite(distA)) return 1;
      if (!Number.isFinite(distB)) return -1;
      return distA - distB;
    };

    const getRoomTime = (room: RoomSummaryResponse): number =>
      room.thoiGianDang ? new Date(room.thoiGianDang).getTime() : 0;

    return [...baseRooms]
      .sort((a, b) => {
        if (tab === 'new') {
          const timeDiff = getRoomTime(b) - getRoomTime(a);
          if (timeDiff !== 0) return timeDiff;
          return compareDistance(a, b);
        }

        if (tab === 'price') {
          const priceDiff = (a.giaThue ?? 0) - (b.giaThue ?? 0);
          if (priceDiff !== 0) return priceDiff;
          return compareDistance(a, b);
        }

        const distA = getRoomDistance(a);
        const distB = getRoomDistance(b);
        const zoneA = Number.isFinite(distA) ? Math.floor(distA / 5) : Number.POSITIVE_INFINITY;
        const zoneB = Number.isFinite(distB) ? Math.floor(distB / 5) : Number.POSITIVE_INFINITY;
        if (zoneA !== zoneB) {
          return zoneA - zoneB;
        }

        const rankA = recommendedRank.get(a.maPhongTro) ?? Number.POSITIVE_INFINITY;
        const rankB = recommendedRank.get(b.maPhongTro) ?? Number.POSITIVE_INFINITY;
        if (rankA !== rankB) {
          return rankA - rankB;
        }

        const repDiff = (b.diemUyTinChuTro ?? 0) - (a.diemUyTinChuTro ?? 0);
        if (repDiff !== 0) return repDiff;

        const distDiff = compareDistance(a, b);
        if (distDiff !== 0) return distDiff;

        return getRoomTime(b) - getRoomTime(a);
      })
      .slice(0, 30);
  }, [roomsPage?.content, personalizedRooms, tab, userLat, userLng]);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <RoomCard key={room.maPhongTro} room={room} layout="vertical" />
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
