// web/src/pages/RoomDetailPage.tsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Heart,
  MapPin,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Images,
  X,
} from "lucide-react";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { roomService } from "../services/room.service";
import type { RoomDetailResponse, ReviewResponseDTO } from "../types/room.types";
import { useFavoriteStore } from "../store/useFavoriteStore";

export const RoomDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [room, setRoom] = useState<RoomDetailResponse | null>(null);
  const [reviews, setReviews] = useState<ReviewResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  // Booking schedule modal state
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("09:00");
  const [bookingNote, setBookingNote] = useState("");
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);

  const { isFavorite, toggleFavorite } = useFavoriteStore();
  const favorited = room ? isFavorite(room.maPhongTro) : false;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    roomService
      .getRoomDetail(id)
      .then((data) => {
        setRoom(data);
      })
      .catch((err) => {
        console.error("Lỗi khi tải chi tiết phòng:", err);
      })
      .finally(() => {
        setLoading(false);
      });

    // Tải đánh giá
    roomService
      .getRoomReviews(id)
      .then((data) => {
        setReviews(data || []);
      })
      .catch(() => {});
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
          <div className="h-6 bg-slate-200 rounded w-1/4 mb-6 animate-pulse" />
          <div className="aspect-16/7 bg-slate-200 rounded-3xl mb-8 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-8 bg-slate-200 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse" />
              <div className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
            </div>
            <div className="h-64 bg-slate-200 rounded-3xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-lg mx-auto flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Không tìm thấy phòng trọ
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Phòng này có thể đã bị xóa hoặc tạm ẩn khỏi hệ thống.
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

  const formatPrice = (price: number) => {
    if (!price || price <= 0) return "Thỏa thuận";
    if (price >= 1_000_000) {
      const millions = price / 1_000_000;
      return `${millions % 1 === 0 ? millions : millions.toFixed(1)} triệu/tháng`;
    }
    return `${price.toLocaleString("vi-VN")} đ/tháng`;
  };

  const images: string[] =
    room.dsHinhAnh && room.dsHinhAnh.length > 0
      ? room.dsHinhAnh.map((img) => img.url)
      : room.hinhAnh && room.hinhAnh.length > 0
      ? room.hinhAnh.map((img) => img.duongDan)
      : [
          "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200",
          "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
          "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800",
        ];

  const amenitiesList: string[] =
    room.dsTienIch && room.dsTienIch.length > 0
      ? room.dsTienIch.map((a) => (typeof a === "string" ? a : a.tenTienIch))
      : [
          "Máy lạnh",
          "Ban công riêng",
          "Giữ xe",
          "Wi-Fi",
          "Máy giặt chung",
          "Giờ tự do",
          "Bếp riêng",
          "Camera an ninh",
        ];

  const roomTitle =
    room.tieuDe ||
    `${room.loaiPhong?.tenLoaiPhongTro || room.loaiPhong?.tenLoaiPhong || "Studio"} - ${room.diaChi.split(",")[0] || ""}`;

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDate) {
      alert("Vui lòng chọn ngày xem phòng.");
      return;
    }
    setIsBookingSubmitting(true);
    setTimeout(() => {
      setIsBookingSubmitting(false);
      setBookingModalOpen(false);
      alert(
        `Đặt lịch xem phòng thành công!\nChủ trọ sẽ nhận được thông báo hẹn vào ngày ${bookingDate} lúc ${bookingTime}.`
      );
    }, 800);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* 1. Breadcrumbs Navigation (Khớp ảnh 3) */}
        <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-5">
          <Link to="/" className="hover:text-teal-700 transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <Link to="/search" className="hover:text-teal-700 transition-colors">
            TP.HCM
          </Link>
          <span>/</span>
          <Link to="/search" className="hover:text-teal-700 transition-colors">
            Quận 3
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-semibold truncate max-w-xs sm:max-w-md">
            {roomTitle}
          </span>
        </nav>

        {/* 2. Photo Gallery Layout kiểu Airbnb (Khớp ảnh 3) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-8 h-[380px] sm:h-[460px] rounded-3xl overflow-hidden relative">
          {/* Ảnh lớn bên trái (chiếm 8/12 cột) */}
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

          {/* 2 ảnh nhỏ xếp chồng bên phải (chiếm 4/12 cột) */}
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
                alt="Ban công / góc nhìn"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />

              {/* Nút Xem tất cả ảnh nằm ở góc ảnh dưới cùng bên phải */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxOpen(true);
                }}
                className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-xs text-slate-900 px-3.5 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 hover:bg-white transition-all hover:scale-105 active:scale-95"
              >
                <Images className="w-4 h-4 text-teal-600" />
                <span>Xem tất cả {images.length} ảnh</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Chi tiết phòng (Cột trái 65% & Sticky Booking Card 35%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* CỘT TRÁI (8/12) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Header thông tin phòng */}
            <div>
              {/* Badges */}
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Đã xác thực
                </span>
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                  Mới đăng
                </span>
              </div>

              {/* Tiêu đề phòng */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {roomTitle}
              </h1>

              {/* Địa chỉ */}
              <div className="mt-2.5 flex items-center gap-1.5 text-sm text-slate-500">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{room.diaChi}</span>
              </div>
            </div>

            {/* 5 Spec Boxes (Khớp chính xác với ảnh 3) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
              <div className="text-center p-2">
                <div className="text-base font-extrabold text-teal-700">
                  {room.giaThue ? `${room.giaThue / 1e6} triệu` : "Thỏa thuận"}
                </div>
                <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                  / tháng
                </div>
              </div>

              <div className="text-center p-2 border-l border-slate-200">
                <div className="text-base font-extrabold text-slate-800">
                  {room.dienTich} m²
                </div>
                <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                  diện tích
                </div>
              </div>

              <div className="text-center p-2 border-l border-slate-200">
                <div className="text-base font-extrabold text-slate-800">
                  {room.loaiPhong?.tenLoaiPhongTro || room.loaiPhong?.tenLoaiPhong || "Studio"}
                </div>
                <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                  loại phòng
                </div>
              </div>

              <div className="text-center p-2 border-l border-slate-200">
                <div className="text-base font-extrabold text-slate-800">
                  {room.soNguoi || 2} người
                </div>
                <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                  tối đa
                </div>
              </div>

              <div className="text-center p-2 border-l border-slate-200">
                <div className="text-base font-extrabold text-emerald-600">
                  Còn trống
                </div>
                <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                  ở ngay
                </div>
              </div>
            </div>

            {/* Tiện ích (Danh sách tiện ích với icon tick xanh teal theo ảnh 3) */}
            <div className="pt-4 border-t border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Tiện ích</h2>
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

            {/* Mô tả phòng */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h2 className="text-lg font-bold text-slate-900">Mô tả phòng</h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {room.moTa ||
                  "Phòng mới hoàn thiện, đón nắng tự nhiên, nội thất gồm giường, tủ áo, bàn làm việc và bếp. Hẻm rộng, khu dân cư yên tĩnh; cách các trường đại học trung tâm 5–10 phút di chuyển."}
              </p>
            </div>

            {/* Đánh giá từ khách đã xem phòng */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">
                Đánh giá từ khách ({reviews.length})
              </h2>
              {reviews.length > 0 ? (
                <div className="space-y-3">
                  {reviews.map((rev) => (
                    <div
                      key={rev.maDanhGia}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-100"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-slate-800">
                          {rev.tenNguoiDung || rev.tenDangNhap || "Khách thuê"}
                        </span>
                        <div className="text-amber-500 font-bold text-xs">
                          {"★".repeat(rev.diem)}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600">{rev.noiDung}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Chưa có đánh giá nào cho phòng này. Hãy là người đầu tiên đặt lịch xem phòng!
                </p>
              )}
            </div>
          </div>

          {/* CỘT PHẢI (4/12): Sticky Booking Card (Khớp chính xác ảnh 3) */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-900/5 p-6 space-y-5">
              {/* Giá và ghi chú cọc */}
              <div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {formatPrice(room.giaThue)}
                </div>
                <div className="text-xs text-slate-400 mt-1 font-medium">
                  Cọc giữ chân linh hoạt · Không phí môi giới
                </div>
              </div>

              {/* Nút Đặt lịch xem phòng màu xanh dương nổi bật */}
              <button
                type="button"
                onClick={() => setBookingModalOpen(true)}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.01] active:scale-98 flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                <span>Đặt lịch xem phòng</span>
              </button>

              {/* Nút Thêm vào yêu thích */}
              <button
                type="button"
                onClick={() => toggleFavorite(room.maPhongTro)}
                className={`w-full py-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  favorited
                    ? "bg-rose-50 border-rose-200 text-rose-600 shadow-xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${
                    favorited ? "fill-rose-500 text-rose-500" : ""
                  }`}
                />
                <span>{favorited ? "Đã lưu vào yêu thích" : "Thêm vào yêu thích"}</span>
              </button>

              {/* Thông tin chủ trọ */}
              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-teal-100 border border-teal-200 text-teal-800 font-bold text-sm flex items-center justify-center shrink-0">
                  {room.chuTro?.hoVaTen || room.chuTro?.hoTen
                    ? (room.chuTro.hoVaTen || room.chuTro.hoTen || "").substring(0, 2).toUpperCase()
                    : "CT"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-900 truncate">
                    {room.chuTro?.hoVaTen || room.chuTro?.hoTen || "Chủ trọ InnFinder"}
                  </div>
                  <div className="text-xs text-teal-700 font-medium">
                    Chủ trọ xác thực · phản hồi 98%
                  </div>
                </div>
              </div>

              {/* Hộp cảnh báo an toàn màu vàng/amber theo ảnh 3 */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Không chuyển cọc hợp đồng trước khi xem phòng và xác minh thông tin
                  trực tiếp với chủ trọ.
                </span>
              </div>

              {/* Trạng thái lịch xem */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-xs font-semibold text-slate-600">
                  Lịch xem phòng linh hoạt: 08:00 – 20:00 hàng ngày
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal xem toàn bộ ảnh Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col p-4 sm:p-8 animate-in fade-in duration-200">
          <div className="flex justify-between items-center text-white mb-4">
            <span className="text-sm font-bold">Tất cả hình ảnh ({images.length})</span>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((img, i) => (
              <div key={i} className="aspect-4/3 rounded-2xl overflow-hidden bg-slate-800">
                <img
                  src={img}
                  alt={`Ảnh ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Đặt lịch xem phòng */}
      {bookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Đặt lịch hẹn xem phòng
              </h3>
              <button
                type="button"
                onClick={() => setBookingModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ngày xem phòng
                </label>
                <input
                  type="date"
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Khung giờ dự kiến
                </label>
                <select
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-teal-600"
                >
                  <option value="09:00">09:00 Sáng</option>
                  <option value="11:00">11:00 Trưa</option>
                  <option value="14:30">14:30 Chiều</option>
                  <option value="17:30">17:30 Chiều</option>
                  <option value="19:00">19:00 Tối</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú cho chủ phòng
                </label>
                <textarea
                  rows={3}
                  value={bookingNote}
                  onChange={(e) => setBookingNote(e.target.value)}
                  placeholder="Ví dụ: Tôi đi cùng bạn xem phòng lúc 18h..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-teal-600"
                />
              </div>

              <div className="p-3 rounded-xl bg-teal-50 border border-teal-100 text-xs text-teal-800">
                Lịch hẹn tuân thủ cơ chế bảo vệ khách thuê của sàn InnFinder. Chủ trọ sẽ
                nhận thông báo và xác nhận lịch hẹn với bạn.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBookingModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isBookingSubmitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
                >
                  {isBookingSubmitting ? "Đang gửi..." : "Gửi yêu cầu hẹn"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
