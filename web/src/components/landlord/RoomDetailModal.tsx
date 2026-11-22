import { LandlordQueryError } from './LandlordQueryError';
import React, { useEffect, useState } from 'react';
import { Chip } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Edit,
  ExternalLink,
  Home,
  MapPin,
  Maximize2,
  Sparkles,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { AppButton } from '@/components/common/AppButton';
import { Modal } from '@/components/common/Modal';
import { landlordService } from '@/services/landlord.service';
import type { LandlordRoomItem, TrangThaiPhongTro } from '@/types/landlord.types';
import { formatDate, formatVND } from '@/utils/formatters';

interface RoomDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: LandlordRoomItem | null;
  onEdit?: (maPhongTro: string) => void;
}

const renderStatusChip = (status: TrangThaiPhongTro) => {
  switch (status) {
    case 'DA_DUYET':
      return (
        <Chip size="sm" color="success" variant="soft">
          <Chip.Label className="inline-flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã duyệt
          </Chip.Label>
        </Chip>
      );
    case 'CHO_DUYET':
      return (
        <Chip size="sm" color="warning" variant="soft">
          <Chip.Label className="inline-flex items-center gap-1 font-semibold">
            <Clock className="w-3.5 h-3.5" />
            Chờ kiểm duyệt
          </Chip.Label>
        </Chip>
      );
    case 'HOAN_THANH':
      return (
        <Chip size="sm" color="accent" variant="soft">
          <Chip.Label className="inline-flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã cho thuê
          </Chip.Label>
        </Chip>
      );
    case 'HUY':
    default:
      return (
        <Chip size="sm" color="danger" variant="soft">
          <Chip.Label className="inline-flex items-center gap-1 font-semibold">
            <XCircle className="w-3.5 h-3.5" />
            Đã gỡ / Đã hủy
          </Chip.Label>
        </Chip>
      );
  }
};

