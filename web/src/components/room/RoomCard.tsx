import React from 'react';
import { Card, Chip } from '@heroui/react';
import { ArrowRight, Heart, MapPin, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import type { RoomSummaryResponse } from '@/types/room.types';
import { formatVNDShort } from '@/utils/formatters';

interface RoomCardProps {
  room: RoomSummaryResponse;
  layout?: 'vertical' | 'horizontal';
  distanceInKm?: number | null;
  onSelect?: (room: RoomSummaryResponse) => void;
  isSelected?: boolean;
  onRemoveFavorite?: (roomId: string) => void;
  showRemoveFavoriteButton?: boolean;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  layout = 'vertical',
  distanceInKm,
  onSelect,
  isSelected = false,
  onRemoveFavorite,
  showRemoveFavoriteButton = false,
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
    } else {
      void toggleFavorite(room, isAuthenticated);
    }
  };

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(room);
    }
    navigate(`/room/${room.maPhongTro}`);
  };

  if (layout === 'horizontal') {
    return (
      <Card
        onClick={handleCardClick}
        className={`group bg-white rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col sm:flex-row p-3 gap-4 hover:shadow-md ${
          isSelected
            ? 'border-teal-600 ring-2 ring-teal-600/20 bg-teal-50/20'
            : 'border-slate-200/90 hover:border-slate-300'
        }`}
      >
        <div className="relative w-full sm:w-48 h-36 rounded-xl overflow-hidden bg-slate-100 shrink-0">
          <img
            src={primaryImage}
            alt={roomTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute top-2 left-2 flex gap-1">
            <Chip
              size="sm"
              color="success"
              variant="primary"
              className="px-2 py-0.5 rounded-md bg-teal-600/90 backdrop-blur-xs text-white text-[11px] font-bold tracking-tight shadow-sm"
            >
              <Chip.Label>Mới</Chip.Label>
            </Chip>
          </div>

          <button
            type="button"
            onClick={handleFavoriteClick}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-all cursor-pointer"
            title={favorited ? 'Bỏ yêu thích' : 'Yêu thích'}
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                favorited ? 'fill-rose-500 text-rose-500' : 'text-slate-600'
              }`}
            />
          </button>
        </div>

        <Card.Content className="flex-1 flex flex-col justify-between py-0.5 px-0 min-w-0">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-slate-900 text-base line-clamp-1 group-hover:text-teal-700 transition-colors">
                {roomTitle}
              </h3>
              <span className="text-xs font-semibold text-slate-500 shrink-0">
                {room.dienTich} m²
              </span>
            </div>

            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-base font-extrabold text-teal-700 tracking-tight">
                {formatPrice(room.giaThue)}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1 line-clamp-1 flex-1 pr-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{room.diaChi}</span>
              </div>
              {distanceInKm !== undefined && distanceInKm !== null && (
                <span className="shrink-0 font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded">
                  {distanceInKm < 1
                    ? `${Math.round(distanceInKm * 1000)} m`
                    : `${distanceInKm.toFixed(1)} km`}
                </span>
              )}
            </div>

            {room.dsTienIch && room.dsTienIch.length > 0 && (
              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                <span>{room.dsTienIch.slice(0, 3).join(' · ')}</span>
                {room.dsTienIch.length > 3 && (
                  <span className="text-slate-400">+{room.dsTienIch.length - 3}</span>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">
              {room.tenLoaiPhong || 'Phòng trọ'}
            </span>
            <Link
              to={`/room/${room.maPhongTro}`}
              className="font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              Xem chi tiết <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card
      onClick={handleCardClick}
      className="group bg-white rounded-2xl border border-slate-200/90 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col justify-between p-0 cursor-pointer"
    >
      <div>
        <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden">
          <img
            src={primaryImage}
            alt={roomTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />

          <div className="absolute top-3 left-3 flex gap-1.5">
            <Chip
              size="sm"
              color="success"
              variant="primary"
              className="px-2.5 py-1 rounded-lg bg-teal-600/90 backdrop-blur-xs text-white text-xs font-bold tracking-tight shadow-sm"
            >
              <Chip.Label>Mới</Chip.Label>
            </Chip>
          </div>

          <button
            type="button"
            onClick={handleFavoriteClick}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer"
            title={favorited ? 'Bỏ yêu thích' : 'Yêu thích'}
          >
            <Heart
              className={`w-4.5 h-4.5 transition-colors ${
                favorited ? 'fill-rose-500 text-rose-500' : 'text-slate-600'
              }`}
            />
          </button>
        </div>

        <Card.Content className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <Link
              to={`/room/${room.maPhongTro}`}
              onClick={(e) => e.stopPropagation()}
              className="font-bold text-slate-900 text-base line-clamp-1 group-hover:text-teal-700 transition-colors"
            >
              {roomTitle}
            </Link>
            <span className="text-xs font-semibold text-slate-500 shrink-0">
              {room.dienTich} m²
            </span>
          </div>

          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-lg font-extrabold text-teal-700 tracking-tight">
              {formatPrice(room.giaThue)}
            </span>
            {room.soNguoi ? (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {room.soNguoi} người
              </span>
            ) : null}
          </div>

          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{room.diaChi}</span>
          </div>

          {room.dsTienIch && room.dsTienIch.length > 0 && (
            <div className="mt-2 text-xs text-slate-500 line-clamp-1">
              {room.dsTienIch.slice(0, 3).join(' · ')}
              {room.dsTienIch.length > 3 && ` · +${room.dsTienIch.length - 3}`}
            </div>
          )}
        </Card.Content>
      </div>

      <Card.Footer className="px-4 sm:px-5 pb-4 pt-2 flex items-center justify-between border-t border-slate-100">
        {showRemoveFavoriteButton ? (
          <button
            type="button"
            onClick={handleFavoriteClick}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors py-1 cursor-pointer"
          >
            Bỏ yêu thích
          </button>
        ) : (
          <span className="text-xs text-slate-400">
            {room.tenLoaiPhong || 'Phòng trọ'}
          </span>
        )}

        <Link
          to={`/room/${room.maPhongTro}`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 py-1"
        >
          Xem chi tiết <ArrowRight className="w-3 h-3" />
        </Link>
      </Card.Footer>
    </Card>
  );
};
