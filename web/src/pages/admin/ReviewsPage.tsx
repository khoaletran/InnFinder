import React, { useState } from 'react';
import { Star, Trash2, EyeOff } from 'lucide-react';
import type { AdminReviewItem } from '../../types/admin.types';
import { toast } from 'sonner';

const MOCK_REVIEWS: AdminReviewItem[] = [
  {
    maDanhGia: 'DG-01',
    phongTroId: 'PT260926084501',
    tenPhongTro: 'Studio có ban công, nội thất mới',
    nguoiDanhGia: 'Nguyễn Văn Minh',
    diem: 5,
    noiDung: 'Phòng sạch sẽ, chủ trọ nhiệt tình dẫn xem đúng giờ, hoàn cọc nhanh chóng.',
    thoiGian: '2026-11-16 10:15',
    trangThai: 'HIEN_THI',
  },
  {
    maDanhGia: 'DG-02',
    phongTroId: 'PT260926084502',
    tenPhongTro: 'Phòng trọ gác lửng Thủ Đức',
    nguoiDanhGia: 'Lê Hoàng Yến',
    diem: 4,
    noiDung: 'Không gian yên tĩnh, an ninh tốt, gần chợ và trường đại học.',
    thoiGian: '2026-11-15 14:20',
    trangThai: 'HIEN_THI',
  },
  {
    maDanhGia: 'DG-03',
    phongTroId: 'PT260926084503',
    tenPhongTro: 'Căn hộ mini Bình Thạnh',
    nguoiDanhGia: 'Tài khoản ẩn danh',
    diem: 1,
    noiDung: 'Spam từ ngữ xúc phạm và không đúng thực tế khi chưa từng đến xem phòng.',
    thoiGian: '2026-11-14 09:00',
    trangThai: 'AN',
  },
];

export const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<AdminReviewItem[]>(MOCK_REVIEWS);

  const handleToggleHide = (id: string) => {
    setReviews((prev) =>
      prev.map((r) =>
        r.maDanhGia === id
          ? { ...r, trangThai: r.trangThai === 'HIEN_THI' ? 'AN' : 'HIEN_THI' }
          : r
      )
    );
    toast.success('Đã cập nhật trạng thái hiển thị của đánh giá');
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa đánh giá này khỏi hệ thống?')) return;
    setReviews((prev) => prev.filter((r) => r.maDanhGia !== id));
    toast.success('Đã xóa đánh giá vi phạm tiêu chuẩn cộng đồng');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Kiểm duyệt Đánh giá & Nhận xét</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Quản lý phản hồi của khách thuê sau khi xem phòng, ngăn chặn hành vi bôi nhọ hoặc spam
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800">
            Tất cả đánh giá ({reviews.length})
          </h3>
        </div>

        <div className="divide-y divide-slate-100">
          {reviews.map((rev) => (
            <div key={rev.maDanhGia} className="p-5 hover:bg-slate-50/50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div>
                  <span className="font-bold text-slate-900 text-xs">{rev.nguoiDanhGia}</span>
                  <span className="text-slate-400 text-xs mx-2">•</span>
                  <span className="text-slate-600 text-xs font-semibold">{rev.tenPhongTro}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < rev.diem ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      rev.trangThai === 'HIEN_THI'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {rev.trangThai === 'HIEN_THI' ? 'Hiển thị' : 'Đã ẩn'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 mb-3">
                "{rev.noiDung}"
              </p>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Thời gian: {rev.thoiGian}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleHide(rev.maDanhGia)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    {rev.trangThai === 'HIEN_THI' ? 'Ẩn đánh giá' : 'Hiện lại'}
                  </button>
                  <button
                    onClick={() => handleDelete(rev.maDanhGia)}
                    className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