export const RoomDetailModal: React.FC<RoomDetailModalProps> = ({
  isOpen,
  onClose,
  room,
  onEdit,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [galleryIndex, setGalleryIndex] = useState<number>(0);

  // Tải chi tiết đầy đủ của phòng trọ (lấy trọn bộ danhSachAnh và thông tin mở rộng)
  const { data: fullDetail, error: detailError, isLoading: detailLoading, refetch } = useQuery({
    queryKey: ['landlord', 'room-detail', room?.maPhongTro],
    queryFn: () => landlordService.getRoomById(room?.maPhongTro || ''),
    enabled: isOpen && !!room?.maPhongTro,
    staleTime: 1000 * 60 * 5,
  });

  const activeRoom = fullDetail || room;

  const images: string[] = React.useMemo(() => {
    if (!activeRoom) return [];
    if (activeRoom.danhSachAnh && activeRoom.danhSachAnh.length > 0) {
      return activeRoom.danhSachAnh;
    }
    if (activeRoom.hinhAnhUrl) {
      return [activeRoom.hinhAnhUrl];
    }
    return ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'];
  }, [activeRoom]);

  // Điều khiển phím bấm khi đang mở Gallery xem ảnh kiểu Agoda
  useEffect(() => {
    if (!isGalleryOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsGalleryOpen(false);
      } else if (e.key === 'ArrowLeft') {
        setGalleryIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (e.key === 'ArrowRight') {
        setGalleryIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGalleryOpen, images.length]);

  if (!activeRoom) return null;

  const currentImage = images[selectedImageIndex] || images[0];

  const handleOpenGallery = (index: number) => {
    setGalleryIndex(index);
    setIsGalleryOpen(true);
  };

  if (isOpen && (detailError || detailLoading)) return (
    <Modal isOpen onClose={onClose} title="Chi tiết phòng">
      {detailError ? <LandlordQueryError error={detailError} onRetry={() => void refetch()} /> : <p>Đang tải chi tiết phòng...</p>}
    </Modal>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={activeRoom.tenPhong}
        subtitle={`Mã phòng: #${activeRoom.maPhongTro}`}
        maxWidth="xl"
        footer={
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {activeRoom.thoiGianDang && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Đăng ngày: {formatDate(activeRoom.thoiGianDang)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <AppButton variant="secondary" size="sm" onClick={onClose}>
                Đóng
              </AppButton>

              {activeRoom.trangThai === 'DA_DUYET' && (
                <a
                  href={`/rooms/${activeRoom.maPhongTro}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Xem trên sàn</span>
                </a>
              )}

              {onEdit && (
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onEdit(activeRoom.maPhongTro);
                  }}
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Chỉnh sửa</span>
                </AppButton>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
          {/* Khung ảnh phòng có hỗ trợ bấm mở Gallery */}
          <div className="space-y-2">
            <div
              onClick={() => handleOpenGallery(selectedImageIndex)}
              className="w-full h-64 sm:h-80 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 relative shadow-2xs group cursor-pointer select-none"
              title="Bấm để xem ảnh toàn màn hình"
            >
              <img
                src={currentImage}
                alt={activeRoom.tenPhong}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
              />
              <div className="absolute top-3 right-3">{renderStatusChip(activeRoom.trangThai)}</div>

              {/* Nút bấm xem phóng to toàn màn hình */}
              <div className="absolute bottom-3 right-3 bg-black/75 hover:bg-black/90 backdrop-blur-xs text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg transition-transform group-hover:scale-105">
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Xem tất cả {images.length} ảnh</span>
              </div>
            </div>

            {/* Dải thumbnail thu nhỏ */}
            {images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {images.map((img, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                      selectedImageIndex === idx
                        ? 'border-cyan-600 ring-2 ring-cyan-500/20 shadow-xs'
                        : 'border-slate-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Hình ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Thông tin cốt lõi */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase">
                Giá thuê / tháng
              </span>
              <span className="text-base font-black text-cyan-700 block mt-0.5">
                {formatVND(activeRoom.giaThue)}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase">
                Cọc hợp đồng
              </span>
              <span className="text-base font-bold text-slate-800 block mt-0.5">
                {formatVND(activeRoom.cocPhong ?? activeRoom.giaThue)}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase">
                Diện tích
              </span>
              <span className="text-base font-bold text-slate-800 block mt-0.5">
                {activeRoom.dienTich} m²
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase">
                Số người tối đa
              </span>
              <span className="text-base font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <Users className="w-4 h-4 text-slate-500" />
                {activeRoom.soNguoi || 1} người
              </span>
            </div>
          </div>

          {/* Phân loại & địa chỉ */}
          <div className="space-y-3 p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl text-xs">
            <div className="flex items-start gap-2.5 text-slate-700">
              <Home className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900">Loại hình phòng: </span>
                <span>{activeRoom.loaiPhong || 'Phòng trọ'}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-slate-700">
              <MapPin className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900">Địa chỉ: </span>
                <span>{activeRoom.diaChi}</span>
              </div>
            </div>

            {(activeRoom.kinhDo || activeRoom.viDo) && (
              <div className="flex items-center gap-2.5 text-slate-600">
                <Compass className="w-4 h-4 text-cyan-600 shrink-0" />
                <span>
                  Tọa độ ghim bản đồ:{' '}
                  <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {activeRoom.viDo}, {activeRoom.kinhDo}
                  </code>
                </span>
              </div>
            )}
          </div>

          {/* Tiện ích phòng */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Tiện ích có sẵn
            </h4>

            {activeRoom.dsTienIch && activeRoom.dsTienIch.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {activeRoom.dsTienIch.map((ti, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-teal-50 border border-teal-200/80 text-teal-800 text-xs font-semibold rounded-lg inline-flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3 text-teal-600" />
                    {ti}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Chưa cập nhật danh sách tiện ích.</p>
            )}
          </div>

          {/* Mô tả chi tiết */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Mô tả & Nội quy phòng
            </h4>
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 whitespace-pre-line leading-relaxed">
              {activeRoom.moTa || 'Chưa có thông tin mô tả chi tiết cho phòng trọ này.'}
            </div>
          </div>
        </div>
      </Modal>

      {/* GIAO DIỆN XEM ẢNH TOÀN MÀN HÌNH CHUẨN AGODA (FULLSCREEN LIGHTBOX) */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between select-none animate-in fade-in duration-200">
          {/* Thanh Header trên cùng */}
          <div className="h-16 px-4 sm:px-8 flex items-center justify-between text-white border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3 min-w-0 max-w-2xl">
              <h3 className="font-bold text-sm sm:text-base text-white truncate">
                {activeRoom.tenPhong}
              </h3>
              <span className="text-xs text-slate-400 hidden sm:inline shrink-0">
                (Phòng #{activeRoom.maPhongTro})
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsGalleryOpen(false)}
              title="Đóng (Esc)"
              className="w-10 h-10 rounded-full bg-white hover:bg-slate-100 text-slate-900 flex items-center justify-center transition-transform hover:scale-105 shadow-xl cursor-pointer shrink-0"
            >
              <X className="w-5 h-5 text-slate-900" />
            </button>
          </div>

          {/* Khu vực ảnh chính ở giữa */}
          <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Ảnh nền làm mờ hiệu ứng sâu */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-25 blur-3xl scale-110 pointer-events-none"
              style={{ backgroundImage: `url(${images[galleryIndex]})` }}
            />

            {/* Nút sang trái < */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => setGalleryIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                title="Ảnh trước (Mũi tên trái)"
                className="absolute left-4 sm:left-10 z-10 w-11 h-11 rounded-full bg-white/90 hover:bg-white text-slate-900 flex items-center justify-center shadow-2xl transition-all hover:scale-110 cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Khung ảnh chính */}
            <div className="relative max-h-[70vh] max-w-[88vw] flex items-center justify-center">
              <img
                src={images[galleryIndex]}
                alt={`Ảnh ${galleryIndex + 1}`}
                className="max-h-[70vh] max-w-[88vw] object-contain rounded-2xl shadow-2xl transition-all duration-300"
              />

              {/* Badge số thứ tự ảnh góc dưới phải */}
              <div className="absolute bottom-4 right-4 bg-black/75 backdrop-blur-xs text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl border border-white/10">
                {galleryIndex + 1}/{images.length}
              </div>
            </div>

            {/* Nút sang phải > */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => setGalleryIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                title="Ảnh tiếp theo (Mũi tên phải)"
                className="absolute right-4 sm:right-10 z-10 w-11 h-11 rounded-full bg-white/90 hover:bg-white text-slate-900 flex items-center justify-center shadow-2xl transition-all hover:scale-110 cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Dải thumbnail cuộn ngang ở đáy */}
          <div className="py-4 px-4 sm:px-8 bg-black/70 backdrop-blur-md border-t border-white/10 shrink-0">
            <div className="flex items-center justify-center gap-2.5 overflow-x-auto no-scrollbar max-w-5xl mx-auto">
              {images.map((img, idx) => {
                const isActive = galleryIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setGalleryIndex(idx)}
                    className={`relative w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                      isActive
                        ? 'border-white ring-2 ring-cyan-500 scale-105 opacity-100 shadow-xl'
                        : 'border-transparent opacity-50 hover:opacity-85'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
