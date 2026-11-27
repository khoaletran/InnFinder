import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  ExternalLink,
  Heart,
  Images,
  MapPin,
  X,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AppBreadcrumb } from '@/components/common/AppBreadcrumb';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CommuteDistancePanel } from '@/components/room/CommuteDistancePanel';
import { Tour360ViewerModal } from '@/components/tour360/Tour360ViewerModal';
import { roomService } from '@/services/room.service';
import { tour360Service } from '@/services/tour360.service';
import { useAuthStore } from '@/store/useAuthStore';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import { useRoomFilterStore } from '@/store/useRoomFilterStore';
import type { RoomSummaryResponse } from '@/types/room.types';
import { formatDate, formatVND, formatVNDShort, getValidCoords } from '@/utils/formatters';

export const RoomDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { isFavorite, toggleFavorite } = useFavoriteStore();
  const lastSearchMode = useRoomFilterStore((s) => s.lastSearchMode);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [tourModalOpen, setTourModalOpen] = useState(false);
  const [carouselState, setCarouselState] = useState<{ roomId?: string; index: number }>({
    roomId: id,
    index: 0,
  });
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);

  const { data: room, isLoading } = useQuery({
    queryKey: ['rooms', 'detail', id],
    queryFn: () => roomService.getRoomDetail(id || ''),
    enabled: !!id,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['rooms', 'reviews', id],
    queryFn: () => roomService.getRoomReviews(id || ''),
    enabled: !!id,
  });

  const { data: roomTour } = useQuery({
    queryKey: ['rooms', 'tour-360', id],
    queryFn: () => tour360Service.getRoomTour(id || ''),
    enabled: !!id,
  });

  const images: string[] = useMemo(() => {
    if (!room) return [];
    if (room.dsHinhAnh && room.dsHinhAnh.length > 0) {
      const urls = room.dsHinhAnh.map((img) => img.url).filter(Boolean);
      if (urls.length > 0) return urls;
    }
    if (room.hinhAnh && room.hinhAnh.length > 0) {
      const urls = room.hinhAnh.map((img) => img.duongDan).filter(Boolean);
      if (urls.length > 0) return urls;
    }
    return ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200'];
  }, [room]);

  const currentIndex = carouselState.roomId === id ? carouselState.index : 0;
  const safeImageIndex = images.length > 0 ? currentIndex % images.length : 0;

  const setImageIndex = (updater: number | ((prev: number) => number)) => {
    setCarouselState((prev) => {
      const base = prev.roomId === id ? prev.index : 0;
      const next = typeof updater === 'function' ? updater(base) : updater;
      return { roomId: id, index: next };
    });
  };

  useEffect(() => {
    if (images.length <= 1 || lightboxOpen || isCarouselPaused) return;
    const timer = window.setInterval(() => {
      setCarouselState((prev) => {
        const base = prev.roomId === id ? prev.index : 0;
        return { roomId: id, index: (base + 1) % images.length };
      });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [id, images.length, lightboxOpen, isCarouselPaused]);

  if (isLoading) {
    return (
      <div className="flex-1 bg-white flex flex-col">
        <AppBreadcrumb
          items={[
            { label: 'Trang chủ', to: '/' },
            { label: 'Tìm kiếm phòng', to: '/search' },
            { label: 'Đang tải...' },
          ]}
        />
        <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
          <LoadingSpinner fullHeight label="Đang tải thông tin chi tiết phòng trọ..." />
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex-1 bg-white flex flex-col">
        <AppBreadcrumb
          items={[
            { label: 'Trang chủ', to: '/' },
            { label: 'Tìm kiếm phòng', to: '/search' },
            { label: 'Chi tiết phòng' },
          ]}
        />
        <div className="flex-1 max-w-lg mx-auto flex flex-col items-center justify-center p-6 text-center py-20">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Không tìm thấy phòng trọ</h2>
          <p className="text-sm text-slate-500 mb-6">
            Phòng này có thể đã được cho thuê hoàn tất hoặc tạm ẩn khỏi hệ thống.
          </p>
          <Link
            to="/search"
            className="px-6 py-2.5 bg-teal-600 text-white rounded-full font-semibold text-sm shadow-md"
          >
            Quay lại tìm kiếm
          </Link>
        </div>
      </div>
    );
  }

  const favorited = isFavorite(room.maPhongTro);

  const amenitiesList: string[] =
    room.dsTienIch
      ?.map((a) => (typeof a === 'string' ? a : a.tenTienIch))
      .filter(Boolean) ?? [];

  const roomTypeLabel =
    room.loaiPhong?.tenLoaiPhongTro || room.loaiPhong?.tenLoaiPhong || 'Phòng trọ';

  const roomTitle =
    room.tieuDe ||
    room.tenPhong ||
    `${roomTypeLabel} - ${room.diaChi.split(',')[0] || ''}`;

  // Tách bạch rõ tiền cọc hợp đồng (cocPhong) và cọc giữ chân lịch xem (soTienCoc) theo AGENTS.md Mục 2.2 & 2.3
  const contractDeposit = room.cocPhong ?? room.coc ?? room.giaThue;
  const viewingDeposit = room.loaiPhong?.soTienCoc ?? 200_000;
  const landlordScore = room.chuTro?.diemUyTin ?? 100;

  const roomCoords = getValidCoords(room);
  const roomMapSummary: RoomSummaryResponse = {
    maPhongTro: room.maPhongTro,
    diaChi: room.diaChi,
    giaThue: room.giaThue,
    dienTich: room.dienTich,
    soNguoi: room.soNguoi,
    kinhDo: room.kinhDo,
    viDo: room.viDo,
    tieuDe: roomTitle,
  };

  const handleBookViewing = () => {
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để đặt lịch hẹn xem phòng');
      navigate('/login', { state: { from: { pathname: `/appointments/schedule/${room.maPhongTro}` } } });
      return;
    }
    navigate(`/appointments/schedule/${room.maPhongTro}`);
  };

  const handleToggleFavorite = async () => {
    const added = await toggleFavorite(
      {
        maPhongTro: room.maPhongTro,
        diaChi: room.diaChi,
        giaThue: room.giaThue,
        dienTich: room.dienTich,
        soNguoi: room.soNguoi,
        kinhDo: room.kinhDo,
        viDo: room.viDo,
        anhDaiDien: images[0],
        tieuDe: roomTitle,
      },
      isAuthenticated,
    );
    toast.success(added ? 'Đã lưu vào danh sách phòng yêu thích' : 'Đã bỏ lưu phòng yêu thích');
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <div className="flex-1 bg-white flex flex-col">
      <AppBreadcrumb
        items={
          lastSearchMode === 'map'
            ? [
                { label: 'Trang chủ', to: '/' },
                { label: 'Tìm kiếm phòng', to: '/search' },
                { label: 'Tìm trên bản đồ', to: '/search/map' },
                { label: roomTitle },
              ]
            : [
                { label: 'Trang chủ', to: '/' },
                { label: 'Tìm kiếm phòng', to: '/search' },
                { label: roomTitle },
              ]
        }
      />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Carousel 1 ảnh lớn, tự chuyển mỗi 5s, có nút điều hướng và badge tổng số ảnh góc phải */}
        <div
          onClick={() => setLightboxOpen(true)}
          onMouseEnter={() => setIsCarouselPaused(true)}
          onMouseLeave={() => setIsCarouselPaused(false)}
          className="relative h-[360px] sm:h-[460px] rounded-3xl overflow-hidden bg-slate-100 mb-8 group cursor-pointer"
        >
          <img
            src={images[safeImageIndex]}
            alt={`${roomTitle} - ảnh ${safeImageIndex + 1}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
          />

          {images.length > 1 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />
          )}

          {/* Nút Xem Tour 360° góc trái (nếu phòng có tour) */}
          {roomTour && roomTour.nodes.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTourModalOpen(true);
              }}
              className="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-teal-700/90 hover:bg-teal-700 backdrop-blur-xs px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition-colors cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-teal-200" />
              <span>Xem Tour 360° ({roomTour.nodes.length} góc)</span>
            </button>
          )}

          {/* Badge tổng số ảnh góc phải */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(true);
            }}
            className="absolute top-4 right-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-slate-900/75 hover:bg-slate-900/90 backdrop-blur-xs px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition-colors cursor-pointer"
          >
            <Images className="w-3.5 h-3.5 text-teal-300" />
            <span>
              {images.length > 1 ? `${safeImageIndex + 1} / ${images.length} ảnh` : `${images.length} ảnh`}
            </span>
          </button>

          {/* Nút chuyển ảnh trái / phải */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Ảnh trước"
                onClick={handlePrevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-900 shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                aria-label="Ảnh tiếp theo"
                onClick={handleNextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-900 shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Chấm chỉ báo vị trí ảnh */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`Xem ảnh ${idx + 1}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageIndex(idx);
                    }}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      idx === safeImageIndex
                        ? 'w-6 bg-white shadow-sm'
                        : 'w-2 bg-white/60 hover:bg-white/90'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* CỘT TRÁI (8/12) */}
          <div className="lg:col-span-8 space-y-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {roomTitle}
              </h1>

              <div className="mt-2.5 flex items-center gap-1.5 text-sm text-slate-500">
                <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                <span>{room.diaChi}</span>
              </div>
            </div>

            {/* Thông số chính (3 cột gọn gàng, không trùng giá/cọc ở card phải) */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
              <div className="text-center p-2">
                <div className="text-base font-extrabold text-slate-800">{room.dienTich} m²</div>
                <div className="text-[11px] font-medium text-slate-500 mt-0.5">Diện tích</div>
              </div>

              <div className="text-center p-2 border-l border-slate-200">
                <div className="text-base font-extrabold text-slate-800">{roomTypeLabel}</div>
                <div className="text-[11px] font-medium text-slate-500 mt-0.5">Loại phòng</div>
              </div>

              <div className="text-center p-2 border-l border-slate-200">
                <div className="text-base font-extrabold text-slate-800">
                  {room.soNguoi || 2} người
                </div>
                <div className="text-[11px] font-medium text-slate-500 mt-0.5">Sức chứa</div>
              </div>
            </div>

            {/* Tiện ích */}
            <div className="pt-4 border-t border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Tiện ích trang bị</h2>
              {amenitiesList.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {amenitiesList.map((amenity, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-slate-700"
                    >
                      <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Chưa cập nhật tiện ích</p>
              )}
            </div>

            {/* Mô tả & Nội quy */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h2 className="text-lg font-bold text-slate-900">Mô tả chi tiết & Nội quy</h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {room.moTa ||
                  'Phòng sạch đẹp, thoáng mát, giờ giấc linh hoạt, an ninh đảm bảo 24/7. Tiền thuê phòng và tiền cọc hợp đồng thỏa thuận thanh toán trực tiếp với Chủ trọ khi ký hợp đồng.'}
              </p>
            </div>

            {/* Vị trí trên bản đồ (Theo Mục 2.2 Bước 5) */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-slate-900">Vị trí trên bản đồ</h2>
                {roomCoords && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${roomCoords.lat},${roomCoords.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
                  >
                    <span>Mở Google Maps</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {roomCoords ? (
                <CommuteDistancePanel roomCoords={roomCoords} roomMapSummary={roomMapSummary} />
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  Phòng này chưa cập nhật tọa độ bản đồ.
                </div>
              )}
            </div>

            {/* Đánh giá từ khách đã xem */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">
                Đánh giá từ khách đã xem ({reviews.length})
              </h2>
              {reviews.length > 0 ? (
                <div className="space-y-3">
                  {reviews.map((rev) => (
                    <div
                      key={rev.maDanhGia}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-100"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-bold text-xs text-slate-800">
                            {rev.tenNguoiDung || rev.tenDangNhap || 'Khách thuê'}
                          </span>
                          {rev.ngayDanhGia && (
                            <span className="ml-2 text-[11px] text-slate-400">
                              · {formatDate(rev.ngayDanhGia)}
                            </span>
                          )}
                        </div>
                        <div className="text-amber-500 font-bold text-xs">
                          {'★'.repeat(rev.diem)}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600">{rev.noiDung}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Chưa có đánh giá nào cho phòng này. Hãy đặt lịch xem phòng để trải nghiệm thực tế!
                </p>
              )}
            </div>
          </div>

          {/* CỘT PHẢI (4/12): Sticky Booking Card chuẩn HeroUI v3 */}
          <div className="lg:col-span-4">
            <Card className="sticky top-24 bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-900/5 p-6 space-y-5">
              <Card.Header className="p-0 flex flex-col items-start gap-1">
                <Card.Title className="text-2xl font-black text-slate-900 tracking-tight">
                  {formatVNDShort(room.giaThue)}
                </Card.Title>
                <Card.Description className="text-xs text-slate-500 font-medium">
                  Cọc xem phòng:{' '}
                  <strong className="text-teal-700">{formatVND(viewingDeposit)}</strong>
                </Card.Description>
              </Card.Header>

              <Card.Content className="p-0 space-y-3">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Cọc hợp đồng:</span>
                    <strong className="text-slate-900">{formatVND(contractDeposit)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Giá điện:</span>
                    <strong className="text-slate-900">
                      {room.giaDien && room.giaDien > 0
                        ? `${formatVND(room.giaDien)} / kWh`
                        : 'Thỏa thuận'}
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Giá nước:</span>
                    <strong className="text-slate-900">
                      {room.giaNuoc && room.giaNuoc.gia > 0
                        ? `${formatVND(room.giaNuoc.gia)} / ${room.giaNuoc.theoNguoi ? 'người' : 'm³'}`
                        : 'Thỏa thuận'}
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Phí dịch vụ khách thuê:</span>
                    <strong className="text-emerald-600">Miễn phí (0 ₫)</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleBookViewing}
                  className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-teal-600/25 transition-all hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Đặt lịch xem phòng</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  className={`w-full py-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    favorited
                      ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${favorited ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{favorited ? 'Đã lưu vào yêu thích' : 'Thêm vào yêu thích'}</span>
                </button>
              </Card.Content>

              <Card.Footer className="p-0 pt-4 border-t border-slate-100 flex flex-col gap-3">
                <div className="flex items-center gap-3 w-full">
                  <div className="w-11 h-11 rounded-full bg-teal-100 border border-teal-200 text-teal-800 font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden">
                    {room.chuTro?.hinhDaiDien ? (
                      <img
                        src={room.chuTro.hinhDaiDien}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (room.chuTro?.hoVaTen || room.chuTro?.hoTen || 'CT')
                        .substring(0, 2)
                        .toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-slate-900 truncate">
                      {room.chuTro?.hoVaTen || room.chuTro?.hoTen || 'Chủ trọ xác thực'}
                    </div>
                    <div className="text-xs text-teal-700 font-semibold flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" />
                      Uy tín {landlordScore} điểm
                    </div>
                  </div>
                </div>

              </Card.Footer>
            </Card>
          </div>
        </div>
      </main>

      <Tour360ViewerModal
        isOpen={tourModalOpen}
        tour={roomTour ?? null}
        title={roomTitle}
        subtitle={room.diaChi}
        onClose={() => setTourModalOpen(false)}
      />

      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col p-4 sm:p-8 animate-in fade-in duration-200">
          <div className="flex justify-between items-center text-white mb-4">
            <span className="text-sm font-bold">Tất cả hình ảnh ({images.length})</span>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((img, i) => (
              <div key={i} className="aspect-4/3 rounded-2xl overflow-hidden bg-slate-800">
                <img src={img} alt={`Ảnh ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
