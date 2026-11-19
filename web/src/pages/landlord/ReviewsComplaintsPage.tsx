import React, { useState } from 'react';
import { Card, Chip } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock,
  Loader2,
  SearchCode,
  ShieldAlert,
  Star,
} from 'lucide-react';
import { landlordService } from '@/services/landlord.service';
import type { MucDoViPham, TrangThaiKhieuNai } from '@/types/auth-user.types';
import { formatDateTime } from '@/utils/formatters';

const renderComplaintStatusBadge = (status: TrangThaiKhieuNai) => {
  switch (status) {
    case 'CHO_DUYET':
      return (
        <Chip size="sm" color="warning" variant="soft">
          <Chip.Label className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Chờ duyệt
          </Chip.Label>
        </Chip>
      );
    case 'DANG_XU_LY':
      return (
        <Chip size="sm" color="accent" variant="soft">
          <Chip.Label className="inline-flex items-center gap-1">
            <SearchCode className="w-3 h-3" />
            Đang xử lý
          </Chip.Label>
        </Chip>
      );
    case 'DA_XU_LI':
    default:
      return (
        <Chip size="sm" color="success" variant="soft">
          <Chip.Label className="inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Đã xử lý
          </Chip.Label>
        </Chip>
      );
  }
};

const renderSeverityBadge = (severity: MucDoViPham) => {
  switch (severity) {
    case 'NANG':
      return (
        <Chip size="sm" color="danger" variant="soft">
          <Chip.Label>Mức độ: Nặng</Chip.Label>
        </Chip>
      );
    case 'TRUNG_BINH':
      return (
        <Chip size="sm" color="warning" variant="soft">
          <Chip.Label>Mức độ: Trung bình</Chip.Label>
        </Chip>
      );
    case 'NHE':
    default:
      return (
        <Chip size="sm" color="default" variant="soft">
          <Chip.Label>Mức độ: Nhẹ</Chip.Label>
        </Chip>
      );
  }
};

export const ReviewsComplaintsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reviews' | 'complaints'>('reviews');

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['landlord', 'reviews'],
    queryFn: landlordService.getReviews,
  });

  const { data: complaints = [], isLoading: complaintsLoading } = useQuery({
    queryKey: ['landlord', 'complaints'],
    queryFn: landlordService.getComplaints,
  });

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.diem, 0) / reviews.length).toFixed(1)
      : '5.0';

  return (
    <div className="space-y-6">
      <Card className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <Card.Header className="p-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <Card.Title className="text-lg font-bold text-slate-900">
              Đánh Giá & Khiếu Nại
            </Card.Title>
            <Card.Description className="text-xs text-slate-500">
              Điểm trung bình hiện tại: <strong className="text-amber-600">{averageRating} / 5.0</strong> • Theo dõi phản hồi khách hàng và tiến trình xử lý khiếu nại
            </Card.Description>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
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
              type="button"
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
        </Card.Header>
      </Card>

      {/* Tab 1: Reviews */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {reviewsLoading ? (
            <Card className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center">
              <Card.Content className="p-0 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-600 mb-2" />
                <span className="text-xs">Đang tải đánh giá từ khách thuê...</span>
              </Card.Content>
            </Card>
          ) : reviews.length === 0 ? (
            <Card className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center">
              <Card.Content className="p-0 text-slate-400 text-xs">
                Chưa có đánh giá nào từ khách thuê sau khi xem phòng.
              </Card.Content>
            </Card>
          ) : (
            reviews.map((rev) => (
              <Card
                key={rev.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3"
              >
                <Card.Header className="p-0 flex flex-row items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-700 font-bold flex items-center justify-center overflow-hidden ring-2 ring-cyan-500/20 text-xs shrink-0">
                      {rev.hinhDaiDien ? (
                        <img
                          src={rev.hinhDaiDien}
                          alt={rev.khachHangTen}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        rev.khachHangTen.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <Card.Title className="text-xs font-bold text-slate-900">
                        {rev.khachHangTen}
                      </Card.Title>
                      <Card.Description className="text-[11px] text-slate-400 mt-0.5">
                        Phòng: <strong className="text-slate-600">{rev.phongTen}</strong> •{' '}
                        {formatDateTime(rev.thoiGian)}
                      </Card.Description>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < rev.diem ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                        }`}
                      />
                    ))}
                    <span className="text-xs font-bold text-amber-700 ml-1">
                      {rev.diem}.0
                    </span>
                  </div>
                </Card.Header>

                <Card.Content className="p-0">
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                    &ldquo;{rev.noiDung || 'Khách hàng không để lại lời nhắn chi tiết.'}&rdquo;
                  </p>
                </Card.Content>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Complaints */}
      {activeTab === 'complaints' && (
        <div className="space-y-4">
          {complaintsLoading ? (
            <Card className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center">
              <Card.Content className="p-0 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-600 mb-2" />
                <span className="text-xs">Đang tải danh sách khiếu nại...</span>
              </Card.Content>
            </Card>
          ) : complaints.length === 0 ? (
            <Card className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center">
              <Card.Content className="p-0 text-slate-400 text-xs">
                Tuyệt vời! Hiện không có khiếu nại hay phản ánh vi phạm nào liên quan đến bạn.
              </Card.Content>
            </Card>
          ) : (
            complaints.map((comp) => (
              <Card
                key={comp.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3"
              >
                <Card.Header className="p-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-400 block">
                      #{comp.maKhieuNai} • {formatDateTime(comp.ngayGui)}
                    </span>
                    <Card.Title className="text-xs font-bold text-slate-800 mt-0.5">
                      Người gửi: <strong>{comp.nguoiGuiTen}</strong> ➔ Đối tượng:{' '}
                      <strong>{comp.doiTuongTen}</strong>
                    </Card.Title>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {renderSeverityBadge(comp.mucDoViPham)}
                    {renderComplaintStatusBadge(comp.trangThai)}
                  </div>
                </Card.Header>

                <Card.Content className="p-0 space-y-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700">
                    <span className="font-bold block mb-1">Nội dung vấn đề phản ánh:</span>
                    <p className="leading-relaxed">{comp.vanDe}</p>
                  </div>

                  {comp.hinhAnh && (
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">
                        Hình ảnh bằng chứng đính kèm:
                      </span>
                      <a
                        href={comp.hinhAnh}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block"
                      >
                        <img
                          src={comp.hinhAnh}
                          alt="Bằng chứng khiếu nại"
                          className="h-24 w-auto rounded-xl border border-slate-200 object-cover"
                        />
                      </a>
                    </div>
                  )}

                  {comp.ketQua && (
                    <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 text-xs text-emerald-900 space-y-1">
                      <span className="font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Kết luận & Phương án giải quyết từ Quản trị viên:
                      </span>
                      <p className="text-slate-700 pl-4 leading-relaxed">{comp.ketQua}</p>
                    </div>
                  )}
                </Card.Content>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};
