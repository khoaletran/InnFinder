import { LandlordQueryError } from '@/components/landlord/LandlordQueryError';
import React, { useMemo, useState } from 'react';
import { Card, Chip } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  MessageSquare,
  Search,
  SearchCode,
  ShieldAlert,
  Star,
  X,
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

const renderSeverityBadge = (severity?: MucDoViPham) => {
  if (!severity) return null;
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
  const [search, setSearch] = useState('');
  const [rating, setRating] = useState('');
  const [complaintStatus, setComplaintStatus] = useState('');
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'reviews' | 'complaints'>('reviews');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const { data: reviews = [], isLoading: reviewsLoading, error: reviewsError, refetch: refetchReviews } = useQuery({
    queryKey: ['landlord', 'reviews'],
    queryFn: landlordService.getReviews,
    refetchInterval: 30000,
  });

  const { data: myRooms = [] } = useQuery({
    queryKey: ['landlord', 'rooms'],
    queryFn: landlordService.getMyRooms,
    staleTime: 60000,
  });

  const { data: complaints = [], isLoading: complaintsLoading, error: complaintsError, refetch: refetchComplaints } = useQuery({
    queryKey: ['landlord', 'complaints'],
    queryFn: landlordService.getComplaints,
    refetchInterval: 30000,
  });

  const roomMetaById = useMemo(() => {
    const map = new Map<string, { hinhAnh?: string; diaChi?: string; tenPhong?: string }>();
    for (const r of myRooms) {
      map.set(r.maPhongTro, {
        hinhAnh: r.hinhAnhUrl || r.danhSachAnh?.[0],
        diaChi: r.diaChi,
        tenPhong: r.tenPhong,
      });
    }
    return map;
  }, [myRooms]);

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.diem, 0) / reviews.length).toFixed(1)
      : 'Chưa có đánh giá';

  const keyword = search.trim().toLowerCase();
  const filteredReviews = useMemo(
    () =>
      reviews.filter(
        (item) =>
          (!rating || item.diem === Number(rating)) &&
          [item.phongTen, item.maPhongTro, item.khachHangTen, item.noiDung]
            .join(' ')
            .toLowerCase()
            .includes(keyword),
      ),
    [reviews, rating, keyword],
  );

  // Gom đánh giá theo phòng & sắp xếp phòng theo thời gian đánh giá mới nhất
  const roomReviewGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        maPhongTro: string;
        phongTen: string;
        hinhAnh?: string;
        diaChi?: string;
        reviews: typeof filteredReviews;
        latestTime: number;
      }
    >();

    for (const rev of filteredReviews) {
      const timeMs = new Date(rev.thoiGian || 0).getTime() || 0;
      const key = rev.maPhongTro || rev.phongTen;
      const meta = roomMetaById.get(rev.maPhongTro);
      const existing = groups.get(key);
      if (existing) {
        existing.reviews.push(rev);
        if (timeMs > existing.latestTime) {
          existing.latestTime = timeMs;
        }
      } else {
        groups.set(key, {
          maPhongTro: rev.maPhongTro,
          phongTen: meta?.tenPhong || rev.phongTen,
          hinhAnh: meta?.hinhAnh,
          diaChi: meta?.diaChi,
          reviews: [rev],
          latestTime: timeMs,
        });
      }
    }

    return Array.from(groups.values())
      .map((group) => {
        const sortedReviews = [...group.reviews].sort(
          (a, b) => (new Date(b.thoiGian || 0).getTime() || 0) - (new Date(a.thoiGian || 0).getTime() || 0),
        );
        const avg =
          sortedReviews.reduce((sum, r) => sum + r.diem, 0) / sortedReviews.length;
        return {
          ...group,
          reviews: sortedReviews,
          latestReview: sortedReviews[0],
          avgRating: avg.toFixed(1),
        };
      })
      .sort((a, b) => b.latestTime - a.latestTime);
  }, [filteredReviews, roomMetaById]);

  const selectedRoomGroup = useMemo(
    () => roomReviewGroups.find((g) => (g.maPhongTro || g.phongTen) === selectedRoomId) ?? null,
    [roomReviewGroups, selectedRoomId],
  );

  const filteredComplaints = complaints.filter(
    (item) =>
      (!complaintStatus || item.trangThai === complaintStatus) &&
      [item.maKhieuNai, item.nguoiGuiTen, item.vanDe, item.ketQua]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
  );
  const count = activeTab === 'reviews' ? roomReviewGroups.length : filteredComplaints.length;
  const pageCount = Math.max(1, Math.ceil(count / 10));
  const currentPage = Math.min(page, pageCount);
  const offset = (currentPage - 1) * 10;
  const loadError = activeTab === 'reviews' ? reviewsError : complaintsError;

  return (
    <div className="space-y-5">
      {/* Khối Header + Tabs + Bộ lọc thống nhất (sticky) */}
      <Card className="bg-surface rounded-xl border border-border overflow-x-clip p-0 sticky top-16 z-30 bg-white/95 backdrop-blur-md">
        <Card.Header className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Card.Title className="text-base font-bold text-slate-900">
              Đánh Giá &amp; Khiếu Nại
            </Card.Title>
            <Card.Description className="text-xs text-slate-500 mt-0.5">
              Điểm trung bình toàn bộ phòng:{' '}
              <strong className="text-amber-600">
                {averageRating}
                {reviews.length ? ' / 5.0' : ''}
              </strong>
            </Card.Description>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => { setActiveTab('reviews'); setPage(1); }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'reviews'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Đánh giá theo phòng ({roomReviewGroups.length})</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('complaints'); setPage(1); }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'complaints'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              <span>Khiếu nại &amp; Vi phạm ({complaints.length})</span>
            </button>
          </div>
        </Card.Header>

        <div className="p-3.5 flex flex-wrap items-center gap-2.5 bg-white rounded-b-xl">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              aria-label="Tìm kiếm đánh giá, phòng hoặc khiếu nại"
              placeholder="Tìm phòng, người gửi, nội dung..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-subtle border border-border text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-accent"
            />
          </div>

          {activeTab === 'reviews' ? (
            <select
              aria-label="Lọc số sao"
              value={rating}
              onChange={(e) => { setRating(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-accent cursor-pointer"
            >
              <option value="">Tất cả số sao</option>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>{value} sao</option>
              ))}
            </select>
          ) : (
            <select
              aria-label="Lọc trạng thái khiếu nại"
              value={complaintStatus}
              onChange={(e) => { setComplaintStatus(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-accent cursor-pointer"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="CHO_DUYET">Chờ duyệt</option>
              <option value="DANG_XU_LY">Đang xử lý</option>
              <option value="DA_XU_LI">Đã xử lý</option>
            </select>
          )}

          {(search || rating || complaintStatus) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setRating('');
                setComplaintStatus('');
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg border border-border bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 cursor-pointer"
            >
              Đặt lại
            </button>
          )}
        </div>
      </Card>

      {loadError && <LandlordQueryError error={loadError} onRetry={() => { void refetchReviews(); void refetchComplaints(); }} />}

      {/* Tab 1: Danh sách Card Phòng (sort theo đánh giá mới nhất) */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {reviewsLoading ? (
            <Card className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center">
              <Card.Content className="p-0 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-teal-600 mb-2" />
                <span className="text-xs">Đang tải đánh giá từ khách thuê...</span>
              </Card.Content>
            </Card>
          ) : roomReviewGroups.length === 0 ? (
            <Card className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center">
              <Card.Content className="p-0 text-slate-400 text-xs">
                Không có phòng nào có đánh giá phù hợp.
              </Card.Content>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {roomReviewGroups.slice(offset, offset + 10).map((group) => {
                const roomKey = group.maPhongTro || group.phongTen;
                return (
                  <button
                    key={roomKey}
                    type="button"
                    onClick={() => setSelectedRoomId(roomKey)}
                    className="text-left w-full group cursor-pointer"
                  >
                    <Card className="h-full bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs group-hover:border-teal-600/50 group-hover:shadow-md transition-all space-y-3">
                      <div className="flex items-start gap-3.5">
                        <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 ring-1 ring-slate-200/70">
                          {group.hinhAnh ? (
                            <img
                              src={group.hinhAnh}
                              alt={group.phongTen}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full grid place-items-center text-teal-700 bg-teal-50">
                              <Building2 className="w-6 h-6" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors truncate">
                                {group.phongTen}
                              </h3>
                              {group.diaChi ? (
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">{group.diaChi}</p>
                              ) : group.maPhongTro ? (
                                <p className="text-[11px] text-slate-400 font-mono mt-0.5">#{group.maPhongTro}</p>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 shrink-0">
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                              <span className="text-xs font-bold text-amber-700">{group.avgRating}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-1 font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                              <MessageSquare className="w-3 h-3" />
                              {group.reviews.length} đánh giá
                            </span>
                            <span>• Mới nhất: {formatDateTime(group.latestReview.thoiGian)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50/80 rounded-xl border border-slate-100 p-3 flex items-center justify-between gap-3">
                        <p className="text-xs text-slate-600 line-clamp-1">
                          <strong className="text-slate-800">{group.latestReview.khachHangTen}:</strong>{' '}
                          &ldquo;{group.latestReview.noiDung || 'Khách hàng không để lại lời nhắn chi tiết.'}&rdquo;
                        </p>
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-teal-700 shrink-0 group-hover:translate-x-0.5 transition-transform">
                          Xem tất cả
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </Card>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal xem chi tiết các đánh giá của phòng đã chọn */}
      {selectedRoomGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          onClick={() => setSelectedRoomId(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                  {selectedRoomGroup.hinhAnh ? (
                    <img
                      src={selectedRoomGroup.hinhAnh}
                      alt={selectedRoomGroup.phongTen}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-teal-700 bg-teal-50">
                      <Building2 className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                    {selectedRoomGroup.phongTen}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      {selectedRoomGroup.avgRating} / 5.0
                    </span>
                    <span>• {selectedRoomGroup.reviews.length} đánh giá</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoomId(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer shrink-0"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 bg-slate-50/50">
              {selectedRoomGroup.reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-700 font-bold flex items-center justify-center overflow-hidden ring-1 ring-teal-200 text-xs shrink-0">
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
                        <p className="text-xs font-bold text-slate-900">{rev.khachHangTen}</p>
                        <p className="text-[11px] text-slate-400">{formatDateTime(rev.thoiGian)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 shrink-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < rev.diem ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                          }`}
                        />
                      ))}
                      <span className="text-[11px] font-bold text-amber-700 ml-1">
                        {rev.diem}.0
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                    &ldquo;{rev.noiDung || 'Khách hàng không để lại lời nhắn chi tiết.'}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>
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
          ) : filteredComplaints.length === 0 ? (
            <Card className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center">
              <Card.Content className="p-0 text-slate-400 text-xs">
                Không có khiếu nại phù hợp.
              </Card.Content>
            </Card>
          ) : (
            filteredComplaints.slice(offset, offset + 10).map((comp) => (
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
      <div className="flex items-center justify-between text-sm">
        <span>{count} kết quả · Trang {currentPage}/{pageCount}</span>
        <div className="flex gap-3"><button disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="disabled:opacity-40">Trước</button>
          <button disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)} className="disabled:opacity-40">Sau</button></div>
      </div>
    </div>
  );
};
