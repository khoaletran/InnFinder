import React, { useEffect, useState } from 'react';
import { Card } from '@heroui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Home,
  ImagePlus,
  MapPin,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { reviewService } from '@/services/review.service';
import { roomService } from '@/services/room.service';
import { uploadService } from '@/services/upload.service';
import { useAuthStore } from '@/store/useAuthStore';
import { useBookingStore } from '@/store/useBookingStore';
import { formatDate } from '@/utils/formatters';
import { reviewSchema } from '@/utils/validators';

const RATING_MOODS: Record<
  number,
  { text: string; subtext: string; bgClass: string }
> = {
  5: {
    text: 'Tuyệt vời (5/5 sao)',
    subtext: 'Rất hài lòng với chất lượng phòng và thái độ nhiệt tình của chủ trọ',
    bgClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  4: {
    text: 'Rất tốt (4/5 sao)',
    subtext: 'Phòng ổn định, sạch sẽ và đáp ứng tốt phần lớn nhu cầu',
    bgClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  3: {
    text: 'Bình thường (3/5 sao)',
    subtext: 'Chất lượng phòng ở mức tạm được, cần cải thiện thêm một số tiện ích',
    bgClass: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  2: {
    text: 'Chưa hài lòng (2/5 sao)',
    subtext: 'Phòng thực tế có điểm khác biệt so với mô tả ban đầu',
    bgClass: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  1: {
    text: 'Không hài lòng (1/5 sao)',
    subtext: 'Trải nghiệm xem phòng không như kỳ vọng',
    bgClass: 'bg-rose-50 text-rose-800 border-rose-200',
  },
};

const QUICK_TAGS = [
  'Phòng đúng như mô tả',
  'Chủ trọ rất nhiệt tình',
  'Không gian sạch sẽ, thoáng mát',
  'An ninh khu vực tốt, yên tĩnh',
  'Hoàn cọc trực tiếp minh bạch',
];

export const ReviewPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const markRoomAsReviewed = useBookingStore((state) => state.markRoomAsReviewed);

  const [diemDraft, setDiem] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [noiDungDraft, setNoiDung] = useState<string | null>(null);
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  const { data: roomDetail } = useQuery({
    queryKey: ['rooms', 'detail', roomId],
    queryFn: () => roomService.getRoomDetail(roomId || ''),
    enabled: !!roomId,
  });

  const { data: roomReviews = [], isLoading: isLoadingReviews } = useQuery({
    queryKey: ['rooms', 'reviews', roomId],
    queryFn: () => reviewService.getRoomReviews(roomId || ''),
    enabled: !!roomId,
  });

  const existingReview = roomReviews.find(
    (r) =>
      (user?.maNguoiDung && r.maNguoiDung === user.maNguoiDung) ||
      (user?.tenDangNhap && r.tenDangNhap === user.tenDangNhap),
  );

  const diem = diemDraft ?? existingReview?.diem ?? 5;
  const noiDung = noiDungDraft ?? existingReview?.noiDung ?? '';

  useEffect(() => {
    if (existingReview && roomId) {
      markRoomAsReviewed(roomId);
    }
  }, [existingReview, roomId, markRoomAsReviewed]);

  const submitMutation = useMutation({
    mutationFn: (payload: { diem: number; noiDung: string; hinhAnhUrls?: string[] }) =>
      reviewService.createReview(roomId || '', payload),
    onSuccess: () => {
      if (roomId) {
        markRoomAsReviewed(roomId);
        queryClient.invalidateQueries({ queryKey: ['rooms', 'reviews', roomId] });
      }
      setShowSuccessModal(true);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : 'Không thể gửi đánh giá. Chỉ khách đã hoàn tất xem phòng mới được đánh giá.';
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  const roomTitle =
    searchParams.get('roomTitle') ||
    roomDetail?.tieuDe ||
    roomDetail?.tenPhong ||
    `Phòng trọ #${roomId}`;
  const roomAddress =
    searchParams.get('roomAddress') || roomDetail?.diaChi || 'Đang tải địa chỉ...';
  const roomImage =
    searchParams.get('roomImage') || roomDetail?.dsHinhAnh?.[0]?.url || '';

  const handleAddQuickTag = (tag: string) => {
    if (!noiDung.trim()) {
      setNoiDung(tag);
    } else if (!noiDung.includes(tag)) {
      setNoiDung(`${noiDung.trim()}. ${tag}`);
    }
  };

  // Đính kèm ảnh thực tế tối đa 10MB/ảnh theo UC 2.5 Bước 4
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const oversized = files.find((f) => f.size > 10 * 1024 * 1024);
    if (oversized) {
      toast.error(`Ảnh "${oversized.name}" vượt quá giới hạn tối đa 10MB/ảnh!`);
      return;
    }

    try {
      setIsUploadingImg(true);
      const uploaded = await uploadService.uploadMultipleImages(files, 'reviews');
      setReviewImages((prev) => [...prev, ...uploaded]);
      toast.success('Đã tải ảnh thực tế đính kèm đánh giá');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Tải ảnh thất bại');
    } finally {
      setIsUploadingImg(false);
    }
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!noiDung.trim()) {
      const emptyMsg = 'Vui lòng nhập nội dung đánh giá chi tiết trải nghiệm thực tế!';
      setErrorMessage(emptyMsg);
      toast.error(emptyMsg);
      return;
    }

    const parsed = reviewSchema.safeParse({ diem, noiDung: noiDung.trim() });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Dữ liệu đánh giá chưa hợp lệ';
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    submitMutation.mutate({
      diem: parsed.data.diem,
      noiDung: parsed.data.noiDung,
      hinhAnhUrls: reviewImages,
    });
  };

  const activeMood = RATING_MOODS[hoverRating || diem];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
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
            Chia sẻ trải nghiệm thực tế sau buổi xem phòng giúp cộng đồng thuê trọ minh bạch hơn
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Đánh giá xác thực từ lịch xem</span>
        </span>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-medium">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
              {roomImage ? (
                <img src={roomImage} alt={roomTitle} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <Home className="w-8 h-8" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Phòng trọ đánh giá
              </span>
              <h3 className="text-base font-bold text-slate-900 truncate mt-0.5">{roomTitle}</h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 truncate">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{roomAddress}</span>
              </p>
            </div>
          </Card>

          <form
            onSubmit={handleSubmitReview}
            className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-6"
          >
            {existingReview && (
              <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-center gap-2 text-xs text-blue-800">
                <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Bạn đã gửi đánh giá ngày <strong>{formatDate(existingReview.ngayDanhGia)}</strong>.
                </span>
              </div>
            )}

            <div className="space-y-3 pb-6 border-b border-slate-100">
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Chọn mức điểm đánh giá (`diem` từ 1 đến 5 sao) *
              </label>

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
                      className="p-1 rounded-lg transition-transform hover:scale-110 cursor-pointer"
                    >
                      <Star
                        className={`w-9 h-9 transition-colors ${
                          isFilled ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
                        }`}
                      />
                    </button>
                  );
                })}
                <span className="ml-3 text-lg font-black text-slate-900 font-mono">
                  {hoverRating || diem} / 5
                </span>
              </div>

              <div className={`p-3 rounded-xl border inline-block text-xs font-medium ${activeMood.bgClass}`}>
                <span className="font-bold">{activeMood.text}</span>: {activeMood.subtext}
              </div>
            </div>

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
                    className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all cursor-pointer font-medium"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                  2. Nội dung nhận xét chi tiết (`noiDung`) *
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
                placeholder="Chia sẻ trải nghiệm thực tế về chất lượng phòng, tiện ích và thái độ của chủ trọ (tối thiểu 10 ký tự)..."
                className="w-full text-xs p-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/40 resize-none leading-relaxed text-slate-800"
              />
            </div>

            {/* Đính kèm ảnh thực tế (tối đa 10MB/ảnh theo UC 2.5 Bước 4) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                3. Đính kèm ảnh thực tế (Tùy chọn · tối đa 10MB/ảnh)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {reviewImages.map((url, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setReviewImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 flex flex-col items-center justify-center text-slate-400 hover:text-blue-600 cursor-pointer transition-colors">
                  <ImagePlus className="w-5 h-5" />
                  <span className="text-[10px] mt-1 font-medium">
                    {isUploadingImg ? 'Đang tải...' : 'Thêm ảnh'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={isUploadingImg}
                    onChange={handleUploadImage}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={submitMutation.isPending}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs inline-flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {submitMutation.isPending
                    ? 'Đang gửi...'
                    : existingReview
                      ? 'Cập nhật đánh giá'
                      : 'Gửi đánh giá'}
                </span>
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <Card className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span>Đánh giá trên phòng này</span>
              </h3>
              <span className="text-xs font-bold text-slate-500">({roomReviews.length})</span>
            </div>

            {isLoadingReviews ? (
              <div className="py-8 text-center text-slate-400 text-xs">Đang tải đánh giá...</div>
            ) : roomReviews.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs space-y-1">
                <Star className="w-8 h-8 text-slate-200 mx-auto" />
                <p className="font-semibold text-slate-600">Chưa có đánh giá nào</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 space-y-3">
                {roomReviews.map((rev) => (
                  <div key={rev.maDanhGia} className="pt-3 first:pt-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          {rev.tenNguoiDung || rev.tenDangNhap || 'Khách thuê'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDate(rev.ngayDanhGia)}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: rev.diem }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
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
          </Card>
        </div>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4 text-emerald-600">
              <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Gửi đánh giá thành công!</h3>
            <p className="text-sm text-slate-600 mb-6">
              Nhận xét của bạn đã được cập nhật vào điểm đánh giá trung bình của phòng trọ.
            </p>
            <button
              type="button"
              onClick={() => navigate('/appointments')}
              className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm cursor-pointer"
            >
              Về danh sách lịch hẹn
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewPage;
