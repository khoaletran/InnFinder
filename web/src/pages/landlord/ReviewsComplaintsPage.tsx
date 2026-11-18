import React, { useEffect, useState } from 'react';
import {
  Star,
  MessageSquare,
  ShieldAlert,
  Reply,
  CheckCircle2,
  Send,
} from 'lucide-react';
import { landlordService } from '../../services/landlord.service';
import type { ReviewItem, ComplaintItem } from '../../types/landlord.types';
import { toast } from 'sonner';

export const ReviewsComplaintsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reviews' | 'complaints'>('reviews');
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [replyText, setReplyText] = useState<{ [id: string]: string }>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [revData, compData] = await Promise.all([
      landlordService.getReviews(),
      landlordService.getComplaints(),
    ]);
    setReviews(revData);
    setComplaints(compData);
  };

  const handleSendReply = async (id: string) => {
    const text = replyText[id];
    if (!text || !text.trim()) return;

    await landlordService.replyReview(id, text.trim());
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, phanHoi: text.trim() } : r))
    );
    setReplyingId(null);
    setReplyText((prev) => ({ ...prev, [id]: '' }));
    toast.success('Đã gửi phản hồi đánh giá thành công!');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Tabs */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Đánh Giá & Khiếu Nại</h2>
          <p className="text-xs text-slate-500">
            Theo dõi ý kiến khách hàng và các biên bản xử lý khiếu nại minh bạch
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'reviews'
                ? 'bg-white text-cyan-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Đánh giá từ khách ({reviews.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('complaints')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'complaints'
                ? 'bg-white text-cyan-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span>Khiếu nại & Vi phạm ({complaints.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Reviews */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center text-slate-400 text-xs">
              Chưa có đánh giá nào từ khách thuê.
            </div>
          ) : (
            reviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={rev.hinhDaiDien || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={rev.khachHangTen}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-cyan-500/20"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{rev.khachHangTen}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Phòng: <strong>{rev.phongTen}</strong> • {rev.thoiGian}
                      </p>
                    </div>
                  </div>

                  {/* Star rating */}
                  <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < rev.diem
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                    <span className="text-xs font-bold text-amber-700 ml-1">{rev.diem}.0</span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                  "{rev.noiDung}"
                </p>

                {/* Landlord reply */}
                {rev.phanHoi ? (
                  <div className="bg-cyan-50/50 border border-cyan-100 rounded-xl p-3 text-xs ml-4 space-y-1">
                    <div className="flex items-center gap-1.5 text-cyan-800 font-bold text-[11px]">
                      <Reply className="w-3.5 h-3.5 rotate-180 text-cyan-600" />
                      <span>Phản hồi của chủ trọ:</span>
                    </div>
                    <p className="text-slate-600 pl-5">{rev.phanHoi}</p>
                  </div>
                ) : (
                  <div>
                    {replyingId === rev.id ? (
                      <div className="flex items-center gap-2 mt-2 ml-4">
                        <input
                          type="text"
                          value={replyText[rev.id] || ''}
                          onChange={(e) =>
                            setReplyText({ ...replyText, [rev.id]: e.target.value })
                          }
                          placeholder="Viết phản hồi cho đánh giá này..."
                          className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                        />
                        <button
                          onClick={() => handleSendReply(rev.id)}
                          className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Gửi</span>
                        </button>
                        <button
                          onClick={() => setReplyingId(null)}
                          className="px-3 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReplyingId(rev.id)}
                        className="text-xs font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 ml-4 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Trả lời đánh giá</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Complaints */}
      {activeTab === 'complaints' && (
        <div className="space-y-4">
          {complaints.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center text-slate-400 text-xs">
              Tuyệt vời! Không có khiếu nại nào liên quan đến bạn.
            </div>
          ) : (
            complaints.map((comp) => (
              <div
                key={comp.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-400 block">
                      #{comp.maKhieuNai}
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 mt-0.5">
                      Người gửi: <strong>{comp.nguoiGuiTen}</strong> ➔ Đối tượng:{' '}
                      <strong>{comp.doiTuongTen}</strong>
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        comp.mucDoViPham === 'NHE'
                          ? 'bg-amber-100 text-amber-700'
                          : comp.mucDoViPham === 'TRUNG_BINH'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      Mức độ: {comp.mucDoViPham}
                    </span>

                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="w-3 h-3" />
                      Đã xử lý
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700">
                  <span className="font-bold block mb-1">Nội dung vấn đề:</span>
                  <p>{comp.vanDe}</p>
                </div>

                {comp.ketQua && (
                  <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 text-xs text-emerald-900 space-y-1">
                    <span className="font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Kết luận & Phương án giải quyết từ Quản trị viên:
                    </span>
                    <p className="text-slate-600 pl-4">{comp.ketQua}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
