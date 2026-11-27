import React, { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/common/PageContainer';
import { RoomCard } from '@/components/room/RoomCard';
import { recommendationService } from '@/services/room.service';
import { useAuthStore } from '@/store/useAuthStore';

import { getRecentRoomIds, recordViewedRoom } from '@/services/recommendationHistory';

const VIEW_DWELL_MS = 5_000;

interface RecommendedRoomsSectionProps {
  /** Nếu truyền roomId -> hiển thị "Phòng tương tự phù hợp với bạn". Nếu không -> hiển thị "Gợi ý dành riêng cho bạn". */
  roomId?: string;
  limit?: number;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export const RecommendedRoomsSection: React.FC<RecommendedRoomsSectionProps> = ({
  roomId,
  limit,
  title,
  subtitle,
  compact = false,
}) => {
  const userId = useAuthStore((s) => s.user?.maNguoiDung ?? 'guest');
  const container = useRef<HTMLDivElement>(null);
  const impression = useRef<Record<string, Promise<string>>>({});
  const effectiveLimit = limit ?? (roomId ? 6 : 8);
  const recentIds = useMemo(() => (roomId ? [] : getRecentRoomIds(userId)), [roomId, userId]);

  useEffect(() => {
    if (!roomId) return;
    const timer = window.setTimeout(() => {
      recordViewedRoom(roomId);
    }, VIEW_DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [roomId, userId]);

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: roomId
      ? ['rooms', 'recommendations', 'similar', roomId, effectiveLimit]
      : ['rooms', 'recommendations', 'personalized', userId, recentIds.join(','), effectiveLimit],
    queryFn: () =>
      roomId
        ? recommendationService.getSimilar(roomId, effectiveLimit)
        : recommendationService.getPersonalized(recentIds, effectiveLimit),
    staleTime: 60_000,
  });

  const roomKeys = rooms.map((room) => room.maPhongTro).join(',');
  useEffect(() => {
    impression.current = {};
    if (!roomKeys || !container.current) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      const ids = entries.filter((entry) => entry.isIntersecting)
        .map((entry) => (entry.target as HTMLElement).dataset.roomId)
        .filter((id): id is string => Boolean(id && !impression.current[id]));
      if (!ids.length) return;
      const request = recommendationService.trackImpression(ids, roomId ? 'detail_similar' : 'home_personalized');
      ids.forEach((id) => { impression.current[id] = request; });
      void request.catch(() => undefined);
      entries.filter((entry) => entry.isIntersecting).forEach((entry) => observer.unobserve(entry.target));
    }, { threshold: 0.1 });
    container.current.querySelectorAll('[data-room-id]').forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [roomKeys, roomId, userId]);

  if (!isLoading && rooms.length === 0) {
    return null;
  }

  const heading =
    title ?? (roomId ? 'Phòng tương tự phù hợp với bạn' : 'Gợi ý dành riêng cho bạn');
  const desc =
    subtitle ??
    (roomId
      ? 'Được đề xuất dựa trên mức giá, vị trí và đặc điểm tương đồng với phòng bạn đang xem'
      : 'Cá nhân hóa từ các phòng bạn yêu thích, lịch xem gần đây và điểm uy tín chủ trọ');

  const content = (
    <div ref={container} className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gợi ý thông minh</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            {heading}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">{desc}</p>
        </div>

        <Link
          to="/search"
          className="text-xs sm:text-sm font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 shrink-0"
        >
          <span>Khám phá thêm</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: Math.min(4, effectiveLimit) }, (_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-slate-200/70 animate-pulse" />
          ))}
        </div>
      ) : (
        <div
          className={
            compact
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
              : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5'
          }
        >
          {rooms.map((room) => (
            <div
              key={room.maPhongTro}
              data-room-id={room.maPhongTro}
              onClick={() =>
                void impression.current[room.maPhongTro]?.then((token) => recommendationService.trackClick(room.maPhongTro, token)).catch(() => undefined)
              }
            >
              <RoomCard room={room} />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (compact) {
    return <section className="pt-8 border-t border-slate-200/80">{content}</section>;
  }

  return (
    <PageContainer width="wide" className="py-10">
      {content}
    </PageContainer>
  );
};
