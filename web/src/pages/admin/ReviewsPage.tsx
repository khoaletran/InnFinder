import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Chip, Spinner } from '@heroui/react';
import { Star, Trash2, EyeOff, Eye, RefreshCw, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/admin.service';
import { Modal } from '@/components/common/Modal';
import { EmptyState } from '@/components/common/EmptyState';
import { formatDateTime } from '@/utils/formatters';
import type { AdminReviewItem } from '@/types/admin.types';

export const ReviewsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [ratingFilter, setRatingFilter] = useState<number | 'ALL'>('ALL');
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [deletingReview, setDeletingReview] = useState<AdminReviewItem | null>(null);

  const {
    data: reviews = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'reviews'],
    queryFn: () => adminService.getAllRoomReviews(),
  });

  const deleteReviewMutation = useMutation({
    mutationFn: (reviewId: string) => adminService.deleteReview(reviewId),
    onSuccess: () => {
      toast.success('Đã xóa đánh giá vi phạm tiêu chuẩn cộng đồng');
      setDeletingReview(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi xóa đánh giá');
    },
  });

  const handleToggleHide = (id: string) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.success('Đã hiển thị lại đánh giá');
      } else {
        next.add(id);
        toast.success('Đã tạm ẩn đánh giá trên giao diện kiểm duyệt');
      }
      return next;
    });
  };

  const filteredReviews = reviews.filter((r) =>
    ratingFilter === 'ALL' ? true : r.diem === ratingFilter,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Kiểm duyệt Đánh giá & Nhận xét
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý phản hồi thực tế (`DanhGia` từ 1 đến 5 sao) của khách thuê sau khi xem phòng, ngăn chặn spam hoặc bôi nhọ
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isFetching ? 'animate-spin' : ''}`} />
          Làm mới đánh giá
        </button>
      </div>

      {/* Star Rating Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRatingFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            ratingFilter === 'ALL'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Tất cả ({reviews.length})
        </button>
        {[5, 4, 3, 2, 1].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRatingFilter(star)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              ratingFilter === star
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{star} sao</span>
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          </button>
        ))}
      </div>

      {/* Main Content */}
      {isLoading ? (
        <Card className="p-12 bg-white rounded-2xl border border-slate-200 text-center">
          <Card.Content className="p-0 flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <span className="text-xs text-slate-500">
              Đang tổng hợp danh sách đánh giá từ các phòng trọ trên sàn...
            </span>
          </Card.Content>
        </Card>
      ) : filteredReviews.length > 0 ? (
        <Card className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-0">
          <Card.Header className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <Card.Title className="text-xs font-bold text-slate-800">
              Danh sách đánh giá ({filteredReviews.length})
            </Card.Title>
          </Card.Header>

          <Card.Content className="p-0 divide-y divide-slate-100">
            {filteredReviews.map((rev) => {
              const isHidden = rev.trangThai === 'AN' || hiddenIds.has(rev.maDanhGia);
              return (
                <div key={rev.maDanhGia} className="p-5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <span className="font-bold text-slate-900 text-xs">{rev.nguoiDanhGia}</span>
                      <span className="text-slate-400 text-xs mx-2">•</span>
                      <span className="text-slate-600 text-xs font-semibold">
                        {rev.tenPhongTro}
                      </span>
                      <code className="ml-2 text-[10px] font-mono text-blue-600">
                        #{rev.phongTroId}
                      </code>
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
                      <Chip
                        size="sm"
                        variant="soft"
                        color={isHidden ? 'default' : 'success'}
                        className="font-bold"
                      >
                        {isHidden ? 'Tạm ẩn' : 'Hiển thị'}
                      </Chip>
                    </div>
                  </div>

                  <p
                    className={`text-xs leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 mb-3 ${
                      isHidden ? 'text-slate-400 italic' : 'text-slate-700'
                    }`}
                  >
                    "{rev.noiDung || 'Khách thuê đánh giá sao không kèm nhận xét'}"
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Thời gian gửi: {formatDateTime(rev.thoiGian)}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleHide(rev.maDanhGia)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {isHidden ? (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            Hiện lại
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            Tạm ẩn
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingReview(rev)}
                        className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Xóa vĩnh viễn
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </Card.Content>
        </Card>
      ) : (
        <EmptyState
          title="Chưa có đánh giá nào"
          description="Hiện tại chưa có nhận xét hoặc đánh giá phòng trọ nào khớp với tiêu chí lọc."
          icon={<MessageSquare className="w-7 h-7" />}
        />
      )}

      {/* MODAL XÁC NHẬN XÓA ĐÁNH GIÁ (Thay thế window.confirm) */}
      <Modal
        isOpen={!!deletingReview}
        onClose={() => setDeletingReview(null)}
        title="Xác nhận xóa đánh giá vi phạm"
        subtitle={
          deletingReview
            ? `Mã đánh giá #${deletingReview.maDanhGia} • ${deletingReview.tenPhongTro}`
            : undefined
        }
        maxWidth="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeletingReview(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={deleteReviewMutation.isPending}
              onClick={() => deletingReview && deleteReviewMutation.mutate(deletingReview.maDanhGia)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {deleteReviewMutation.isPending && <Spinner size="sm" color="current" />}
              Xóa vĩnh viễn
            </button>
          </>
        }
      >
        {deletingReview && (
          <div className="space-y-2 text-xs text-slate-600">
            <p>
              Bạn có chắc chắn muốn xóa đánh giá của{' '}
              <strong className="text-slate-900">{deletingReview.nguoiDanhGia}</strong> khỏi hệ thống không? Thao tác này không thể hoàn tác.
            </p>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 italic">
              "{deletingReview.noiDung}"
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
