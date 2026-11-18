import React, { useState } from 'react';
import { Card } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  Heart,
  Images,
  MapPin,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Footer } from '@/components/common/Footer';
import { Header } from '@/components/common/Header';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { RoomMap } from '@/components/map/RoomMap';
import { roomService } from '@/services/room.service';
import { useAuthStore } from '@/store/useAuthStore';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import { formatDate, formatVND, formatVNDShort } from '@/utils/formatters';

export const RoomDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { isFavorite, toggleFavorite } = useFavoriteStore();
  const [lightboxOpen, setLightboxOpen] = useState(false);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
          <LoadingSpinner fullHeight label="Đang tải thông tin chi tiết phòng trọ..." />
        </main>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <div className="flex-1 max-w-lg mx-auto flex flex-col items-center justify-center p-6 text-center">
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
        <Footer />
      </div>
    );
  }

  const favorited = isFavorite(room.maPhongTro);

  const images: string[] =
    room.dsHinhAnh && room.dsHinhAnh.length > 0
      ? room.dsHinhAnh.map((img) => img.url)
      : room.hinhAnh && room.hinhAnh.length > 0
        ? room.hinhAnh.map((img) => img.duongDan)
        : [
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200',
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
            'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800',
          ];

  const amenitiesList: string[] =
    room.dsTienIch && room.dsTienIch.length > 0
      ? room.dsTienIch.map((a) => (typeof a === 'string' ? a : a.tenTienIch))
      : ['Máy lạnh', 'Wi-Fi tốc độ cao', 'Giữ xe an ninh', 'Camera 24/7'];

  const roomTitle =
    room.tieuDe ||
    room.tenPhong ||
    `${room.loaiPhong?.tenLoaiPhongTro || room.loaiPhong?.tenLoaiPhong || 'Phòng trọ'} - ${
      room.diaChi.split(',')[0] || ''
    }`;

  // Tách bạch rõ tiền cọc hợp đồng (cocPhong) và cọc giữ chân lịch xem (soTienCoc) theo AGENTS.md Mục 2.2 & 2.3
  const contractDeposit = room.cocPhong ?? room.coc ?? room.giaThue;
  const viewingDeposit = room.loaiPhong?.soTienCoc ?? 200_000;
  const landlordScore = room.chuTro?.diemUyTin ?? 100;

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

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-5">
          <Link to="/" className="hover:text-teal-700 transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <Link to="/search" className="hover:text-teal-700 transition-colors">
            Tìm kiếm phòng
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-semibold truncate max-w-xs sm:max-w-md">
            {roomTitle}
          </span>
        </nav>

        {/* Thư viện ảnh thực tế */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-8 h-[380px] sm:h-[440px] rounded-3xl overflow-hidden relative">
          <div
            onClick={() => setLightboxOpen(true)}
            className="md:col-span-8 h-full bg-slate-100 cursor-pointer overflow-hidden group"
          >
            <img
              src={images[0]}
              alt={roomTitle}
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
            />
          </div>

          <div className="hidden md:flex md:col-span-4 flex-col gap-3 h-full">
            <div
              onClick={() => setLightboxOpen(true)}
              className="flex-1 bg-slate-100 cursor-pointer overflow-hidden group rounded-tr-2xl"
            >
              <img
                src={images[1] || images[0]}
                alt="Không gian phòng"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div
              onClick={() => setLightboxOpen(true)}
              className="flex-1 bg-slate-100 cursor-pointer overflow-hidden group relative rounded-br-2xl"
            >
              <img
                src={images[2] || images[0]}
                alt="Chi tiết phòng"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxOpen(true);
                }}
                className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-xs text-slate-900 px-3.5 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 hover:bg-white transition-all cursor-pointer"
              >
                <Images className="w-4 h-4 text-teal-600" />
                <span>Xem tất cả {images.length} ảnh</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* CỘT TRÁI (8/12) */}
          <div className="lg:col-span-8 space-y-8">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Đã kiểm duyệt (DA_DUYET)
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                  Mã phòng: {room.maPhongTro}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {roomTitle}
              </h1>

              <div className="mt-2.5 flex items-center gap-1.5 text-sm text-slate-500">
                <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                <span>{room.diaChi}</span>
              </div>
            </div>

            {/* Thông số chính bao gồm Giá thuê & Cọc hợp đồng (cocPhong) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
              <div className="text-center p-2">
                <div className="text-base font-extrabold text-teal-700">
                  {formatVNDShort(room.giaThue, '')}
                </div>
                <div className="text-[11px] font-medium text-slate-400 mt-0.5">giá thuê / tháng</div>
              </div>

              <div className="text-center p-2 border-l border-slate-200">
                <div className="text-base font-extrabold text-slate-800">
                  {formatVNDShort(contractDeposit, '')}
                </div>
                <div className="text-[11px] font-medium text-slate-400 mt-0.5">cọc hợp đồng</div>
              </div>

              <div className="text-center p-2 border-l border-slate-200">
                <div className="text-base font-extrabold text-slate-800">{room.dienTich} m²</div>
                <div className="text-[11px] font-medium text-slate-400 mt-0.5">diện tích</div>
              </div>

              <div className="text-center p-2 border-l border-slate-200">
                <div className="text-base font-extrabold text-slate-800 truncate">
                  {room.loaiPhong?.tenLoaiPhongTro || room.loaiPhong?.tenLoaiPhong || 'Phòng trọ'}
                </div>
                <div className="text-[11px] font-medium text-slate-400 mt-0.5">loại phòng</div>
              </div>

              <div className="text-center p-2 border-l border-slate-200">
                <div className="text-base font-extrabold text-slate-800">
                  {room.soNguoi || 2} người
                </div>
                <div className="text-[11px] font-medium text-slate-400 mt-0.5">sức chứa tối đa</div>
              </div>
            </div>

            {/* Tiện ích */}
            <div className="pt-4 border-t border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Tiện ích trang bị</h2>
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
              <h2 className="text-lg font-bold text-slate-900">Vị trí trên bản đồ</h2>
              <div className="h-72 rounded-2xl overflow-hidden border border-slate-200">
                <RoomMap
                  rooms={[
                    {
                      maPhongTro: room.maPhongTro,
                      diaChi: room.diaChi,
                      giaThue: room.giaThue,
                      dienTich: room.dienTich,
                      soNguoi: room.soNguoi,
                      kinhDo: room.kinhDo,
                      viDo: room.viDo,
                      tieuDe: roomTitle,
                    },
                  ]}
                  interactivePreview={false}
                />
              </div>
            </div>

            {/* Đánh giá từ khách đã xem */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">
                Đánh giá thực tế từ khách đã xem ({reviews.length})
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
                  Cọc giữ chân xem phòng: <strong className="text-teal-700">{formatVND(viewingDeposit)}</strong> (Hoàn 100% trực tiếp khi gặp xem phòng)
                </Card.Description>
              </Card.Header>

              <Card.Content className="p-0 space-y-3">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Tiền cọc hợp đồng (ngoài sàn):</span>
                    <strong className="text-slate-900">{formatVND(contractDeposit)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Phí khách thuê trên sàn:</span>
                    <strong className="text-emerald-600">0 ₫ (Miễn phí 100%)</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleBookViewing}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
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
                      Điểm uy tín: {landlordScore} điểm
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Sàn InnFinder chỉ bảo chứng khoản cọc giữ chân lịch xem ({formatVND(viewingDeposit)}). Tuyệt đối không chuyển khoản tiền thuê hay cọc hợp đồng trước khi xem phòng thực tế.
                  </span>
                </div>
              </Card.Footer>
            </Card>
          </div>
        </div>
      </main>

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

      <Footer />
    </div>
  );
};
