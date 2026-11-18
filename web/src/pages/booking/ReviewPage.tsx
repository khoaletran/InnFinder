import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Star,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  MapPin,
  Home,
  MessageSquare,
  ShieldCheck,
  Calendar,
  Sparkles,
  Send,
} from "lucide-react";
import { bookingService } from "../../services/booking.service";
import { useBookingStore } from "../../store/useBookingStore";
import { resolveRoomInfo } from "../../utils/transactionUtils";
import type { ReviewResponseDTO } from "../../types/booking.types";

// Mô tả tâm trạng tương ứng với điểm đánh giá 1 - 5 sao
const RATING_MOODS: Record<number, { text: string; subtext: string; colorClass: string; bgClass: string }> = {
  5: {
    text: "Tuyệt vời (5/5 sao)",
    subtext: "Rất hài lòng với chất lượng phòng và thái độ nhiệt tình của chủ trọ",
    colorClass: "text-amber-500",
    bgClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  4: {
    text: "Rất tốt (4/5 sao)",
    subtext: "Phòng ổn định, sạch sẽ và đáp ứng tốt phần lớn nhu cầu",
    colorClass: "text-emerald-500",
    bgClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  3: {
    text: "Bình thường (3/5 sao)",
    subtext: "Chất lượng phòng ở mức tạm được, cần cải thiện thêm một số tiện ích",
    colorClass: "text-blue-500",
    bgClass: "bg-blue-50 text-blue-800 border-blue-200",
  },
  2: {
    text: "Chưa hài lòng (2/5 sao)",
    subtext: "Phòng thực tế có một số điểm khác biệt so với mô tả ban đầu",
    colorClass: "text-orange-500",
    bgClass: "bg-orange-50 text-orange-800 border-orange-200",
  },
  1: {
    text: "Rất tệ (1/5 sao)",
    subtext: "Trải nghiệm xem phòng không tốt, không như kỳ vọng",
    colorClass: "text-rose-500",
    bgClass: "bg-rose-50 text-rose-800 border-rose-200",
  },
};

// Các thẻ gợi ý nhanh nội dung nhận xét thực tế
const QUICK_TAGS = [
  "Phòng đúng như mô tả",
  "Chủ trọ rất nhiệt tình",
  "Không gian sạch sẽ, thoáng mát",
  "An ninh khu vực tốt, yên tĩnh",
  "Giá thuê hợp lý",
  "Vị trí thuận tiện đi lại",
];

export const ReviewPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const markRoomAsReviewed = useBookingStore(
    (state) => state.markRoomAsReviewed
  );

  // Dữ liệu từ URL Params / Helper DB
  const paramTitle = searchParams.get("roomTitle");
  const paramAddress = searchParams.get("roomAddress");
  const paramImage = searchParams.get("roomImage");

  const fallbackRoom = resolveRoomInfo(roomId);
  const roomTitle = paramTitle || fallbackRoom?.title || `Phòng trọ #${roomId}`;
  const roomAddress = paramAddress || fallbackRoom?.address || "Hà Nội";
  const roomImage =
    paramImage ||
    fallbackRoom?.imageUrl ||
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&auto=format&fit=crop&q=80";

  // Form State (Khớp 100% Entity DanhGia: diem & noiDung)
  const [diem, setDiem] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [noiDung, setNoiDung] = useState<string>("");

  // Trạng thái xử lý & Dữ liệu từ Backend
  const [isLoadingReviews, setIsLoadingReviews] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [roomReviews, setRoomReviews] = useState<ReviewResponseDTO[]>([]);
  const [existingReview, setExistingReview] = useState<ReviewResponseDTO | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal thông báo cảnh báo & thành công (Khớp 100% phong cách dialog của hệ thống)
  const [showEmptyContentModal, setShowEmptyContentModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  // 1. Tải danh sách đánh giá của phòng này từ Database
  useEffect(() => {
    if (!roomId) return;
    setIsLoadingReviews(true);

    bookingService
      .getRoomReviews(roomId)
      .then((data) => {
        setRoomReviews(data || []);

        // Kiểm tra xem người dùng hiện tại đã từng đánh giá phòng này chưa
        const myReview = (data || []).find(
          (r: ReviewResponseDTO) =>
            r.maNguoiDung === "ND202611060002" || r.tenDangNhap === "khachhang_an"
        );

        if (myReview) {
          setExistingReview(myReview);
          setDiem(myReview.diem || 5);
          setNoiDung(myReview.noiDung || "");
          markRoomAsReviewed(roomId);
        }
      })
      .catch(() => {
        // Bỏ qua lỗi kết nối
      })
      .finally(() => {
        setIsLoadingReviews(false);
      });
  }, [roomId, markRoomAsReviewed]);

  // Thêm thẻ gợi ý nhanh vào nội dung
  const handleAddQuickTag = (tag: string) => {
    if (!noiDung.trim()) {
      setNoiDung(tag);
    } else if (!noiDung.includes(tag)) {
      setNoiDung(`${noiDung.trim()}. ${tag}`);
    }
  };

  // 2. Gửi đánh giá lên Backend (Khớp POST /api/rooms/{roomId}/reviews)
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) return;

    // KIỂM TRA: Nếu chưa nhập nội dung, hiển thị hộp thoại thông báo nổi bật
    if (!noiDung.trim()) {
      setShowEmptyContentModal(true);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await bookingService.createReview(roomId, {
        diem,
        noiDung: noiDung.trim(),
      });

      setIsSubmitting(false);
      setShowSuccessModal(true);
      markRoomAsReviewed(roomId);

      // Cập nhật lại danh sách đánh giá hiển thị
      if (result) {
        setRoomReviews((prev) => {
          const filtered = prev.filter((r) => r.maDanhGia !== result.maDanhGia);
          return [result, ...filtered];
        });
        setExistingReview(result);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(
        err.response?.data?.message ||
          err.message ||
          "Không thể gửi đánh giá. Vui lòng kiểm tra lại điều kiện xem phòng."
      );
    }
  };

  const activeMood = RATING_MOODS[hoverRating || diem];

  // Format ngày đánh giá
  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "--/--/----";
    try {
      const d = new Date(isoStr);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header & Điều hướng */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại</span>
          </button>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Đánh giá chất lượng phòng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Chia sẻ trải nghiệm thực tế sau khi xem phòng để giúp cộng đồng khách thuê có góc nhìn chân thực
          </p>
        </div>

        {/* Badge tiêu chuẩn */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Đánh giá đã xem thực tế</span>
          </span>
        </div>
      </div>

      {/* Thông báo lỗi kết nối nếu có */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-medium animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span className="flex-1">{errorMessage}</span>
        </div>
      )}

      {/* 2. Grid Bố cục 2 cột */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CỘT TRÁI (2/3 chiều rộng) - FORM ĐÁNH GIÁ CHUẨN ENTITY DANHGIA */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card Tóm tắt phòng trọ đang đánh giá */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
              {roomImage ? (
                <img
                  src={roomImage}
                  alt={roomTitle}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <Home className="w-8 h-8" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Phòng trọ đang đánh giá
              </span>
              <h3 className="text-base font-bold text-slate-900 truncate mt-0.5">
                {roomTitle}
              </h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 truncate">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{roomAddress}</span>
              </p>
            </div>
          </div>

          {/* Form Đánh giá (Chỉ gồm các trường có trong Entity DanhGia) */}
          <form
            onSubmit={handleSubmitReview}
            className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6"
          >
            {/* Nếu đã từng đánh giá trước đó */}
            {existingReview && (
              <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-center justify-between text-xs text-blue-800">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>
                    Bạn đã đánh giá phòng này vào ngày{" "}
                    <strong>{formatDate(existingReview.ngayDanhGia)}</strong>. Bạn có thể cập nhật lại nội dung bên dưới.
                  </span>
                </div>
              </div>
            )}

            {/* PHẦN 1: CHỌN ĐIỂM SAO (1 - 5 sao) */}
            <div className="space-y-3 pb-6 border-b border-slate-100">
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Mức độ hài lòng chung *
              </label>

              {/* Hàng 5 ngôi sao lớn */}
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const isFilled = (hoverRating || diem) >= starValue;
                  return (
                    <button
                      key={starValue}
                      type="button"
                      onMouseEnter={() => setHoverRating(starValue)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setDiem(starValue)}
                      className="p-1 rounded-lg transition-transform hover:scale-115 cursor-pointer focus:outline-none"
                    >
                      <Star
                        className={`w-9 h-9 transition-colors ${
                          isFilled
                            ? "text-amber-400 fill-amber-400 drop-shadow-xs"
                            : "text-slate-200 hover:text-slate-300"
                        }`}
                      />
                    </button>
                  );
                })}

                <span className="ml-3 text-lg font-black text-slate-900 font-mono">
                  {hoverRating || diem} / 5
                </span>
              </div>

              {/* Mô tả tâm trạng */}
              <div
                className={`p-3 rounded-xl border inline-block text-xs font-medium transition-all ${activeMood.bgClass}`}
              >
                <span className="font-bold">{activeMood.text}</span>:{" "}
                <span>{activeMood.subtext}</span>
              </div>
            </div>

            {/* PHẦN 2: THẺ GỢI Ý NHANH (QUICK TAGS) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Gợi ý nhận xét nhanh:</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {QUICK_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddQuickTag(tag)}
                    className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:border-[#0088ff] hover:text-[#0088ff] hover:bg-blue-50/50 transition-all cursor-pointer font-medium"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* PHẦN 3: NỘI DUNG NHẬN XÉT (noiDung) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                  2. Nội dung nhận xét thực tế *
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {noiDung.length} / 500 ký tự
                </span>
              </div>
              <textarea
                rows={5}
                maxLength={500}
                value={noiDung}
                onChange={(e) => setNoiDung(e.target.value)}
                placeholder="Chia sẻ chi tiết cảm nhận của bạn về buổi xem phòng: độ thoáng đãng, cơ sở vật chất, thái độ chủ trọ, khu vực xung quanh..."
                className="w-full text-xs p-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0088ff] focus:border-transparent bg-slate-50/40 resize-none leading-relaxed text-slate-800"
              />
              <p className="text-[11px] text-slate-400">
                * Nhận xét sẽ được hiển thị công khai để giúp cộng đồng khách thuê tham khảo.
              </p>
            </div>

            {/* NÚT SUBMIT */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#0088ff] hover:bg-blue-600 text-white text-xs font-bold transition-all cursor-pointer shadow-xs inline-flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {isSubmitting
                    ? "Đang gửi..."
                    : existingReview
                    ? "Cập nhật đánh giá"
                    : "Gửi đánh giá"}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* CỘT PHẢI (1/3 chiều rộng) - DANH SÁCH ĐÁNH GIÁ THỰC TẾ CỦA PHÒNG NÀY */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-[#0088ff]" />
                <span>Đánh giá từ khách đã xem</span>
              </h3>
              <span className="text-xs font-bold text-slate-500">
                ({roomReviews.length})
              </span>
            </div>

            {isLoadingReviews ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Đang tải đánh giá từ database...
              </div>
            ) : roomReviews.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs space-y-1">
                <Star className="w-8 h-8 text-slate-200 mx-auto" />
                <p className="font-semibold text-slate-600">Chưa có đánh giá nào</p>
                <p className="text-[11px]">Hãy là người đầu tiên chia sẻ cảm nhận!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 space-y-3">
                {roomReviews.map((rev) => (
                  <div key={rev.maDanhGia} className="pt-3 first:pt-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold border border-slate-200">
                          {rev.tenDangNhap
                            ? rev.tenDangNhap.slice(0, 2).toUpperCase()
                            : "KH"}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block leading-tight">
                            {rev.tenDangNhap || "Khách thuê"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatDate(rev.ngayDanhGia)}
                          </span>
                        </div>
                      </div>

                      {/* Sao của review */}
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: rev.diem }).map((_, i) => (
                          <Star
                            key={i}
                            className="w-3.5 h-3.5 fill-amber-400"
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                      {rev.noiDung}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quy chuẩn đánh giá văn minh */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 text-xs text-slate-600 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Tiêu chuẩn đánh giá InnFinder</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500">
              <li>Chỉ tài khoản đã hoàn tất lịch xem phòng mới được gửi đánh giá.</li>
              <li>Nội dung văn minh, phản ánh đúng tình trạng thực tế của phòng.</li>
              <li>Hệ thống lưu trữ bảo mật và đối soát trực tiếp theo quy chế sàn.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* MODAL 1: CẢNH BÁO CHƯA NHẬP NỘI DUNG (Khớp 100% phong cách modal hủy phòng / cảnh báo) */}
      {showEmptyContentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
            {/* Nút đóng góc phải */}
            <button
              type="button"
              onClick={() => setShowEmptyContentModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon cảnh báo viền tròn vàng */}
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-4 text-amber-600">
              <AlertTriangle className="w-8 h-8 stroke-[2.2]" />
            </div>

            {/* Tiêu đề */}
            <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">
              Chưa nhập nội dung nhận xét?
            </h3>

            {/* Nội dung thông báo */}
            <p className="text-sm text-slate-600 leading-relaxed max-w-xs mx-auto mb-7 font-normal">
              Vui lòng viết vài dòng cảm nhận hoặc chọn gợi ý nhận xét bên dưới để giúp cộng đồng khách thuê có thêm thông tin thực tế nhé.
            </p>

            {/* Nút bấm */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowEmptyContentModal(false);
                  const textarea = document.querySelector("textarea");
                  if (textarea) textarea.focus();
                }}
                className="px-7 py-2.5 rounded-full bg-[#0088ff] hover:bg-blue-600 active:bg-blue-700 text-white font-semibold text-sm transition-all shadow-md shadow-blue-500/20 cursor-pointer"
              >
                Viết nhận xét ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: THÔNG BÁO ĐÁNH GIÁ THÀNH CÔNG (Khớp 100% phong cách modal đặt lịch thành công) */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
            {/* Nút đóng góc phải */}
            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon thành công viền tròn xanh lá */}
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4 text-emerald-600">
              <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
            </div>

            {/* Tiêu đề */}
            <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">
              {existingReview ? "Cập nhật đánh giá thành công" : "Đánh giá phòng thành công"}
            </h3>

            {/* Nội dung thông báo */}
            <p className="text-sm text-slate-600 leading-relaxed max-w-xs mx-auto mb-7 font-normal">
              Cảm ơn bạn đã chia sẻ trải nghiệm thực tế về phòng trọ! Nhận xét của bạn đã được ghi nhận vào hệ thống.
            </p>

            {/* Nút bấm */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/booking/appointments")}
                className="px-6 py-2.5 rounded-full bg-[#0088ff] hover:bg-blue-600 active:bg-blue-700 text-white font-semibold text-sm transition-all shadow-md shadow-blue-500/20 cursor-pointer"
              >
                Xem danh sách lịch hẹn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewPage;
