import React from 'react';
import { Card } from '@heroui/react';
import {
  ArrowRight,
  Calendar,
  Camera,
  CheckCircle2,
  Heart,
  MapPin,
  Maximize2,
  ShieldCheck,
  Star,
  UserCheck,
  Users,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import type { RoomDetailResponse, RoomSummaryResponse } from '@/types/room.types';
import {
  formatElectricityPrice,
  formatRelativeTime,
  formatVND,
  formatVNDShort,
  formatWaterPrice,
} from '@/utils/formatters';

interface MapRoomDetailCardProps {
  room: RoomSummaryResponse;
  detail?: RoomDetailResponse;
  isDetailLoading?: boolean;
  distanceInKm?: number | null;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onSelect?: (room: RoomSummaryResponse) => void;
  onHoverChange?: (roomId: string | null) => void;
}

export const MapRoomDetailCard: React.FC<MapRoomDetailCardProps> = ({
  room,
  detail,
  isDetailLoading = false,
  distanceInKm,
  isSelected = false,
  isHighlighted = false,
  onSelect,
  onHoverChange,
}) => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { isFavorite, toggleFavorite } = useFavoriteStore();
  const favorited = isFavorite(room.maPhongTro);

  const primaryImage =
    detail?.dsHinhAnh?.[0]?.url ||
    room.anhDaiDien ||
    (room.hinhAnh && room.hinhAnh.length > 0 ? room.hinhAnh[0].duongDan : null) ||
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800';

  const photoCount = detail?.dsHinhAnh?.length ?? room.hinhAnh?.length ?? 0;
  const roomType = detail?.loaiPhong?.tenLoaiPhongTro || room.tenLoaiPhong || 'Phòng trọ';
  const roomTitle = detail?.tieuDe || room.tieuDe || `${roomType} - ${room.diaChi.split(',')[0] || ''}`;
  const priceText =
    room.giaThue && room.giaThue > 0 ? formatVNDShort(room.giaThue, '/tháng') : 'Thỏa thuận';

  const viewingDeposit = detail?.loaiPhong?.soTienCoc ?? 200_000;
  const contractDeposit = detail?.cocPhong ?? detail?.coc ?? room.giaThue;
  const landlordName = detail?.chuTro?.hoTen || detail?.chuTro?.hoVaTen || 'Chủ trọ đã xác thực';
  const reputationScore = detail?.chuTro?.diemUyTin ?? room.diemUyTinChuTro;
  const ratingCount = detail?.tongSoDanhGia ?? 0;
  const ratingAvg = detail?.diemDanhGiaTrungBinh ?? 0;
  const postTime = detail?.thoiGianDang || room.thoiGianDang;

  const activeRingClass =
    isHighlighted || isSelected
      ? 'border-teal-600 ring-2 ring-teal-500/30 bg-teal-50/15'
      : 'border-slate-200 hover:border-slate-300';

  const detailUrl = `/room/${room.maPhongTro}`;
  const bookingPath = `/appointments/schedule/${room.maPhongTro}`;
  const bookingUrl = isAuthenticated
    ? bookingPath
    : `/login?returnUrl=${encodeURIComponent(bookingPath)}`;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void toggleFavorite(room, isAuthenticated).then((added) => {
      toast.success(
        added
          ? 'Đã lưu vào danh sách phòng yêu thích'
          : 'Đã bỏ lưu phòng khỏi danh sách yêu thích',
      );
    });
  };

  const handleOpenDetail = () => {
    onSelect?.(room);
    navigate(detailUrl);
  };

  return (
    <Card
      onClick={handleOpenDetail}
      onMouseEnter={() => onHoverChange?.(room.maPhongTro)}
      onMouseLeave={() => onHoverChange?.(null)}
      className={`group bg-white rounded-2xl border shadow-xs overflow-hidden transition-all duration-200 flex flex-col p-0 cursor-pointer ${activeRingClass}`}
    >
      {/* Ảnh đại diện + khoảng cách + số ảnh + nút yêu thích */}
      <div className="relative aspect-[16/10] w-full bg-slate-100 overflow-hidden">
        <img
          src={primaryImage}
          alt={roomTitle}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {distanceInKm !== undefined && distanceInKm !== null && (
            <span className="px-2.5 py-1 rounded-full bg-teal-600/95 text-white text-xs font-bold shadow-xs">
              Cách{' '}
              {distanceInKm < 1
                ? `${Math.round(distanceInKm * 1000)} m`
                : `${distanceInKm.toFixed(1)} km`}
            </span>
          )}
          {photoCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900/75 text-white text-[11px] font-semibold">
              <Camera className="w-3 h-3" />
              <span>{photoCount} ảnh</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleFavoriteClick}
          className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-white/95 flex items-center justify-center shadow-xs hover:scale-105 transition-transform cursor-pointer"
          title={favorited ? 'Bỏ yêu thích' : 'Yêu thích'}
          aria-label={favorited ? 'Bỏ yêu thích' : 'Yêu thích'}
        >
          <Heart
            className={`w-4 h-4 ${favorited ? 'fill-red-500 text-red-500' : 'text-slate-700'}`}
          />
        </button>
      </div>

      {/* Nội dung chi tiết đầy đủ */}
      <Card.Content className="p-4 space-y-3">
        <div className="space-y-1">
          {(ratingCount > 0 || postTime) && (
            <div className="flex items-center justify-end gap-2 text-[11px] text-slate-500">
              {ratingCount > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-600 font-bold">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {ratingAvg.toFixed(1)} ({ratingCount})
                </span>
              )}
              {postTime && <span>{formatRelativeTime(postTime)}</span>}
            </div>
          )}

          <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-teal-700 transition-colors">
            {roomTitle}
          </h3>
        </div>

        {/* Giá thuê & Cọc minh bạch */}
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5 space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-lg font-extrabold text-teal-700 tracking-tight">{priceText}</span>
            <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Đã kiểm duyệt
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-200/70 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Cọc xem phòng</span>
              <strong className="text-teal-700 font-bold">{formatVND(viewingDeposit)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Cọc hợp đồng</span>
              <strong className="text-slate-800 font-bold">
                {contractDeposit > 0 ? formatVND(contractDeposit) : 'Thỏa thuận'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Giá điện</span>
              <strong className="text-slate-800 font-bold">
                {formatElectricityPrice(detail?.giaDien ?? room.giaDien)}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Giá nước</span>
              <strong className="text-slate-800 font-bold">
                {formatWaterPrice(detail?.giaNuoc ?? room.giaNuoc)}
              </strong>
            </div>
          </div>
        </div>

        {/* Địa chỉ đầy đủ */}
        <div className="flex items-start gap-1.5 text-xs text-slate-700 leading-relaxed">
          <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <span>{detail?.diaChi || room.diaChi}</span>
        </div>

        {/* Thông số phòng */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 font-semibold">
            <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
            {room.dienTich} m²
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 font-semibold">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            Tối đa {room.soNguoi} người
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 font-semibold">
            {roomType}
          </span>
        </div>

        {/* Danh sách tiện ích đầy đủ */}
        {isDetailLoading && !detail ? (
          <div className="flex gap-1.5">
            <span className="h-5 w-16 rounded-md bg-slate-100 animate-pulse" />
            <span className="h-5 w-20 rounded-md bg-slate-100 animate-pulse" />
            <span className="h-5 w-14 rounded-md bg-slate-100 animate-pulse" />
          </div>
        ) : detail?.dsTienIch && detail.dsTienIch.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {detail.dsTienIch.map((am) => (
              <span
                key={am.maTienIch}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50/70 border border-emerald-100 text-[11px] font-medium text-slate-700"
              >
                <CheckCircle2 className="w-3 h-3 text-teal-600 shrink-0" />
                {am.tenTienIch}
              </span>
            ))}
          </div>
        ) : null}

        {/* Mô tả chi tiết & Nội quy */}
        {detail?.moTa && (
          <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 bg-slate-50/70 rounded-xl px-3 py-2 border border-slate-100">
            {detail.moTa}
          </p>
        )}

        {/* Chủ trọ & Điểm uy tín */}
        <div className="flex items-center justify-between gap-2 text-xs text-slate-600 pt-1">
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 truncate">
            <UserCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span className="truncate">{landlordName}</span>
          </span>
          {typeof reputationScore === 'number' && (
            <span className="shrink-0 font-semibold text-teal-700">
              Uy tín {reputationScore}/100
            </span>
          )}
        </div>
      </Card.Content>

      {/* Nút hành động */}
      <Card.Footer className="px-4 pb-4 pt-3 border-t border-slate-100 flex items-center gap-2">
        <Link
          to={bookingUrl}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(room);
          }}
          className="flex-1 h-9 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Đặt lịch xem</span>
        </Link>
        <Link
          to={detailUrl}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(room);
          }}
          className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-teal-700 flex items-center gap-1 transition-colors"
        >
          <span>Xem chi tiết</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </Card.Footer>
    </Card>
  );
};
