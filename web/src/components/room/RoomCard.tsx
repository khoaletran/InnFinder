import React from 'react';
import { Card } from '@heroui/react';
import { ArrowRight, Calendar, Heart, MapPin, ShieldCheck, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import type { RoomSummaryResponse } from '@/types/room.types';
import { formatRelativeTime, formatVNDShort } from '@/utils/formatters';

interface RoomCardProps {
  room: RoomSummaryResponse;
  layout?: 'vertical' | 'horizontal';
  distanceInKm?: number | null;
  onSelect?: (room: RoomSummaryResponse) => void;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onHoverChange?: (roomId: string | null) => void;
  onRemoveFavorite?: (roomId: string) => void;
  showRemoveFavoriteButton?: boolean;
  homeCompact?: boolean;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  layout = 'vertical',
  distanceInKm,
  onSelect,
  isSelected = false,
  isHighlighted = false,
  onHoverChange,
  onRemoveFavorite,
  showRemoveFavoriteButton = false,
  homeCompact = false,
}) => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { isFavorite, toggleFavorite } = useFavoriteStore();
  const favorited = isFavorite(room.maPhongTro);

  const formatPrice = (price: number) => {
    if (!price || price <= 0) return 'Thỏa thuận';
    return formatVNDShort(price, '/tháng');
  };

  const primaryImage =
    room.anhDaiDien ||
    (room.hinhAnh && room.hinhAnh.length > 0 ? room.hinhAnh[0].duongDan : null) ||
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800';

  const roomTitle =
    room.tieuDe ||
    `${room.tenLoaiPhong || 'Phòng trọ tiện nghi'} - ${room.diaChi.split(',')[0] || ''}`;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (showRemoveFavoriteButton && onRemoveFavorite) {
      onRemoveFavorite(room.maPhongTro);
      toast.success('Đã bỏ lưu phòng khỏi danh sách yêu thích');
    } else {
      void toggleFavorite(room, isAuthenticated).then((added) => {
        toast.success(
          added
            ? 'Đã lưu vào danh sách phòng yêu thích'
            : 'Đã bỏ lưu phòng khỏi danh sách yêu thích',
        );
      });
    }
  };

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(room);
    }
    navigate(`/room/${room.maPhongTro}`);
  };

  const activeRingClass =
    isHighlighted || isSelected
      ? 'border-teal-600 ring-2 ring-teal-500/30 bg-teal-50/20'
      : 'border-slate-200 hover:border-slate-300';

  if (layout === 'horizontal') {
    return (
      <Card
        onClick={handleCardClick}
        onMouseEnter={() => onHoverChange?.(room.maPhongTro)}
        onMouseLeave={() => onHoverChange?.(null)}
        className={`group bg-white rounded-2xl border shadow-xs transition-all duration-200 cursor-pointer overflow-hidden flex flex-col sm:flex-row p-4 gap-4 ${activeRingClass}`}
      >
        <div className="relative w-full sm:w-52 h-44 sm:h-40 rounded-xl overflow-hidden bg-slate-100 shrink-0">
          <img
            src={primaryImage}
            alt={roomTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-teal-600 text-white text-xs font-semibold shadow-xs">
            Mới
          </span>

          <button
            type="button"
            onClick={handleFavoriteClick}
            className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-white/95 flex items-center justify-center shadow-xs hover:scale-105 transition-transform cursor-pointer"
            title={favorited ? 'Bỏ yêu thích' : 'Yêu thích'}
          >
            <Heart
              className={`w-4 h-4 ${
                favorited ? 'fill-red-500 text-red-500' : 'text-slate-700'
              }`}
            />
          </button>
        </div>

        <Card.Content className="flex-1 flex flex-col justify-between p-0 min-w-0">
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-slate-900 text-base line-clamp-1 group-hover:text-teal-700 transition-colors">
                {roomTitle}
              </h3>
              <span className="text-xs font-semibold text-slate-600 shrink-0">
                {room.dienTich} m²
              </span>
            </div>

            <div className="text-lg font-extrabold text-teal-700 tracking-tight">
              {formatPrice(room.giaThue)}
            </div>

            <div className="flex items-center justify-between gap-2 text-sm text-slate-600">
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="truncate">{room.diaChi}</span>
              </div>
              {distanceInKm !== undefined && distanceInKm !== null && (
                <span className="shrink-0 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                  {distanceInKm < 1
                    ? `${Math.round(distanceInKm * 1000)} m`
                    : `${distanceInKm.toFixed(1)} km`}
                </span>
              )}
            </div>

            {room.dsTienIch && room.dsTienIch.length > 0 && (
              <p className="text-xs text-slate-600 line-clamp-1 pt-0.5">
                {room.dsTienIch.slice(0, 3).join(' · ')}
                {room.dsTienIch.length > 3 && ` · +${room.dsTienIch.length - 3}`}
              </p>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">
              {room.tenLoaiPhong || 'Phòng trọ'}
            </span>
            <Link
              to={`/room/${room.maPhongTro}`}
              className="text-sm font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              Xem chi tiết <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Card.Content>
      </Card>
    );
  }

  if (homeCompact) {
    const details = '/room/' + room.maPhongTro;
    const booking = '/appointments/schedule/' + room.maPhongTro;
    return (
      <article className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="relative aspect-square bg-slate-100">
          <Link to={details} className="block h-full"><img src={primaryImage} alt={roomTitle} loading="lazy" className="h-full w-full object-cover" /></Link>
          <button type="button" onClick={handleFavoriteClick} aria-label={favorited ? 'Bỏ yêu thích' : 'Yêu thích'} aria-pressed={favorited} className="absolute right-2 top-2 grid size-9 place-items-center rounded-full bg-white text-slate-700">
            <Heart aria-hidden="true" className={favorited ? 'size-4 fill-red-600 text-red-600' : 'size-4'} />
          </button>
          {(room.thoiGianDang || !!room.hinhAnh?.length) && <span className="absolute bottom-2 left-2 rounded bg-slate-950/80 px-1.5 py-0.5 text-xs text-white">{[room.thoiGianDang && formatRelativeTime(room.thoiGianDang), room.hinhAnh?.length && room.hinhAnh.length + ' ảnh'].filter(Boolean).join(' · ')}</span>}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-2.5">
          <Link to={details} className="line-clamp-2 min-h-10 text-sm font-semibold text-slate-900 hover:text-teal-800">{roomTitle}</Link>
          <p className="text-sm font-bold text-orange-800">{formatPrice(room.giaThue)}</p>
          <p className="truncate text-xs text-slate-600" title={room.diaChi}>{room.dienTich} m² · {room.tenLoaiPhong || 'Phòng trọ'} · {room.diaChi}</p>
          <span className="flex items-center gap-1 text-xs font-semibold text-teal-800"><ShieldCheck aria-hidden="true" className="size-3.5" /> Đã kiểm duyệt</span>
          {typeof room.diemUyTinChuTro === 'number' && <span className="text-xs text-slate-700">Uy tín {room.diemUyTinChuTro}/100</span>}
          <Link to={isAuthenticated ? booking : '/login?returnUrl=' + encodeURIComponent(booking)} className="mt-auto flex min-h-8 items-center justify-center gap-1 rounded-lg bg-teal-50 px-1 text-center text-xs font-semibold text-teal-800 hover:bg-teal-100"><Calendar aria-hidden="true" className="size-3.5" /> Đặt lịch xem</Link>
        </div>
      </article>
    );
  }

  return (
    <Card
      onClick={handleCardClick}
      onMouseEnter={() => onHoverChange?.(room.maPhongTro)}
      onMouseLeave={() => onHoverChange?.(null)}
      className={`group bg-white rounded-2xl border shadow-xs overflow-hidden transition-all duration-200 flex flex-col justify-between p-0 cursor-pointer ${activeRingClass}`}
    >
      <div>
        <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden">
          <img
            src={primaryImage}
            alt={roomTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />

          <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-teal-600 text-white text-xs font-semibold shadow-xs">
            Mới
          </span>

          <button
            type="button"
            onClick={handleFavoriteClick}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 flex items-center justify-center shadow-xs hover:scale-105 transition-transform cursor-pointer"
            title={favorited ? 'Bỏ yêu thích' : 'Yêu thích'}
          >
            <Heart
              className={`w-4 h-4 ${
                favorited ? 'fill-red-500 text-red-500' : 'text-slate-700'
              }`}
            />
          </button>
        </div>

        <Card.Content className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Link
              to={`/room/${room.maPhongTro}`}
              onClick={(e) => e.stopPropagation()}
              className="font-bold text-slate-900 text-base line-clamp-1 group-hover:text-teal-700 transition-colors"
            >
              {roomTitle}
            </Link>
            <span className="text-xs font-semibold text-slate-600 shrink-0">
              {room.dienTich} m²
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <span className="text-lg font-extrabold text-teal-700 tracking-tight">
              {formatPrice(room.giaThue)}
            </span>
            {distanceInKm !== undefined && distanceInKm !== null ? (
              <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full">
                {distanceInKm < 1
                  ? `${Math.round(distanceInKm * 1000)} m`
                  : `${distanceInKm.toFixed(1)} km`}
              </span>
            ) : room.soNguoi ? (
              <span className="text-xs text-slate-600 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {room.soNguoi} người
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="truncate">{room.diaChi}</span>
          </div>

          {room.dsTienIch && room.dsTienIch.length > 0 && (
            <p className="text-xs text-slate-600 line-clamp-1">
              {room.dsTienIch.slice(0, 3).join(' · ')}
              {room.dsTienIch.length > 3 && ` · +${room.dsTienIch.length - 3}`}
            </p>
          )}
        </Card.Content>
      </div>

      <Card.Footer className="px-4 pb-4 pt-2.5 flex items-center justify-between border-t border-slate-100">
        {showRemoveFavoriteButton ? (
          <button
            type="button"
            onClick={handleFavoriteClick}
            className="text-xs font-semibold text-red-700 hover:text-red-800 transition-colors py-1 cursor-pointer"
          >
            Bỏ yêu thích
          </button>
        ) : (
          <span className="text-xs font-medium text-slate-600">
            {room.tenLoaiPhong || 'Phòng trọ'}
          </span>
        )}

        <Link
          to={`/room/${room.maPhongTro}`}
          onClick={(e) => e.stopPropagation()}
          className="text-sm font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 py-1"
        >
          Xem chi tiết <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </Card.Footer>
    </Card>
  );
};
